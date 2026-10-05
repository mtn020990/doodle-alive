"""HTTP wrapper around Meta AnimatedDrawings.

POST /animate  multipart: image (file), motion (optional; a name below or "random")
               -> 200 image/gif (header X-Motion), or 422 {"error"} if no figure was found
GET  /health   -> 200 once the TorchServe models are loaded, else 503

Python 3.8 (AnimatedDrawings' version), so no `X | None` type syntax here.
"""
import random
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

import requests
from flask import Flask, Response, jsonify, request

AD_ROOT = Path("/opt/AnimatedDrawings")
# move -> (motion config, retarget config for its skeleton: fair1 BVH -> fair1_ppf, cmu1 -> cmu1_pfp)
MOTIONS = {
    "dab": ("dab", "fair1_ppf"),
    "jumping": ("jumping", "fair1_ppf"),
    "wave_hello": ("wave_hello", "fair1_ppf"),
    "zombie": ("zombie", "fair1_ppf"),
    "jumping_jacks": ("jumping_jacks", "cmu1_pfp"),
    # Four-legged animals: the repo's quadruped extension (examples/quadruped) walks them with zombie.
    "animal_walk": ("zombie", "four_legs"),
}
HUMAN_MOTIONS = sorted(m for m in MOTIONS if m != "animal_walk")  # what "random" picks from

app = Flask(__name__)
_render_lock = threading.Lock()  # one render at a time: CPU-bound, keeps memory predictable


@app.get("/health")
def health():
    try:
        ok = requests.get("http://localhost:8080/ping", timeout=5).json().get("status") == "Healthy"
    except (requests.RequestException, ValueError):
        ok = False
    return jsonify(ok=ok, motions=sorted(MOTIONS)), (200 if ok else 503)


@app.post("/animate")
def animate():
    image = request.files.get("image")
    if image is None:
        return jsonify(error="image is required"), 400
    motion = request.form.get("motion") or "random"
    if motion == "random":
        motion = random.choice(HUMAN_MOTIONS)
    if motion not in MOTIONS:
        return jsonify(error=f"motion must be one of {sorted(MOTIONS)} or random"), 400

    work = Path(tempfile.mkdtemp(prefix="ad-"))
    try:
        image_path = work / "input.png"
        image.save(str(image_path))
        char_dir = work / "char"
        cmd = [sys.executable, "/app/render_job.py", str(image_path), str(char_dir), *MOTIONS[motion]]
        with _render_lock:
            proc = subprocess.run(cmd, cwd=AD_ROOT, capture_output=True, text=True, timeout=300)
        gif = char_dir / "video.gif"
        if proc.returncode != 0 or not gif.is_file():
            app.logger.warning("render failed: %s", proc.stderr[-2000:])
            return jsonify(error=_short_error(proc.stderr or proc.stdout)), 422
        response = Response(gif.read_bytes(), mimetype="image/gif")
        response.headers["X-Motion"] = motion
        return response
    finally:
        shutil.rmtree(work, ignore_errors=True)


def _short_error(text: str) -> str:
    """Last meaningful line, e.g. 'Could not detect any drawn humanoids in the image. Aborting'."""
    lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
    return lines[-1][-300:] if lines else "AnimatedDrawings failed"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True)
