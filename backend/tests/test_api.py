import io
import os
import tempfile

os.environ["DATA_DIR"] = tempfile.mkdtemp()
os.environ["SCENE_ANIMATOR"] = "mock"
os.environ["CHARACTER_ANIMATOR"] = "mock"
os.environ["ANTHROPIC_API_KEY"] = ""

from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)


def _drawing_png() -> bytes:
    img = Image.new("RGB", (400, 300), "white")
    draw = ImageDraw.Draw(img)
    draw.ellipse((150, 50, 250, 150), outline="black", width=6)
    draw.line((200, 150, 200, 260), fill="black", width=6)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_health():
    assert client.get("/api/health").json()["ok"] is True


def test_drawing_becomes_gif():
    res = client.post(
        "/api/jobs",
        files={"image": ("drawing.png", _drawing_png(), "image/png")},
        data={"mode": "auto"},
    )
    assert res.status_code == 202
    job = client.get(f"/api/jobs/{res.json()['id']}").json()  # background task already ran
    assert job["status"] == "done", job
    assert job["output_url"].endswith(".gif")

    gif = client.get(job["output_url"])
    assert gif.status_code == 200
    frames = Image.open(io.BytesIO(gif.content))
    assert frames.n_frames > 1


def test_failing_real_model_falls_back_to_mock(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "character_animator", "animated_drawings")
    monkeypatch.setattr(settings, "ad_repo_dir", "")  # not installed -> fails
    res = client.post(
        "/api/jobs",
        files={"image": ("d.png", _drawing_png(), "image/png")},
        data={"mode": "character"},
    )
    job = client.get(f"/api/jobs/{res.json()['id']}").json()
    assert job["status"] == "done"
    assert job["animator"] == "mock"
    assert "animated_drawings failed" in job["warning"]


def test_rejects_non_image():
    res = client.post("/api/jobs", files={"image": ("a.txt", b"hi", "text/plain")})
    assert res.status_code == 400


def test_rejects_bad_mode():
    res = client.post(
        "/api/jobs",
        files={"image": ("d.png", _drawing_png(), "image/png")},
        data={"mode": "banana"},
    )
    assert res.status_code == 400


def test_unknown_job_is_404():
    assert client.get("/api/jobs/nope").status_code == 404
