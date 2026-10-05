"""Image-to-video through a public Hugging Face Space (Wan 2.2, LTX-Video, ...).

Every Space names its endpoint and parameters differently, so they come from
settings. Run `python scripts/inspect_space.py` to discover them.

Order: each team Hugging Face key (next key only on quota errors), then our own
free GPU servers (Kaggle / Colab, see gpu_servers.py), which take the same API.
"""
import logging
import shutil
from pathlib import Path

from ..config import settings
from ..gpu_servers import servers as gpu_servers
from ..hf_keys import is_quota_error, pool
from ..trace import note, set_model

log = logging.getLogger(__name__)


class HfSpaceAnimator:
    name = "hf_space"
    takes_duration = True

    def animate(self, image_path: Path, prompt: str, out_dir: Path, duration: float | None = None) -> Path:
        self._duration = duration
        if duration:
            note(f"Length: {duration:g} s")
        try:
            return self._animate_with_hf_keys(image_path, prompt, out_dir)
        except Exception as hf_error:
            servers = gpu_servers.usable()
            if not servers:
                raise
            note(f"Hugging Face failed ({_first_line(hf_error)}), trying our free GPU servers")
            for server in servers:
                try:
                    out = self._animate(server.url, None, image_path, prompt, out_dir)
                except Exception as exc:
                    log.warning("GPU server %s failed: %s", server.name, exc)
                    note(f"{server.name} GPU failed: {_first_line(exc)}")
                    gpu_servers.mark_failed(server, str(exc))
                    continue
                gpu_servers.mark_ok(server)
                set_model(f"{server.name} GPU (free) · LTX-Video")
                return out
            raise RuntimeError(f"Hugging Face and all {len(servers)} GPU servers failed. Hugging Face: {hf_error}")

    def _animate_with_hf_keys(self, image_path: Path, prompt: str, out_dir: Path) -> Path:
        keys = pool.in_order()
        if not keys:
            return self._animate(settings.hf_space_id, None, image_path, prompt, out_dir)
        for key in keys:
            try:
                out = self._animate(settings.hf_space_id, key.token, image_path, prompt, out_dir)
            except Exception as exc:
                if not is_quota_error(exc):
                    raise
                log.warning("HF key %s is out of quota; trying the next one", key.name)
                note(f"Key {key.name} is out of free GPU quota, trying the next key")
                pool.mark_quota_hit(key, str(exc))
                last_quota_error = exc
                continue
            pool.mark_ok(key)
            note(f"Hugging Face key: {key.name}")
            return out
        raise RuntimeError(f"All {len(keys)} Hugging Face keys are out of quota. Last: {last_quota_error}")

    def _animate(self, space: str, token: str | None, image_path: Path, prompt: str, out_dir: Path) -> Path:
        from gradio_client import Client, handle_file

        client = Client(space, token=token)
        kwargs = {
            settings.hf_image_param: handle_file(str(image_path)),
            settings.hf_prompt_param: prompt,
            **settings.hf_extra_params,
        }
        if getattr(self, "_duration", None):
            kwargs[settings.hf_duration_param] = self._duration
        result = client.predict(api_name=settings.hf_api_name, **kwargs)
        video_path = _find_file(result)
        if video_path is None:
            raise RuntimeError(f"Space returned no file: {result!r}")

        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / f"animation{Path(video_path).suffix or '.mp4'}"
        shutil.copy(video_path, out)
        return out


def _first_line(exc: Exception) -> str:
    lines = str(exc).strip().splitlines()
    return (lines[0] if lines else type(exc).__name__)[:160]


def _find_file(result: object) -> str | None:
    """Spaces return a path, a dict like {"video": path}, or a tuple of those."""
    if isinstance(result, str) and Path(result).is_file():
        return result
    if isinstance(result, dict):
        for value in result.values():
            if found := _find_file(value):
                return found
    if isinstance(result, (list, tuple)):
        for value in result:
            if found := _find_file(value):
                return found
    return None
