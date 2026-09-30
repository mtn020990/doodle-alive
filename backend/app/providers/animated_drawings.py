"""Meta AnimatedDrawings: rigs a human-like figure and makes it dance/walk/wave.

Needs a local install (see docs/PLAN.md, T4). We call the repo's own example
script in its own Python env so its heavy dependencies stay out of ours:
    python examples/image_to_animation.py <image> <out_dir> [motion_cfg] [retarget_cfg]
which writes <out_dir>/video.gif.
"""
import subprocess
from pathlib import Path

from ..config import settings

# Motion config shipped with the repo; the team can make this selectable (T5).
DEFAULT_MOTION = "examples/config/motion/dab.yaml"
DEFAULT_RETARGET = "examples/config/retarget/fair1_ppf.yaml"


class AnimatedDrawingsAnimator:
    name = "animated_drawings"

    def animate(self, image_path: Path, prompt: str, out_dir: Path) -> Path:
        repo = Path(settings.ad_repo_dir) if settings.ad_repo_dir else None
        if repo is None or not (repo / "examples" / "image_to_animation.py").is_file():
            raise RuntimeError("AnimatedDrawings is not set up: set AD_REPO_DIR in backend/.env")

        char_dir = (out_dir / "ad").resolve()
        cmd = [
            settings.ad_python, "image_to_animation.py",
            str(image_path.resolve()), str(char_dir),
            str(repo / DEFAULT_MOTION), str(repo / DEFAULT_RETARGET),
        ]
        proc = subprocess.run(cmd, cwd=repo / "examples", capture_output=True, text=True, timeout=300)
        gif = char_dir / "video.gif"
        if proc.returncode != 0 or not gif.is_file():
            raise RuntimeError(f"AnimatedDrawings failed: {proc.stderr[-800:]}")
        return gif
