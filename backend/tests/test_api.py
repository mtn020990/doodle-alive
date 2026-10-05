import io
from pathlib import Path
import os
import tempfile

os.environ["DATA_DIR"] = tempfile.mkdtemp()
os.environ["SCENE_ANIMATOR"] = "mock"
os.environ["CHARACTER_ANIMATOR"] = "mock"
os.environ["ANTHROPIC_API_KEY"] = ""
os.environ["GEMINI_API_KEY"] = ""  # never call the real LLM from tests
os.environ["HF_TOKENS"] = ""
os.environ["AD_SERVICE_URL"] = ""
os.environ["GPU_SERVERS"] = ""

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


def test_character_motion_follows_the_prompt():
    from app.providers.animated_drawings_api import motion_for

    assert motion_for("he waves hello to everyone") == ("wave_hello", "waves")
    assert motion_for("doing jumping jacks") == ("jumping_jacks", "jumping jacks")
    assert motion_for("Jumps up high!")[0] == "jumping"
    assert motion_for("walks like a zombie")[0] == "zombie"
    assert motion_for("this one is shy")[0] == "random"  # "hi" inside "this" must not count
    assert motion_for("the rocket blasts off into space") == ("random", None)


def test_character_prompt_is_sent_as_motion(monkeypatch):
    import httpx

    from app.config import settings

    sent = {}

    def fake_post(url, **kwargs):
        sent.update(kwargs["data"])
        return httpx.Response(200, content=_gif_bytes(), headers={"X-Motion": "wave_hello"},
                              request=httpx.Request("POST", url))

    monkeypatch.setattr(settings, "character_animator", "animated_drawings_api")
    monkeypatch.setattr(settings, "ad_service_url", "http://character")
    monkeypatch.setattr(httpx, "post", fake_post)
    res = client.post("/api/jobs", files={"image": ("d.png", _drawing_png(), "image/png")},
                      data={"mode": "character", "prompt": "wave hello"})
    job = client.get(f"/api/jobs/{res.json()['id']}").json()
    assert sent == {"motion": "wave_hello"}
    assert 'wave_hello (from "wave" in your words)' in job["steps"][3]["notes"][0]


def test_duration_must_be_1_to_10_seconds():
    for bad in ("0", "11", "-3"):
        res = client.post("/api/jobs", files={"image": ("d.png", _drawing_png(), "image/png")},
                          data={"mode": "scene", "duration": bad})
        assert res.status_code == 400, bad


def test_duration_reaches_video_model_but_not_others(monkeypatch):
    from app import providers
    from app.config import settings

    got = {}

    class FakeVideo:
        name = "fake_video"
        takes_duration = True

        def animate(self, image_path, prompt, out_dir, duration=None):
            got["duration"] = duration
            out = out_dir / "animation.mp4"
            out.write_bytes(b"video")
            return out

    monkeypatch.setitem(providers.PROVIDERS, "fake_video", FakeVideo)
    monkeypatch.setattr(settings, "scene_animator", "fake_video")
    res = client.post("/api/jobs", files={"image": ("d.png", _drawing_png(), "image/png")},
                      data={"mode": "scene", "duration": "5"})
    job = client.get(f"/api/jobs/{res.json()['id']}").json()
    assert got == {"duration": 5.0} and job["duration"] == 5.0
    assert job["steps"][2]["outputs"]["length"] == "5 s"

    # mock has no takes_duration: called without it, and the job still succeeds
    monkeypatch.setattr(settings, "scene_animator", "mock")
    res = client.post("/api/jobs", files={"image": ("d.png", _drawing_png(), "image/png")},
                      data={"mode": "scene", "duration": "8"})
    assert client.get(f"/api/jobs/{res.json()['id']}").json()["status"] == "done"


