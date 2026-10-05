"""Image tools for photos of drawings, all local (OpenCV + Pillow), no AI and no quota.

- straighten_paper: find the sheet of paper, flatten it, and whiten shadows away
- auto_paint: fill every closed shape with a crayon colour, keeping the lines
- combine: put two drawings side by side, so one video can make them interact
"""
from __future__ import annotations

import random
from pathlib import Path

from PIL import Image

try:  # only straighten_paper and auto_paint need OpenCV; combine is plain Pillow
    import cv2
    import numpy as np
except ImportError:  # pragma: no cover - the Docker image always has them
    cv2 = np = None

# Bright crayon colours (RGB).
PALETTE = [
    (255, 89, 94), (255, 146, 76), (255, 202, 58), (138, 201, 38), (82, 166, 117),
    (25, 130, 196), (106, 76, 147), (255, 112, 166), (64, 196, 255), (255, 170, 120),
]


def straighten_paper(img: Image.Image) -> tuple[Image.Image, bool]:
    """(image, found). Flattens the largest 4-cornered shape (the sheet) if it fills enough of
    the photo, then evens out lighting so the paper is white. Returns the photo unchanged
    (but whitened) when no sheet is found."""
    rgb = np.array(img.convert("RGB"))
    corners = _find_sheet(rgb)
    if corners is not None:
        rgb = _warp(rgb, corners)
    return Image.fromarray(_whiten(rgb)), corners is not None


def _find_sheet(rgb: np.ndarray) -> np.ndarray | None:
    h, w = rgb.shape[:2]
    scale = 800 / max(h, w)
    small = cv2.resize(rgb, (round(w * scale), round(h * scale)))
    gray = cv2.GaussianBlur(cv2.cvtColor(small, cv2.COLOR_RGB2GRAY), (5, 5), 0)
    edges = cv2.dilate(cv2.Canny(gray, 50, 150), np.ones((3, 3), np.uint8))
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    min_area = 0.25 * small.shape[0] * small.shape[1]
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:5]:
        approx = cv2.approxPolyDP(contour, 0.02 * cv2.arcLength(contour, True), True)
        if len(approx) == 4 and cv2.isContourConvex(approx) and cv2.contourArea(approx) > min_area:
            # A sheet that is the whole photo is just the photo edge: nothing to straighten.
            if cv2.contourArea(approx) > 0.97 * small.shape[0] * small.shape[1]:
                return None
            return approx.reshape(4, 2).astype(np.float32) / scale
    return None


def _warp(rgb: np.ndarray, corners: np.ndarray) -> np.ndarray:
    s, d = corners.sum(axis=1), np.diff(corners, axis=1).ravel()
    tl, br = corners[np.argmin(s)], corners[np.argmax(s)]
    tr, bl = corners[np.argmin(d)], corners[np.argmax(d)]
    width = int(max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl)))
    height = int(max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr)))
    src = np.array([tl, tr, br, bl], dtype=np.float32)
    dst = np.array([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]], dtype=np.float32)
    return cv2.warpPerspective(rgb, cv2.getPerspectiveTransform(src, dst), (width, height))


def _whiten(rgb: np.ndarray) -> np.ndarray:
    """Divide out the (blurred) paper colour per channel: shadows and grey light go, ink stays."""
    out = []
    for plane in cv2.split(rgb):
        background = cv2.medianBlur(cv2.dilate(plane, np.ones((7, 7), np.uint8)), 21)
        out.append(cv2.divide(plane, background, scale=255))
    return cv2.merge(out)


def auto_paint(src: Path, dst: Path, seed: int | None = None) -> int:
    """Fill each closed shape with a crayon colour; returns how many shapes were filled."""
    rgb = np.array(Image.open(src).convert("RGB"))
    h, w = rgb.shape[:2]
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    lines = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 25, 12)
    walls = cv2.dilate(lines, np.ones((3, 3), np.uint8))  # closes small gaps in the outlines
    count, labels, stats, _ = cv2.connectedComponentsWithStats(255 - walls, connectivity=4)

    rng = random.Random(seed)
    noise = np.random.default_rng(seed).normal(0, 9, (h, w, 1))  # crayon grain
    out = rgb.astype(np.float32)
    filled = 0
    for i in range(1, count):
        x, y, bw, bh, area = stats[i]
        touches_edge = x == 0 or y == 0 or x + bw >= w or y + bh >= h  # the paper around the drawing
        if touches_edge or area < 0.0008 * h * w or area > 0.6 * h * w:
            continue
        mask = labels == i
        colour = np.array(rng.choice(PALETTE), dtype=np.float32)
        out[mask] = np.clip(colour + noise[mask], 0, 255)
        filled += 1
    out[lines > 0] = rgb[lines > 0]  # the original lines stay on top
    Image.fromarray(out.astype(np.uint8)).save(dst, format="PNG")
    return filled


def combine(first: Path, second: Path, dst: Path, height: int = 640, gap: int = 48) -> Path:
    """Two drawings side by side on white paper (same height), for one shared video."""
    images = [Image.open(p).convert("RGB") for p in (first, second)]
    images = [im.resize((max(1, round(im.width * height / im.height)), height)) for im in images]
    canvas = Image.new("RGB", (sum(im.width for im in images) + gap * 3, height + gap * 2), "white")
    x = gap
    for im in images:
        canvas.paste(im, (x, gap))
        x += im.width + gap
    canvas.save(dst, format="PNG")
    return dst
