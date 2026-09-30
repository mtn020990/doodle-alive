# Doodle Alive

Draw on paper, take a photo with your phone, and get it back as an animation.

- **Resuming work? Read [docs/HANDOFF.md](docs/HANDOFF.md) first.** It covers model research, current status, blockers, and step-by-step setup guides.
- Team plan, task board and demo script: **[docs/PLAN.md](docs/PLAN.md)**
- Presentation deck (how it works + tech stack): **docs/Doodle-Alive-Overview.pptx**

## Quick start (Windows)

```powershell
cd C:\Ngan\Project\doodle-alive
.\scripts\run.ps1
```

The first run creates `backend/.venv`, installs dependencies, and copies `.env.example` to `.env`. Then:

- **Laptop:** open http://localhost:8000
- **Phone:** open the `http://<laptop-ip>:8000` URL that the script prints. The phone must be on the same Wi-Fi, and you may need to allow Python through the Windows firewall.

With no configuration, the app uses the **mock** animator, an offline bouncing/wobbling GIF, so the whole flow works right away.

## Turn on real AI

Edit `backend/.env`:

| Want | Set |
|---|---|
| Scene videos (Wan 2.2 / LTX via Hugging Face) | `HF_TOKEN`, `SCENE_ANIMATOR=hf_space`, Space params (run `python scripts/inspect_space.py`) |
| Dancing figures (Meta AnimatedDrawings) | `AD_REPO_DIR`, `AD_PYTHON`, `CHARACTER_ANIMATOR=animated_drawings` |
| Auto-detect + smart motion prompt (Claude) | `ANTHROPIC_API_KEY` |

If a real model fails, the app shows the mock animation with a warning instead of an error.

## Tests

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

## Layout

```
backend/app/        FastAPI app, pipeline, providers/
backend/tests/      API tests (use the mock animator)
frontend/           mobile web page (no build step)
scripts/            run.ps1, inspect_space.py
docs/PLAN.md        workshop plan
```
