"""Free GPU servers we run ourselves (Kaggle / Colab notebooks/ltx_gpu_server.ipynb).

They expose the same API as the Hugging Face LTX Space, behind a public
https://xxxx.gradio.live link. hf_space tries them after the team's Hugging Face
keys. The link changes whenever a notebook restarts, so it can be pasted in the
admin panel; it is saved under DATA_DIR so it survives a backend restart.
Initial links can also come from GPU_SERVERS=Kaggle=https://...,Colab=https://...
"""
import json
import logging
import threading
from dataclasses import dataclass
from datetime import datetime, timezone

from .config import settings

log = logging.getLogger(__name__)

DEFAULT_NAMES = ("Kaggle", "Colab")


@dataclass
class GpuServer:
    name: str
    url: str = ""
    last_ok_at: datetime | None = None
    last_error_at: datetime | None = None
    last_error: str | None = None

    def public(self) -> dict:
        return {
            "name": self.name,
            "url": self.url,
            "last_ok_at": _iso(self.last_ok_at),
            "last_error_at": _iso(self.last_error_at),
            "last_error": self.last_error,
        }


class GpuServerList:
    def __init__(self, servers: list[GpuServer], store_path) -> None:
        self._servers = servers
        self._store_path = store_path
        self._lock = threading.Lock()

    def usable(self) -> list[GpuServer]:
        with self._lock:
            return [s for s in self._servers if s.url]

    def mark_ok(self, server: GpuServer) -> None:
        with self._lock:
            server.last_ok_at = _now()
            server.last_error = None

    def mark_failed(self, server: GpuServer, error: str) -> None:
        with self._lock:
            server.last_error_at = _now()
            server.last_error = error[:300]

    def set_url(self, name: str, url: str) -> bool:
        with self._lock:
            for server in self._servers:
                if server.name == name:
                    server.url = url.strip().rstrip("/")
                    server.last_ok_at = server.last_error_at = server.last_error = None
                    self._save()
                    return True
            return False

    def status(self) -> list[dict]:
        with self._lock:
            return [s.public() for s in self._servers]

    def _save(self) -> None:
        try:
            self._store_path.parent.mkdir(parents=True, exist_ok=True)
            self._store_path.write_text(json.dumps({s.name: s.url for s in self._servers}))
        except OSError:
            log.exception("Could not save GPU server links; they will be lost on restart")


def _load() -> GpuServerList:
    urls = {name: "" for name in DEFAULT_NAMES}
    for item in settings.gpu_servers.split(","):
        name, sep, url = item.partition("=")
        if sep and name.strip():
            urls[name.strip()] = url.strip().rstrip("/")
    store_path = settings.data_dir / "gpu_servers.json"
    try:
        urls.update(json.loads(store_path.read_text()))  # links pasted in the admin panel win
    except (OSError, ValueError):
        pass
    return GpuServerList([GpuServer(name, url) for name, url in urls.items()], store_path)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(value: datetime | None) -> str | None:
    return value.isoformat(timespec="seconds") if value else None


servers = _load()
