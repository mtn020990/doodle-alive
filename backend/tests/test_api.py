import io
from pathlib import Path
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


def test_gemini_describes_drawing_and_picks_character(monkeypatch):
    import httpx

    from app.config import settings

    reply = '{"subject": "a stick person", "kind": "character", "motion_prompt": "The person waves hello."}'

    def fake_post(url, **kwargs):
        assert "gemini" in url and kwargs["headers"]["x-goog-api-key"] == "test-key"
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": reply}]}}]},
                              request=httpx.Request("POST", url))

    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(httpx, "post", fake_post)
    res = client.post("/api/jobs", files={"image": ("d.png", _drawing_png(), "image/png")}, data={"mode": "auto"})
    job = client.get(f"/api/jobs/{res.json()['id']}").json()
    assert job["status"] == "done"
    assert (job["subject"], job["kind"], job["prompt"]) == ("a stick person", "character", "The person waves hello.")


def _gif_bytes() -> bytes:
    buf = io.BytesIO()
    frames = [Image.new("RGB", (64, 64), color) for color in ("white", "black")]
    frames[0].save(buf, format="GIF", save_all=True, append_images=frames[1:])
    return buf.getvalue()


def test_character_service_returns_gif(monkeypatch):
    import httpx

    from app.config import settings

    def fake_post(url, **kwargs):
        assert url == "http://character/animate" and kwargs["data"] == {"motion": "random"}
        return httpx.Response(200, content=_gif_bytes(), request=httpx.Request("POST", url))

    monkeypatch.setattr(settings, "character_animator", "animated_drawings_api")
    monkeypatch.setattr(settings, "ad_service_url", "http://character")
    monkeypatch.setattr(httpx, "post", fake_post)
    res = client.post("/api/jobs", files={"image": ("d.png", _drawing_png(), "image/png")}, data={"mode": "character"})
    job = client.get(f"/api/jobs/{res.json()['id']}").json()
    assert (job["status"], job["animator"], job["warning"]) == ("done", "animated_drawings_api", None)
    assert client.get(job["output_url"]).content == _gif_bytes()


def test_failed_character_uses_scene_model_before_mock(monkeypatch):
    from app import providers
    from app.config import settings

    class FakeScene:
        name = "fake_scene"

        def animate(self, image_path, prompt, out_dir):
            out = out_dir / "animation.mp4"
            out.write_bytes(b"video")
            return out

    monkeypatch.setitem(providers.PROVIDERS, "fake_scene", FakeScene)
    monkeypatch.setattr(settings, "character_animator", "animated_drawings_api")
    monkeypatch.setattr(settings, "ad_service_url", "")  # not set up -> fails
    monkeypatch.setattr(settings, "scene_animator", "fake_scene")
    res = client.post("/api/jobs", files={"image": ("d.png", _drawing_png(), "image/png")}, data={"mode": "character"})
    job = client.get(f"/api/jobs/{res.json()['id']}").json()
    assert (job["status"], job["animator"]) == ("done", "fake_scene")
    assert "animated_drawings_api failed" in job["warning"]


def _fresh_pool(monkeypatch, *names):
    from app import hf_keys, main
    from app.providers import hf_space

    pool = hf_keys.HfKeyPool([hf_keys.HfKey(name, f"hf_{name}") for name in names])
    monkeypatch.setattr(hf_space, "pool", pool)
    monkeypatch.setattr(main, "hf_key_pool", pool)
    return pool


def test_hf_space_moves_to_next_key_on_quota(monkeypatch):
    from app.providers.hf_space import HfSpaceAnimator

    pool = _fresh_pool(monkeypatch, "Ngan", "Minh")
    used = []

    def fake_animate(self, space, token, image_path, prompt, out_dir):
        used.append(token)
        if token == "hf_Ngan":
            raise RuntimeError("You have exceeded your free ZeroGPU quota")
        out_dir.mkdir(parents=True, exist_ok=True)
        return out_dir / "animation.mp4"

    monkeypatch.setattr(HfSpaceAnimator, "_animate", fake_animate)
    HfSpaceAnimator().animate(Path("in.png"), "p", Path(tempfile.mkdtemp()))
    HfSpaceAnimator().animate(Path("in.png"), "p", Path(tempfile.mkdtemp()))
    assert used == ["hf_Ngan", "hf_Minh", "hf_Minh"]  # second job starts on the key that worked
    status = {key["name"]: key for key in pool.status()}
    assert status["Minh"]["active"] and status["Ngan"]["quota_hit_at"]


def test_hf_space_does_not_rotate_on_other_errors(monkeypatch):
    import pytest

    from app.providers.hf_space import HfSpaceAnimator

    _fresh_pool(monkeypatch, "Ngan", "Minh")
    used = []

    def fake_animate(self, space, token, *args):
        used.append(token)
        raise RuntimeError("Space is sleeping")

    monkeypatch.setattr(HfSpaceAnimator, "_animate", fake_animate)
    with pytest.raises(RuntimeError, match="sleeping"):
        HfSpaceAnimator().animate(Path("in.png"), "p", Path(tempfile.mkdtemp()))
    assert used == ["hf_Ngan"]


