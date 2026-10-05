"""Meta AnimatedDrawings running as its own service (character-service/).

scripts/deploy-azure.ps1 -Part character deploys it next to the backend and sets
AD_SERVICE_URL. The service answers POST /animate (image, motion) with a GIF.
"""
from pathlib import Path

import httpx

from ..config import settings
from ..trace import note


class AnimatedDrawingsApiAnimator:
    name = "animated_drawings_api"

    def animate(self, image_path: Path, prompt: str, out_dir: Path) -> Path:
        if not settings.ad_service_url:
            raise RuntimeError("AnimatedDrawings service is not set up: set AD_SERVICE_URL")

        with image_path.open("rb") as image:
            res = httpx.post(
                f"{settings.ad_service_url.rstrip('/')}/animate",
                files={"image": (image_path.name, image, "image/png")},
                data={"motion": settings.ad_motion},
                timeout=300,
            )
        if res.status_code != 200:
            raise RuntimeError(f"AnimatedDrawings service returned {res.status_code}: {res.text[-300:]}")

        note(f"Motion: {res.headers.get('X-Motion', settings.ad_motion)}")
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / "animation.gif"
        out.write_bytes(res.content)
        return out
