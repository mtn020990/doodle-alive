"""Turn a phone photo of a drawing into a clean, model-friendly image."""
from pathlib import Path

from PIL import Image, ImageOps

MAX_SIDE = 1024


def clean_photo(src: Path, dst: Path) -> Path:
    """Fix rotation, shrink, and boost contrast so pencil lines stand out.

    Workshop task (see docs/PLAN.md, T2): detect the paper sheet with OpenCV,
    warp it flat, and whiten the background.
    """
    img = Image.open(src)
    img = ImageOps.exif_transpose(img)  # phones store rotation in EXIF
    img = img.convert("RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    img = ImageOps.autocontrast(img, cutoff=2)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, format="PNG")
    return dst
