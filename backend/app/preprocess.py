"""Turn a phone photo of a drawing into a clean, model-friendly image."""
import logging
from pathlib import Path

from PIL import Image, ImageOps

log = logging.getLogger(__name__)

MAX_SIDE = 1024


def clean_photo(src: Path, dst: Path, report: dict | None = None) -> Path:
    """Fix rotation, find and flatten the sheet of paper, whiten shadows, shrink, boost contrast.

    `report`, if given, gets {"paper": "..."} describing what was done (for the flow chart).
    """
    img = Image.open(src)
    img = ImageOps.exif_transpose(img)  # phones store rotation in EXIF
    img = img.convert("RGB")
    img.thumbnail((MAX_SIDE * 2, MAX_SIDE * 2))  # keep detail for finding the paper edges
    try:
        from .drawing_tools import straighten_paper

        img, found = straighten_paper(img)
        paper = "found, straightened and whitened" if found else "edges not found, whitened the whole photo"
    except Exception:  # never let clean-up break the demo
        log.exception("Paper detection failed; using the plain photo")
        paper = "detection failed, used the plain photo"
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    img = ImageOps.autocontrast(img, cutoff=2)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, format="PNG")
    if report is not None:
        report["paper"] = paper
    return dst