def test_admin_keys_need_pin_and_never_return_tokens(monkeypatch):
    from app.config import settings

    _fresh_pool(monkeypatch, "Ngan", "Minh")
    monkeypatch.setattr(settings, "admin_pin", "246810")
    assert client.get("/api/admin/hf-keys").status_code == 401
    assert client.get("/api/admin/hf-keys", headers={"X-Admin-Pin": "nope"}).status_code == 401

    res = client.post("/api/admin/hf-keys/active", json={"name": "Minh"}, headers={"X-Admin-Pin": "246810"})
    assert res.status_code == 200
    assert [k["name"] for k in res.json()["keys"] if k["active"]] == ["Minh"]
    assert "hf_" not in res.text


def test_admin_is_off_without_pin(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "admin_pin", "")
    assert client.get("/api/admin/hf-keys", headers={"X-Admin-Pin": ""}).status_code == 404


def test_job_steps_trace_the_pipeline_including_fallback(monkeypatch):
    from app import providers
    from app.config import settings

    class FakeScene:
        name = "fake_scene"

        def animate(self, image_path, prompt, out_dir):
            out = out_dir / "animation.mp4"
            out.write_bytes(b"video")
            return out

    monkeypatch.setitem(providers.PROVIDERS, "fake_scene", FakeScene)
    monkeypatch.setattr(settings, "character_animator", "animated_drawings_api")
    monkeypatch.setattr(settings, "ad_service_url", "")  # fails
    monkeypatch.setattr(settings, "scene_animator", "fake_scene")
    res = client.post("/api/jobs", files={"image": ("d.png", _drawing_png(), "image/png")}, data={"mode": "character"})
    steps = client.get(f"/api/jobs/{res.json()['id']}").json()["steps"]

    assert [(s["title"], s["status"]) for s in steps] == [
        ("Clean up photo", "done"),
        ("Understand the drawing", "done"),
        ("Pick the animator", "done"),
        ("Animate", "failed"),
        ("Fallback: animate", "done"),
        ("Ready", "done"),
    ]
    assert steps[2]["outputs"]["mode"] == "character (you chose it)"
    assert "AD_SERVICE_URL" in steps[3]["notes"][0]
    assert all(isinstance(s["duration_ms"], int) for s in steps)


def test_gpu_server_used_when_all_hf_keys_are_out_of_quota(monkeypatch):
    from app import gpu_servers as gs
    from app.providers import hf_space
    from app.providers.hf_space import HfSpaceAnimator

    _fresh_pool(monkeypatch, "Ngan")
    servers = gs.GpuServerList([gs.GpuServer("Kaggle", "https://dead.gradio.live"),
                                gs.GpuServer("Colab", "https://live.gradio.live")], Path(tempfile.mkdtemp()) / "s.json")
    monkeypatch.setattr(hf_space, "gpu_servers", servers)
    calls = []

    def fake_animate(self, space, token, image_path, prompt, out_dir):
        calls.append(space)
        if token:
            raise RuntimeError("You have exceeded your free ZeroGPU quota")
        if "dead" in space:
            raise ConnectionError("link expired")
        out_dir.mkdir(parents=True, exist_ok=True)
        return out_dir / "animation.mp4"

    monkeypatch.setattr(HfSpaceAnimator, "_animate", fake_animate)
    HfSpaceAnimator().animate(Path("in.png"), "p", Path(tempfile.mkdtemp()))
    assert calls[1:] == ["https://dead.gradio.live", "https://live.gradio.live"]
    status = {s["name"]: s for s in servers.status()}
    assert status["Kaggle"]["last_error"] and status["Colab"]["last_ok_at"]


def test_admin_sets_gpu_server_link_and_it_is_saved(monkeypatch):
    from app import gpu_servers as gs
    from app import main
    from app.config import settings

    store = Path(tempfile.mkdtemp()) / "gpu_servers.json"
    monkeypatch.setattr(main, "gpu_servers", gs.GpuServerList([gs.GpuServer("Kaggle")], store))
    monkeypatch.setattr(settings, "admin_pin", "246810")
    pin = {"X-Admin-Pin": "246810"}
    assert client.post("/api/admin/gpu-servers", json={"name": "Kaggle", "url": "http://x"}, headers=pin).status_code == 400
    res = client.post("/api/admin/gpu-servers", json={"name": "Kaggle", "url": "https://abc.gradio.live/"}, headers=pin)
    assert res.json()["servers"][0]["url"] == "https://abc.gradio.live"
    assert "abc.gradio.live" in store.read_text()
