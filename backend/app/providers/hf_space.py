"""Image-to-video through a public Hugging Face Space (Wan 2.2, LTX-Video, ...).

Every Space names its endpoint and parameters differently, so they come from
settings. Run `python scripts/inspect_space.py` to discover them.
"""
import shutil
from pathlib import Path

from ..config import settings


class HfSpaceAnimator:
    name = "hf_space"

    def animate(self, image_path: Path, prompt: str, out_dir: Path) -> Path:
        from gradio_client import Client, handle_file

        client = Client(settings.hf_space_id, token=settings.hf_token or None)
        kwargs = {
            settings.hf_image_param: handle_file(str(image_path)),
            settings.hf_prompt_param: prompt,
            **settings.hf_extra_params,
        }
        result = client.predict(api_name=settings.hf_api_name, **kwargs)
        video_path = _find_file(result)
        if video_path is None:
            raise RuntimeError(f"Space returned no file: {result!r}")

        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / f"animation{Path(video_path).suffix or '.mp4'}"
        shutil.copy(video_path, out)
        return out


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