def test_hf_space_sends_duration_as_space_parameter(monkeypatch):
    import gradio_client

    from app.providers.hf_space import HfSpaceAnimator

    _fresh_pool(monkeypatch)  # no keys: anonymous call
    sent = {}

    class FakeClient:
        def __init__(self, space, token=None):
            pass

        def predict(self, api_name, **kwargs):
            sent.update(kwargs)
            path = Path(tempfile.mkdtemp()) / "v.mp4"
            path.write_bytes(b"video")
            return (str(path), 1)

    monkeypatch.setattr(gradio_client, "Client", FakeClient)
    monkeypatch.setattr(gradio_client, "handle_file", lambda p: p)
    img = Path(tempfile.mkdtemp()) / "in.png"
    img.write_bytes(_drawing_png())
    HfSpaceAnimator().animate(img, "p", Path(tempfile.mkdtemp()), duration=7)
    assert sent["duration_ui"] == 7


def test_typed_prompt_is_expanded_by_gemini_not_replaced(monkeypatch):
    import httpx

    from app.config import settings

    asked = {}
    reply = ('{"subject": "a puppy", "kind": "scene", "motion_prompt": '
             '"The hand-drawn puppy chases and pushes a ball across the ground, tail wagging."}')

    def fake_post(url, **kwargs):
        asked["text"] = kwargs["json"]["contents"][0]["parts"][1]["text"]
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": reply}]}}]},
                              request=httpx.Request("POST", url))

    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(httpx, "post", fake_post)
    res = client.post("/api/jobs", files={"image": ("d.png", _drawing_png(), "image/png")},
                      data={"mode": "scene", "prompt": "Dog playing with a ball"})
    job = client.get(f"/api/jobs/{res.json()['id']}").json()
    assert 'The person asked for this motion: "Dog playing with a ball"' in asked["text"]
    assert job["prompt"].startswith("The hand-drawn puppy chases")
    router = job["steps"][2]["outputs"]
    assert router["your idea"] == "Dog playing with a ball" and router["final prompt"] == job["prompt"]
    gemini = job["steps"][1]
    assert gemini["outputs"]["your idea"] == "Dog playing with a ball"
    assert gemini["outputs"]["enriched prompt"] == job["prompt"]
    assert "Gemini enriched your idea" in gemini["notes"][0]


def test_typed_prompt_without_llm_keeps_words_and_adds_style():
    res = client.post("/api/jobs", files={"image": ("d.png", _drawing_png(), "image/png")},
                      data={"mode": "scene", "prompt": "Dog playing with a ball"})
    job = client.get(f"/api/jobs/{res.json()['id']}").json()
    assert job["prompt"] == "Dog playing with a ball. Keep the hand-drawn style of the drawing and a static camera."


def test_first_motion_word_wins():
    from app.providers.animated_drawings_api import motion_for

    # typed words come first, so "jump" beats the LLM's later "waving"
    assert motion_for("jump. The figure jumps while waving its arms")[0] == "jumping"
    assert motion_for("doing jumping jacks")[0] == "jumping_jacks"  # tie at same spot: list order


def _fake_gemini(monkeypatch, reply_prompt, asked):
    import httpx

    from app.config import settings

    def fake_post(url, **kwargs):
        asked.append(kwargs["json"])
        reply = '{"subject": "a puppy", "kind": "scene", "motion_prompt": "%s"}' % reply_prompt
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": reply}]}}]},
                              request=httpx.Request("POST", url))

    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(httpx, "post", fake_post)


def test_describe_returns_prompt_to_review(monkeypatch):
    asked = []
    _fake_gemini(monkeypatch, "The puppy chases the ball.", asked)
    res = client.post("/api/describe", files={"image": ("d.png", _drawing_png(), "image/png")},
                      data={"mode": "auto", "prompt": "dog plays with a ball"})
    assert res.status_code == 200
    assert res.json() == {"subject": "a puppy", "kind": "scene", "prompt": "The puppy chases the ball.",
                          "source": "gemini", "warning": None, "guesses": [], "sound": None, "music": None}


