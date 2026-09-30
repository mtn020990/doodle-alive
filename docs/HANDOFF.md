# Doodle Alive: Handoff Notes

Start here when you pick the project back up. This file has everything decided and learned so far: the model research, what's built, what's verified, known blockers, and step-by-step guides for the next tasks.

- Task board, milestones and demo script: [PLAN.md](PLAN.md)
- Quick start: [../README.md](../README.md)

_Last updated: 2026-09-29_

---

## 1. The idea

Someone draws on paper and takes a photo with their phone. The app turns the drawing into an animated GIF or video. It's built for an AI workshop demo, so it has to be free, quick to build, and must never break on stage.

---

## 2. Model research: free options

### Option A: Meta Animated Drawings, for human-like figures
- Repo: https://github.com/facebookresearch/AnimatedDrawings. Licence: **MIT** (free, including commercial use).
- It finds the figure, cuts it out of the background, fits a skeleton, and plays a motion on it (dance, walk, wave, jump). The output is a GIF or MP4.
- **Good:** quick, gives the same result every time, and keeps the child's exact lines. It runs locally and a GPU is optional.
- **Limits:** it only works on human-like figures with a clear head, body, 2 arms and 2 legs. It can't animate cars, houses or animals well.
- **Setup:** Python in its own environment (the README asks for an older Python). It also needs a TorchServe model server, which the README runs with Docker.
- A free browser demo is available at https://sketch.metademolab.com. Use it for backup recordings.

### Option B: image-to-video diffusion models, for anything
These take the photo plus a text prompt and generate a short video.

| Model | Licence | Notes |
|---|---|---|
| **Wan 2.2** (Alibaba) https://github.com/Wan-Video/Wan2.2 | Apache 2.0 | Best quality. `Wan-AI/Wan2.2-TI2V-5B` is the lighter model, and there's an official Hugging Face Space for it. `Wan-AI/Wan2.2-I2V-A14B` is higher quality but heavy. A 720p clip takes about 9 minutes on an RTX 4090. There's also `Wan2.2-Animate-14B`. |
| **LTX-Video / LTX-2.x** (Lightricks) https://huggingface.co/Lightricks/LTX-Video | Open weights; check the licence before commercial use | Fastest, close to real time. Works with the `diffusers` library. Newer versions: LTX-2, 2.3, 2.5. |

Free ways to run them:
- **Hugging Face Spaces:** call them from Python with `gradio_client`. Free, but the ZeroGPU quota is small (a few minutes of GPU per day per account) and queues can be long. A logged-in token gets more.
- **Google Colab free T4 GPU:** workable for LTX-Video or Wan 5B with memory offloading. Slow.

