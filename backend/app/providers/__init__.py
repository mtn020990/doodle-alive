"""Animator providers. Each one turns a clean drawing image into a GIF or MP4.

To add a new model: create a module with a class that has `name` and
`animate(image_path, prompt, out_dir) -> Path`, then register it in PROVIDERS.
"""
from pathlib import Path
from typing import Protocol

from .animated_drawings import AnimatedDrawingsAnimator
from .animated_drawings_api import AnimatedDrawingsApiAnimator
from .hf_space import HfSpaceAnimator
from .mock import MockAnimator


class Animator(Protocol):
    name: str

    def animate(self, image_path: Path, prompt: str, out_dir: Path) -> Path:
        """Return the path of the produced .gif or .mp4 inside out_dir."""
        ...


PROVIDERS: dict[str, type] = {
    "mock": MockAnimator,
    "hf_space": HfSpaceAnimator,
    "animated_drawings": AnimatedDrawingsAnimator,
    "animated_drawings_api": AnimatedDrawingsApiAnimator,
}


def get_animator(name: str) -> Animator:
    try:
        return PROVIDERS[name]()
    except KeyError:
        raise ValueError(f"Unknown animator '{name}'. Options: {', '.join(PROVIDERS)}") from None
