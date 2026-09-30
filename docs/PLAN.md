# Doodle Alive: Workshop Plan

**Pitch:** someone draws on paper, takes a photo with their phone, and a few seconds later the drawing moves as a GIF or video.

**Status at workshop start:** the skeleton (M0) is done and tested. The whole loop works with an offline mock animator. Real AI models plug in without changing the API or the UI.

---

## 1. How it works

```
 Phone browser (frontend/)                 Laptop: FastAPI (backend/)
 ┌──────────────────────┐   POST /api/jobs  ┌──────────────────────────────────────────┐
 │ take photo           │ ───────────────▶ │ 1. preprocess.py  fix rotation, resize,   │
 │ pick mode / prompt   │                  │                   boost contrast          │
 │ poll status          │ ◀─────────────── │ 2. prompting.py   Claude: what is it?     │
 │ show GIF / MP4       │  GET /api/jobs/id │                   character or scene?     │
 └──────────────────────┘                  │                   motion prompt           │
                                           │ 3. providers/     animate it              │
                                           │    mock               Pillow wobble GIF   │
                                           │    animated_drawings  Meta, figures only  │
                                           │    hf_space           Wan 2.2 / LTX video │
                                           │    (if a real model fails → mock + warning)│
                                           └──────────────────────────────────────────┘
```

| Mode | Used when | Model | Output | Speed |
|---|---|---|---|---|
| **character** | a human-like figure (head, body, 2 arms, 2 legs) | Meta AnimatedDrawings (MIT) | GIF, keeps the child's exact lines | ~10–30 s |
| **scene** | anything else (rocket, cat, house…) | Wan 2.2 TI2V-5B (Apache 2.0) or LTX-Video | MP4, AI-generated motion | 1–10 min, depending on GPU/queue |
| **auto** | default | Claude picks `character` or `scene` | – | +2–5 s |

### Code map

| File | What it does |
|---|---|
| `backend/app/main.py` | API routes; serves the frontend and `/media` |
| `backend/app/jobs.py` | in-memory job store, pipeline, fallback to mock |
| `backend/app/preprocess.py` | photo clean-up |
| `backend/app/prompting.py` | Claude vision → `{subject, kind, motion_prompt}` |
| `backend/app/providers/*.py` | one file per animator; register new ones in `providers/__init__.py` |
| `backend/app/config.py` + `.env` | every setting lives here |
| `frontend/` | plain HTML/CSS/JS mobile page, no build step |
| `scripts/run.ps1` | one-command start; prints the URL to open on phones |
| `scripts/inspect_space.py` | prints a Hugging Face Space's API parameters |

### API contract (frozen; frontend and backend can work in parallel)

`POST /api/jobs` takes multipart form data: `image` (file, required), `mode` (`auto|character|scene`, default `auto`), `prompt` (text, optional). It replies **202** with a Job.

`GET /api/jobs/{id}` returns the Job:

```json
{ "id": "b0d30d751248", "mode": "auto", "status": "queued|running|done|failed",
  "step": "Animating (hf_space)", "subject": "a rocket", "kind": "scene",
  "prompt": "The rocket blasts off...", "animator": "hf_space",
  "output_url": "/media/b0d30d751248/animation.mp4",
  "warning": null, "error": null }
```

`GET /api/health` returns which animators are configured and whether Claude is enabled.

Error responses: 400 for a bad mode or a non-image file, 413 for files over 15 MB, 404 for an unknown job.

---

## 2. Milestones

| # | Milestone | Done when | Est. |
|---|---|---|---|
| **M0** | Skeleton | ✅ Phone → photo → mock GIF works; 6 tests pass | done |
| **M1** | One real model works | a real drawing produces a real AI animation on the laptop | 1–2 h |
| **M2** | Smart prompt | with `ANTHROPIC_API_KEY` set, auto mode picks the right model and writes a fitting prompt | 30–60 min |
| **M3** | Polish | cleaner photos, motion picker, gallery, nicer UI | rest of the time |
| **M4** | Demo ready | backups recorded, demo script rehearsed twice | last 30 min |

**Rule:** `main` must always be demo-able. The mock fallback exists so the app never shows a broken screen.

---

## 3. Task board

Suggested split for 3–5 people. Tasks in the same milestone can run in parallel.

### Track A: AI models (backend)

**T1 · Scene mode via Hugging Face Space (M1)** ⭐ highest value
1. Create a free account at https://huggingface.co and a **read** token. Put it in `HF_TOKEN`.
2. Choose a Space. Candidates: `Wan-AI/Wan-2.2-5B`, or search the Spaces list for "LTX Video" / "Wan 2.2 I2V". Prefer ones marked **ZeroGPU** or **Running**.
3. Run `python scripts/inspect_space.py <space-id>`, then copy the endpoint name and parameter names into `HF_API_NAME`, `HF_IMAGE_PARAM`, `HF_PROMPT_PARAM`, and `HF_EXTRA_PARAMS` (for example duration or steps; keep clips short, 2–3 s).
4. Set `SCENE_ANIMATOR=hf_space`, restart, and upload a drawing.
- *Done when:* an MP4 plays on the phone and `animator` is `hf_space`.
- ⚠ **On this laptop, TLS to huggingface.co failed** (`SSLV3_ALERT_HANDSHAKE_FAILURE`), probably a corporate proxy or filter. Try a phone hotspot or the workshop Wi-Fi, or run the backend on a teammate's machine.
- ⚠ Free ZeroGPU quota is only a few minutes of GPU time per day per account. Log in with `HF_TOKEN`; a PRO account gets far more. Several teammates' tokens can be rotated.