### Decision
Use **both**. Character mode uses Animated Drawings, which is reliable and quick. Scene mode uses Wan 2.2 or LTX, which is impressive. An LLM step (Claude, with Gemini's free tier as an optional alternative) looks at the drawing, picks the mode, and writes the motion prompt, so users never have to type anything.

---

## 3. What is built (milestone M0)

| Part | File(s) | Status |
|---|---|---|
| Mobile web page: camera, mode picker, optional prompt, loading/error/result, Save | `frontend/index.html`, `app.js`, `styles.css` | ✅ works on the laptop; **not yet tried on a real phone** |
| API: submit a job, poll its status, health check, serve media | `backend/app/main.py` | ✅ tested |
| Pipeline and in-memory job store; falls back to mock if a real model fails | `backend/app/jobs.py` | ✅ tested |
| Photo clean-up: fix rotation, resize to 1024 px, auto-contrast | `backend/app/preprocess.py` | ✅ basic version; paper detection is task T2 |
| Claude step: `{subject, kind, motion_prompt}` | `backend/app/prompting.py` | ⚠ written, **never run with a real key** |
| `mock` animator: bouncing/wobbling GIF with Pillow | `providers/mock.py` | ✅ tested |
| `hf_space` animator: Hugging Face Space through `gradio_client` | `providers/hf_space.py` | ⚠ written, **never run** (network blocked, see §5) |
| `animated_drawings` animator: runs the repo's script as a subprocess | `providers/animated_drawings.py` | ⚠ written, **never run** (no Docker/install, see §5) |
| Tests (6) | `backend/tests/test_api.py` | ✅ `6 passed` |
| One-command start script, prints the phone URL | `scripts/run.ps1` | ✅ |
| Space API inspector | `scripts/inspect_space.py` | ⚠ couldn't reach Hugging Face from this laptop |

**Verified by hand:** with the server running, I uploaded a JPEG of a rocket in scene mode. The job finished and the app served a 16-frame, 250 KB GIF from `/media/<id>/animation.gif`.

---

## 4. How to run

```powershell
cd C:\Ngan\Project\doodle-alive
.\scripts\run.ps1          # first run: creates backend\.venv, installs, copies .env
```
- Laptop: http://localhost:8000
- Phone: the `http://<laptop-ip>:8000` address that the script prints (same Wi-Fi; allow Python through the Windows firewall if asked)

Tests:
```powershell
cd C:\Ngan\Project\doodle-alive\backend
.\.venv\Scripts\python.exe -m pytest -q
```

Environment used: Windows 11, Python 3.14.0, Node 22 (not used), git 2.54. **Docker is not installed.**

All settings are in `backend/.env`; `backend/.env.example` explains every key. With no keys, everything runs on the mock animator.

---

## 5. Known blockers and gotchas

1. **This laptop can't reach huggingface.co.** Python fails with `httpx.ConnectError: [SSL: SSLV3_ALERT_HANDSHAKE_FAILURE]`, probably because of the corporate proxy or TLS inspection.
   - Try a phone hotspot or the workshop Wi-Fi, or run the backend on another machine.
   - If a proxy is required, set `HTTPS_PROXY` and possibly `SSL_CERT_FILE` / `REQUESTS_CA_BUNDLE` pointing at the company CA bundle.
2. **Docker is not installed.** Meta AnimatedDrawings' TorchServe server needs it (as the README describes). Install Docker Desktop, or use WSL or a teammate's machine.
3. **`gradio_client` 2.x renamed `hf_token=` to `token=`.** The code is already fixed. If you copy examples from the internet, use `token=`.
4. **Every Space has its own API.** Endpoint and parameter names differ between Spaces and can change when the Space is updated. Always run `inspect_space.py` and put the names in `.env`; don't hard-code them. The `.env.example` defaults (`/generate_video`, `image`, `prompt`) are **guesses**.
5. **The free ZeroGPU quota runs out fast.** Log in with `HF_TOKEN`, rotate teammates' tokens, or get HF PRO. Keep clips at 2–3 seconds.
6. **Jobs live in memory.** Restarting the server forgets job status, but files in `backend/data/outputs/` are kept.
7. **Inline Python in PowerShell loses double quotes.** `python -c "..."` breaks. Put test snippets in a `.py` file instead.
8. **Photo quality matters a lot.** Use a thick dark marker on white paper in good light. The basic auto-contrast leaves a faint grey rectangle around the paper; task T2 fixes that.
9. **The phone camera works over plain HTTP here,** because the page uses a file input, not `getUserMedia`. If you move to live camera preview (`getUserMedia`), phones will need **HTTPS**, so use ngrok or cloudflared.

---

## 6. Guides for the next steps

Do these in this order. Task numbers match [PLAN.md](PLAN.md).

### 6.1 T1: scene mode with Wan 2.2 or LTX on Hugging Face ⭐ do first
1. Sign up at https://huggingface.co, then go to Settings → Access Tokens and create a **Read** token.
2. In `backend/.env`, set `HF_TOKEN=hf_...`.
3. Choose a Space: start with `Wan-AI/Wan-2.2-5B`, or search the Spaces list for "Wan 2.2 I2V" or "LTX Video". Pick one that shows **Running**, ideally on ZeroGPU.
4. Inspect it:
   ```powershell
   cd C:\Ngan\Project\doodle-alive
   .\backend\.venv\Scripts\python.exe scripts\inspect_space.py Wan-AI/Wan-2.2-5B
   ```
   Find the endpoint that takes an image and a prompt. Copy its `api_name` into `HF_API_NAME` and its parameter names into `HF_IMAGE_PARAM` / `HF_PROMPT_PARAM`. Put any other required parameters in `HF_EXTRA_PARAMS` as JSON, for example `{"duration_seconds": 3}`.
5. Set `SCENE_ANIMATOR=hf_space`, restart `run.ps1`, and upload a drawing with mode "Anything else".
6. Check: the phone plays an MP4 and the result says "made with hf_space". If you see the yellow warning instead, read it; it contains the real error.

### 6.2 T3: Plan B, your own free GPU on Colab (only if T1 is blocked)
1. Open a new Colab notebook and choose Runtime → T4 GPU.
2. `pip install diffusers transformers accelerate gradio imageio[ffmpeg]`
3. Load the LTX-Video image-to-video pipeline from `diffusers` (see https://huggingface.co/docs/diffusers/api/pipelines/ltx_video) and wrap it in `gr.Interface(fn, [gr.Image(type="filepath"), gr.Textbox()], gr.Video())`. Start it with `.launch(share=True)`.
4. Copy the `https://xxxx.gradio.live` URL into `HF_SPACE_ID`, because `gradio_client` accepts full URLs. Set `HF_API_NAME=/predict` and the parameter names shown by `inspect_space.py`.
5. Colab sessions stop after a while, so keep the tab open during the demo.

### 6.3 T4: character mode with Meta AnimatedDrawings
1. Install Docker Desktop, or use a teammate's machine or WSL.
2. `git clone https://github.com/facebookresearch/AnimatedDrawings C:\Ngan\AnimatedDrawings`
3. Follow its README: create a conda env with the Python version it asks for, run `pip install -e .`, then build and start the TorchServe Docker container (port 8080).
4. Check it works inside the repo: `cd examples; python image_to_animation.py drawings/garlic.png garlic_out`. This should create `garlic_out/video.gif`.
5. In `backend/.env`:
   ```
   AD_REPO_DIR=C:\Ngan\AnimatedDrawings
   AD_PYTHON=C:\path\to\that\conda\env\python.exe
   CHARACTER_ANIMATOR=animated_drawings
   ```
6. Restart and upload a stick-figure drawing in mode "A person / figure".
7. The motion defaults to `dab` (`DEFAULT_MOTION` in `providers/animated_drawings.py`). If the repo's config paths differ in your version, fix `DEFAULT_MOTION` / `DEFAULT_RETARGET` there.

### 6.4 T6: turn on the Claude "look at the drawing" step
1. Get an Anthropic API key and set `ANTHROPIC_API_KEY=sk-ant-...` in `backend/.env`.
2. Default model: `CLAUDE_MODEL=claude-opus-5`. The code uses the beta Messages API with server-side refusal fallback (`betas=["server-side-fallback-2026-07-01"]`, `fallbacks="default"`) and `effort: low` to keep it quick.
3. Check `/api/health`: it should show `"claude_enabled": true`. A figure drawing in auto mode should give `kind: character`, and a rocket should give `scene` with a rocket-specific prompt.
4. If the call fails for any reason, the app logs the error and uses the default prompt. Check the server console.
5. To tune the output, edit `INSTRUCTIONS` in `prompting.py`.
6. If your SDK version rejects `fallbacks=`, upgrade the SDK (`pip install -U anthropic`) or remove the `betas` / `fallbacks` lines.

### 6.5 T2: paper detection
`pip install opencv-python-headless` (and add it to `requirements.txt`). Then, in `clean_photo`:
1. Convert to grayscale, blur, run Canny edge detection, and find contours.
2. Take the largest contour that simplifies to 4 corners, and apply `getPerspectiveTransform` + `warpPerspective`.
3. Apply `adaptiveThreshold`, or divide by a heavily blurred copy of the image, to whiten the background.

Keep a fallback to the current behaviour when no 4-corner contour is found.

### 6.6 Other tasks (details in PLAN.md)
- **T5:** motion picker for characters.
- **T7:** UI polish and the share button.
- **T8:** gallery wall on the projector.
- **T9:** tunnel with ngrok or cloudflared if the Wi-Fi blocks phones.
- **T10:** backup kit and rehearsals.

---

## 7. How to extend the code

- **Add a new model:** create `backend/app/providers/<name>.py` with a class that has `name = "<name>"` and `animate(image_path, prompt, out_dir) -> Path` returning a `.gif` or `.mp4` inside `out_dir`. Register it in `PROVIDERS` in `providers/__init__.py`, then choose it with `SCENE_ANIMATOR` / `CHARACTER_ANIMATOR`.
- **Add a form field:** make it optional, with a default that keeps today's behaviour, so the frontend and backend can be updated separately.
- **Job JSON:** only add fields; never rename or remove them. The frontend reads `status`, `step`, `output_url`, `warning`, `error`, `subject` and `animator`.
- **Secrets** go only in `backend/.env`, which is git-ignored. Never put them in code.

---

## 8. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Phone can't open the page | Different Wi-Fi, Windows firewall blocking Python, or the Wi-Fi isolates devices. Use `ngrok http 8000` |
| Yellow "… failed, showing offline animation" | The real model failed; the message has the reason. Check `.env` and the server console |
| `SSLV3_ALERT_HANDSHAKE_FAILURE` | Network or proxy problem (see §5.1) |
| `unexpected keyword argument 'hf_token'` | Old code snippet; use `token=` |
| Space error about missing or unknown parameters | Rerun `inspect_space.py` and fix the `HF_*` names or `HF_EXTRA_PARAMS` |
| Job stuck on "Animating (hf_space)" for minutes | Space queue or cold start. Wait, switch Space, or use Colab |
| `claude_enabled: false` | `ANTHROPIC_API_KEY` is empty, or the server wasn't restarted after editing `.env` |
| AnimatedDrawings "not set up" | `AD_REPO_DIR` is wrong, or `examples/image_to_animation.py` isn't in it |

---

## 9. Not done yet / open questions

- [ ] Try on a real phone (iOS Safari and Android Chrome).
- [ ] Get T1 working and write down the real Space parameters in `.env.example` and here.
- [ ] Decide on the LLM: Claude (needs a key) or Gemini's free tier.
- [ ] Put the project in git: `git init`, then push to a team repo so everyone can branch (branch names in PLAN.md §6).
- [ ] Check the LTX licence if the demo will ever be used commercially.
- [ ] Record the backup kit (PLAN.md §5).

---

## 10. Sources

- Meta AnimatedDrawings: https://github.com/facebookresearch/AnimatedDrawings · demo https://sketch.metademolab.com · https://www.infoq.com/news/2023/04/meta-animated-drawings/
- Wan 2.2: https://github.com/Wan-Video/Wan2.2 · https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B · https://huggingface.co/Wan-AI/Wan2.2-I2V-A14B · https://huggingface.co/Wan-AI/Wan2.2-Animate-14B · local guide https://stable-diffusion-art.com/wan-2-2-image-to-video/
- LTX-Video: https://huggingface.co/Lightricks/LTX-Video · https://huggingface.co/Lightricks/LTX-2.3 · https://ltx.io/model/open-source · diffusers docs https://huggingface.co/docs/diffusers/v0.34.0/en/api/pipelines/ltx_video
- gradio_client: https://www.gradio.app/guides/getting-started-with-the-python-client
