"""The team's Hugging Face tokens, tried in turn when one runs out of free GPU quota.

HF_TOKENS=Ngan:hf_aaa,Minh:hf_bbb,... (falls back to HF_TOKEN as a single "default" key).
State is in memory: a restart starts again from the first key, which is fine because a
spent key just gets skipped again. Tokens never leave this module except to call the Space.
"""
import threading
from dataclasses import dataclass
from datetime import datetime, timezone

from .config import settings


@dataclass
class HfKey:
    name: str
    token: str
    quota_hit_at: datetime | None = None
    last_ok_at: datetime | None = None
    last_error: str | None = None

    def public(self, active: bool) -> dict:
        return {
            "name": self.name,
            "active": active,
            "quota_hit_at": _iso(self.quota_hit_at),
            "last_ok_at": _iso(self.last_ok_at),
            "last_error": self.last_error,
        }


class HfKeyPool:
    def __init__(self, keys: list[HfKey]) -> None:
        self._keys = keys
        self._active = 0
        self._lock = threading.Lock()

    def in_order(self) -> list[HfKey]:
        """All keys, starting from the active one. Empty list = call the Space anonymously."""
        with self._lock:
            return self._keys[self._active:] + self._keys[:self._active]

    def mark_ok(self, key: HfKey) -> None:
        with self._lock:
            key.last_ok_at = _now()
            key.quota_hit_at = None
            key.last_error = None
            self._active = self._keys.index(key)

    def mark_quota_hit(self, key: HfKey, error: str) -> None:
        with self._lock:
            key.quota_hit_at = _now()
            key.last_error = error[:300]

    def set_active(self, name: str) -> bool:
        with self._lock:
            for i, key in enumerate(self._keys):
                if key.name == name:
                    self._active = i
                    return True
            return False

    def status(self) -> list[dict]:
        with self._lock:
            return [key.public(i == self._active) for i, key in enumerate(self._keys)]


def is_quota_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return "quota" in text or "rate limit" in text or "too many requests" in text


def _load_keys() -> list[HfKey]:
    keys = []
    for i, item in enumerate(settings.hf_tokens.split(",")):
        name, sep, token = item.strip().rpartition(":")
        if not sep:
            name, token = f"key {i + 1}", item.strip()
        if token:
            keys.append(HfKey(name.strip() or f"key {i + 1}", token.strip()))
    if not keys and settings.hf_token:
        keys.append(HfKey("default", settings.hf_token))
    return keys


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(value: datetime | None) -> str | None:
    return value.isoformat(timespec="seconds") if value else None


pool = HfKeyPool(_load_keys())