def test_describe_applies_a_change_and_a_different_take(monkeypatch):
    asked = []
    _fake_gemini(monkeypatch, "The puppy chases the ball as it rolls on the ground.", asked)
    res = client.post("/api/describe", files={"image": ("d.png", _drawing_png(), "image/png")},
                      data={"mode": "scene", "current": "The puppy chases the ball.",
                            "change": "the ball rolls on the ground"})
    assert res.json()["prompt"] == "The puppy chases the ball as it rolls on the ground."
    text = asked[0]["contents"][0]["parts"][1]["text"]
    assert 'Rewrite it with this change: "the ball rolls on the ground"' in text

    client.post("/api/describe", files={"image": ("d.png", _drawing_png(), "image/png")},
                data={"mode": "scene", "current": "The puppy chases the ball.", "different": "true"})
    assert "clearly different" in asked[1]["contents"][0]["parts"][1]["text"]
    assert asked[1]["generationConfig"]["temperature"] > asked[0]["generationConfig"]["temperature"]


def test_describe_without_llm_appends_change():
    res = client.post("/api/describe", files={"image": ("d.png", _drawing_png(), "image/png")},
                      data={"mode": "character", "current": "The figure jumps.", "change": "then waves hello"})
    body = res.json()
    assert body["prompt"] == "The figure jumps. then waves hello."
    assert body["motion"] == "jumping"  # first move word wins


def test_job_uses_reviewed_prompt_without_calling_the_llm(monkeypatch):
    asked = []
    _fake_gemini(monkeypatch, "should not be used", asked)
    res = client.post("/api/jobs", files={"image": ("d.png", _drawing_png(), "image/png")},
                      data={"mode": "scene", "final_prompt": "The puppy rolls the ball, edited by me.",
                            "subject": "a puppy"})
    job = client.get(f"/api/jobs/{res.json()['id']}").json()
    assert asked == []
    assert (job["status"], job["prompt"], job["subject"]) == ("done", "The puppy rolls the ball, edited by me.", "a puppy")
    assert job["steps"][1]["model"] == "Reviewed by you"


def test_gemini_picks_closest_move_when_no_move_word_is_typed(monkeypatch):
    import httpx

    from app.config import settings

    reply = ('{"subject": "a boy", "kind": "character", "move": "zombie", '
             '"motion_prompt": "The boy runs forward in place, pumping his arms."}')
    sent = {}

    def fake_post(url, **kwargs):
        if "gemini" in url:
            return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": reply}]}}]},
                                  request=httpx.Request("POST", url))
        sent.update(kwargs["data"])
        return httpx.Response(200, content=_gif_bytes(), headers={"X-Motion": kwargs["data"]["motion"]},
                              request=httpx.Request("POST", url))

    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(settings, "character_animator", "animated_drawings_api")
    monkeypatch.setattr(settings, "ad_service_url", "http://character")
    monkeypatch.setattr(httpx, "post", fake_post)
    res = client.post("/api/jobs", files={"image": ("d.png", _drawing_png(), "image/png")},
                      data={"mode": "character", "prompt": "a boy is running"})
    job = client.get(f"/api/jobs/{res.json()['id']}").json()
    assert sent == {"motion": "zombie"} and job["motion"] == "zombie"
    assert "closest move" in job["steps"][2]["outputs"]["dance move"]


def test_typed_move_word_beats_gemini_suggestion():
    from app.providers.animated_drawings_api import choose_motion

    assert choose_motion("he waves", "zombie", "...")[0] == "wave_hello"
    assert choose_motion("a boy is running", "zombie", "runs, waving his arms")[0] == "zombie"
    assert choose_motion(None, None, "the boy jumps")[0] == "jumping"
    assert choose_motion(None, "not-a-move", "nothing here") == ("random", "no move named in the prompt, so random")


def _sheet_photo() -> bytes:
    """A white sheet with a drawn shape, photographed at an angle on a dark table."""
    img = Image.new("RGB", (900, 700), (70, 50, 40))
    draw = ImageDraw.Draw(img)
    draw.polygon([(150, 90), (760, 130), (720, 620), (110, 580)], fill=(235, 232, 225))
    draw.ellipse((330, 250, 520, 440), outline="black", width=8)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_paper_is_found_and_straightened():
    import pytest

    pytest.importorskip("cv2")
    from app.preprocess import clean_photo

    folder = Path(tempfile.mkdtemp())
    (folder / "in.png").write_bytes(_sheet_photo())
    report = {}
    out = clean_photo(folder / "in.png", folder / "out.png", report)
    assert report["paper"].startswith("found")
    corner = Image.open(out).convert("L").getpixel((5, 5))
    assert corner > 200  # the dark table is cropped away and the paper is white


