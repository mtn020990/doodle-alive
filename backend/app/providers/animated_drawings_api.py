"""Meta AnimatedDrawings running as its own service (character-service/).

scripts/deploy-azure.ps1 -Part character deploys it next to the backend and sets
AD_SERVICE_URL. The service answers POST /animate (image, motion) with a GIF.

AnimatedDrawings plays preset motions only; it can't follow free text. So the motion
is picked from words in the prompt (the user's, or the one Gemini wrote).
"""
import re
from pathlib import Path

import httpx

from ..config import settings
from ..trace import note


# First match wins, so "jumping jacks" is checked before "jump".
MOTION_WORDS = [
    ("jumping_jacks", r"jumping[ -]?jacks?|star ?jumps?|exercis"),
    ("wave_hello", r"\bwav(e|es|ing)\b|hello|\bhi\b|greet"),
    ("jumping", r"jump|\bhop|bounc|leap"),
    ("zombie", r"zombie|monster|stagger|\bwalk|creep"),
    ("dab", r"\bdab|danc"),
]


def motion_for(prompt: str) -> tuple[str, str | None]:
    """(motion, the word that chose it); falls back to AD_MOTION when nothing matches.

    The earliest word in the prompt wins, so the person's own words (put first) beat the
    LLM's longer description; on a tie, the list order decides ("jumping jacks" before "jump").
    """
    best = None
    for rank, (motion, pattern) in enumerate(MOTION_WORDS):
        found = re.search(pattern, prompt or "", re.IGNORECASE)
        if found and (best is None or (found.start(), rank) < best[0]):
            best = ((found.start(), rank), motion, found.group(0))
    return (best[1], best[2]) if best else (settings.ad_motion, None)


class AnimatedDrawingsApiAnimator:
    name = "animated_drawings_api"

    def animate(self, image_path: Path, prompt: str, out_dir: Path) -> Path:
        if not settings.ad_service_url:
            raise RuntimeError("AnimatedDrawings service is not set up: set AD_SERVICE_URL")

        motion, word = motion_for(prompt)
        with image_path.open("rb") as image:
            res = httpx.post(
                f"{settings.ad_service_url.rstrip('/')}/animate",
                files={"image": (image_path.name, image, "image/png")},
                data={"motion": motion},
                timeout=300,
            )
        if res.status_code != 200:
            raise RuntimeError(f"AnimatedDrawings service returned {res.status_code}: {res.text[-300:]}")

        played = res.headers.get("X-Motion", motion)
        if word:
            note(f"Motion: {played} (from \"{word}\" in the prompt)")
        else:
            note(f"Motion: {played} (no move named in the prompt, so {motion}). "
                 "Moves: wave, jump, jumping jacks, zombie walk, dab")
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / "animation.gif"
        out.write_bytes(res.content)
        return out
