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


MOTIONS = {motion for motion, _ in MOTION_WORDS}


def choose_motion(typed: str | None, suggested: str | None, prompt: str) -> tuple[str, str]:
    """(motion, why). A move word in the person's own text wins, then the LLM's closest
    move, then a move word in the LLM's longer prompt, then AD_MOTION (random)."""
    motion, word = motion_for(typed or "")
    if word:
        return motion, f'from "{word}" in your words'
    if suggested in MOTIONS:
        return suggested, "the AI's closest move to what you asked"
    motion, word = motion_for(prompt)
    if word:
        return motion, f'from "{word}" in the prompt'
    return settings.ad_motion, "no move named in the prompt, so random"


class AnimatedDrawingsApiAnimator:
    name = "animated_drawings_api"
    takes_motion = True

    def animate(self, image_path: Path, prompt: str, out_dir: Path,
                motion: str | None = None, motion_reason: str | None = None) -> Path:
        if not settings.ad_service_url:
            raise RuntimeError("AnimatedDrawings service is not set up: set AD_SERVICE_URL")

        if not motion:
            motion, motion_reason = choose_motion(None, None, prompt)
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
        note(f"Motion: {played} ({motion_reason})")
        if "random" in (motion_reason or ""):
            note("Moves: wave, jump, jumping jacks, zombie walk, dab")
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / "animation.gif"
        out.write_bytes(res.content)
        return out