def test_auto_paint_fills_closed_shapes():
    import pytest

    pytest.importorskip("cv2")
    from app.drawing_tools import auto_paint

    folder = Path(tempfile.mkdtemp())
    (folder / "in.png").write_bytes(_drawing_png())  # a circle (closed) on a stick
    filled = auto_paint(folder / "in.png", folder / "out.png", seed=1)
    assert filled == 1
    r, g, b = Image.open(folder / "out.png").convert("RGB").getpixel((200, 100))  # inside the circle
    assert (r, g, b) != (255, 255, 255)


def test_two_drawings_become_one_scene_with_a_pair_prompt(monkeypatch):
    asked = []
    _fake_gemini(monkeypatch, "The dog runs over and catches the ball.", asked)
    res = client.post("/api/jobs", data={"mode": "character"},
                      files=[("image", ("a.png", _drawing_png(), "image/png")),
                             ("image2", ("b.png", _drawing_png(), "image/png"))])
    job = client.get(f"/api/jobs/{res.json()['id']}").json()
    assert (job["status"], job["kind"], job["drawings"]) == ("done", "scene", 2)
    assert "two separate drawings side by side" in asked[0]["contents"][0]["parts"][1]["text"]
    assert [s["title"] for s in job["steps"]][:3] == ["Clean up photo", "Combine the two drawings", "Understand the drawing"]


def test_animal_kind_walks_on_four_legs(monkeypatch):
    import httpx

    from app.config import settings

    sent = {}

    def fake_post(url, **kwargs):
        sent.update(kwargs["data"])
        return httpx.Response(200, content=_gif_bytes(), headers={"X-Motion": "animal_walk"},
                              request=httpx.Request("POST", url))

    monkeypatch.setattr(settings, "character_animator", "animated_drawings_api")
    monkeypatch.setattr(settings, "ad_service_url", "http://character")
    monkeypatch.setattr(httpx, "post", fake_post)
    res = client.post("/api/jobs", files={"image": ("d.png", _drawing_png(), "image/png")}, data={"mode": "animal"})
    job = client.get(f"/api/jobs/{res.json()['id']}").json()
    assert sent == {"motion": "animal_walk"} and job["kind"] == "animal" and job["status"] == "done"


def test_guesses_sound_and_music_come_from_gemini(monkeypatch):
    import httpx

    from app.config import settings

    reply = ('{"subject": "a rocket", "guesses": ["a rocket", "a pencil", "a carrot"], "kind": "scene",'
             ' "motion_prompt": "The rocket blasts off.", "sound": "whoosh", "music": "epic"}')

    def fake_post(url, **kwargs):
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": reply}]}}]},
                              request=httpx.Request("POST", url))

    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(httpx, "post", fake_post)
    res = client.post("/api/jobs", files={"image": ("d.png", _drawing_png(), "image/png")}, data={"mode": "auto"})
    job = client.get(f"/api/jobs/{res.json()['id']}").json()
    assert job["guesses"] == ["a rocket", "a pencil", "a carrot"]
    assert (job["sound"], job["music"]) == ("whoosh", "epic")


def test_failed_paint_does_not_fail_the_job(monkeypatch):
    from app import drawing_tools

    def broken(*args, **kwargs):
        raise RuntimeError("no OpenCV")

    monkeypatch.setattr(drawing_tools, "auto_paint", broken)
    res = client.post("/api/jobs", files={"image": ("d.png", _drawing_png(), "image/png")},
                      data={"mode": "scene", "paint": "true"})
    job = client.get(f"/api/jobs/{res.json()['id']}").json()
    paint_step = next(s for s in job["steps"] if s["title"] == "Colour it in")
    assert job["status"] == "done" and paint_step["status"] == "failed"