**T3 · Plan B GPU: Google Colab (M1, only if T1 is blocked)**
Run LTX-Video (fastest) or Wan 2.2 TI2V-5B on a free Colab T4 with `diffusers`, wrapped in a tiny Gradio app with `share=True`. Point `HF_SPACE_ID` at the public `*.gradio.live` URL, because `gradio_client` accepts full URLs too. Nothing else changes.

**T4 · Character mode via Meta AnimatedDrawings (M1)**
1. `git clone https://github.com/facebookresearch/AnimatedDrawings` and follow its README to create **its own** Python env. It needs an older Python (3.8–3.11 per the README), so it can't share our 3.14 venv.
2. Start its TorchServe model server. The README uses Docker; Docker isn't installed on this laptop, so install Docker Desktop or run on a teammate's machine / WSL.
3. Check that `python examples/image_to_animation.py drawings/garlic.png garlic_out` works inside the repo.
4. Set `AD_REPO_DIR` and `AD_PYTHON` (that env's `python.exe`) and `CHARACTER_ANIMATOR=animated_drawings`.
- *Done when:* a stick figure drawing dances on the phone.
- Fallback without Docker: the free web demo at https://sketch.metademolab.com shows the same result, which is good for backup recordings.

**T5 · Motion picker for characters (M3):** expose `dab | jumping | wave_hello | zombie` (the repo's `examples/config/motion/*.yaml`) as an optional `motion` form field and pass it to `AnimatedDrawingsAnimator`. This is a non-breaking change: an optional field.

### Track B: Prompt intelligence

**T6 · Enable Claude captioning (M2)**
Put an Anthropic API key in `ANTHROPIC_API_KEY`. The default model is `claude-opus-5`, with server-side refusal fallback enabled. `prompting.py` already asks for `subject`, `kind`, and `motion_prompt`.
- *Done when:* a figure drawing goes to `character` and a rocket goes to `scene` with a rocket-specific prompt.
- Tune `INSTRUCTIONS` in `prompting.py`: for example, ask for a "story" line to show under the video, or add a style ("keep crayon texture").
- Optional free alternative: Gemini's free tier. Add it as a second function behind the same `describe_drawing()`.

### Track C: Image quality

**T2 · Paper detection and clean-up (M3)**
In `preprocess.clean_photo`: `pip install opencv-python-headless`. Find the biggest 4-corner contour (the sheet of paper), apply `warpPerspective` to flatten it, then use an adaptive threshold or background whitening so shadows disappear.
- *Done when:* a photo taken at an angle on a wooden table comes out as a flat white sheet.
- Also a good task: crop tightly around the drawing, which helps Wan/LTX a lot.

### Track D: Frontend and demo

**T7 · UI polish (M3):** a fun loading animation with a fake progress bar showing `step`, a before/after view (photo next to animation), and a "share" button using the Web Share API (`navigator.share`).

**T8 · Gallery / big screen (M3):** `GET /api/jobs` (new endpoint) lists finished jobs, and a `frontend/wall.html` page auto-refreshes and shows everyone's animations on the projector. This is a big crowd-pleaser at demos.

**T9 · Phone access (M1):** check that phones on the workshop Wi-Fi can open `http://<laptop-ip>:8000` (`run.ps1` prints it). If the Wi-Fi blocks device-to-device traffic, use `ngrok http 8000` or `cloudflared tunnel --url http://localhost:8000` and share the HTTPS link as a QR code.

**T10 · Demo prep (M4):** see section 5.

---

## 4. Risks and fallbacks

| Risk | Likelihood | Fallback |
|---|---|---|
| HF Space queue is slow or out of quota | High | Rotate tokens; switch Space; Colab (T3); mock auto-fallback |
| Corporate network blocks huggingface.co (seen on this laptop) | Seen | Phone hotspot / workshop Wi-Fi / another laptop |
| AnimatedDrawings install is painful (Docker, old Python) | Medium | Scene mode for everything; record backups via the Meta web demo |
| Workshop Wi-Fi blocks phone → laptop | Medium | ngrok / cloudflared tunnel (T9) |
| Video takes minutes on stage | High | Start a real job early; show pre-recorded backups meanwhile |
| Bad photo (dark, shadows, angled) | Medium | Thick marker on white paper, good light; T2 clean-up |

---

## 5. Demo script (≈3 min)

1. **Hook (20 s):** "Every kid's drawing wants to move. Let's make that happen."
2. **Live character (60 s):** a volunteer draws a stick person → photo → it dances. This is fast and reliable.
3. **Live scene (60 s):** draw a rocket/fish/cat → photo → while it generates, explain the flow (Claude works out what it is and writes the motion prompt → Wan 2.2 makes the video) → show the result, or a pre-recorded backup if the queue is slow.
4. **Wall (20 s):** show everyone's animations on the gallery page.
5. **Close (20 s):** the stack is all free/open models, and a fallback keeps the demo from breaking.

**Backup kit (prepare in M4):** 3 drawings on paper, their photos, and their finished GIF/MP4s saved in `backend/data/outputs/`, plus a screen recording of the whole flow.

---

## 6. Working agreements

- Branch per task: `feat/T1-hf-space`, `feat/T2-paper-detect`, …; merge to `main` only when it runs.
- Run `pytest` in `backend/` before merging. Add a test when you add an endpoint.
- Settings go in `.env`, never in code; never commit `.env` or tokens.
- New model = new file in `providers/` + one line in `PROVIDERS`. Don't change the Job JSON shape; add fields only.
