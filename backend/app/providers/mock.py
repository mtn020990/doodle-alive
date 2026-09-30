"""Offline animator: makes the drawing bounce and wobble. No GPU, no network.

It proves the full phone -> backend -> GIF loop works, and it is the safety
net if every real model is down during the demo.
"""
import math
from pathlib import Path

from PIL import Image

FRAMES = 16
FRAME_MS = 70


class MockAnimator:
    name = "mock"

    def animate(self, image_path: Path, prompt: str, out_dir: Path) -> Path:
        src = Image.open(image_path).convert("RGB")
        src.thumbnail((512, 512))
        w, h = src.size
        pad = int(max(w, h) * 0.15)
        canvas_size = (w + pad * 2, h + pad * 2)

        frames = []
        for i in range(FRAMES):
            t = i / FRAMES * 2 * math.pi
            angle = 4 * math.sin(t)                      # wobble
            squash = 1 + 0.06 * math.sin(2 * t)          # squash & stretch
            lift = int(pad * 0.6 * abs(math.sin(t)))     # bounce
            frame_img = src.resize((int(w / squash), int(h * squash)))
            frame_img = frame_img.rotate(angle, expand=True, fillcolor="white")
            canvas = Image.new("RGB", canvas_size, "white")
            x = (canvas_size[0] - frame_img.width) // 2
            y = canvas_size[1] - pad // 2 - frame_img.height - lift
            canvas.paste(frame_img, (x, max(0, y)))
            frames.append(canvas)

        out = out_dir / "animation.gif"
        out_dir.mkdir(parents=True, exist_ok=True)
        frames[0].save(out, save_all=True, append_images=frames[1:], duration=FRAME_MS, loop=0)
        return out
