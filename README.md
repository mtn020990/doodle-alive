# Doodle Alive

Draw on paper, take a photo with your phone, and get it back as an animation.

- **Using the app or running the workshop? Read [docs/USER-GUIDE.md](docs/USER-GUIDE.md)**: every feature and how to use it.
- **Resuming work? Read [docs/HANDOFF.md](docs/HANDOFF.md) first.** It covers model research, current status, blockers, and step-by-step setup guides.
- Team plan, task board and demo script: **[docs/PLAN.md](docs/PLAN.md)**
- Presentation deck (how it works + tech stack): **docs/Doodle-Alive-Overview.pptx**

## Quick start (Windows)

```powershell
cd C:\Ngan\Project\doodle-alive
.\scripts\run.ps1
```

The first run creates `backend/.venv`, installs dependencies, copies `.env.example` to `.env`, and builds the frontend (needs [Node.js](https://nodejs.org) 20+). Run `.\scripts\run.ps1 -Build` after changing the frontend. Then:

- **Laptop:** open http://localhost:8000
- **Phone:** open the `http://<laptop-ip>:8000` URL that the script prints. The phone must be on the same Wi-Fi, and you may need to allow Python through the Windows firewall.

With no configuration, the app uses the **mock** animator, an offline bouncing/wobbling GIF, so the whole flow works right away.

## Turn on real AI

Edit `backend/.env`:

| Want | Set |
|---|---|
| Scene videos (LTX-Video via Hugging Face; defaults verified) | `HF_TOKEN`, `SCENE_ANIMATOR=hf_space` |
| Dancing figures (Meta AnimatedDrawings) | Azure: `-Part character` + `CHARACTER_ANIMATOR=animated_drawings_api`. Local: `AD_REPO_DIR`, `AD_PYTHON`, `CHARACTER_ANIMATOR=animated_drawings` |
| Auto-detect + smart motion prompt (Claude, paid) | `ANTHROPIC_API_KEY` |
| Same, free (Gemini free tier, used when no Claude key) | `GEMINI_API_KEY` from https://aistudio.google.com/apikey |
| More free scene videos when HF quota runs out | `HF_TOKENS=Name:hf_…,Name:hf_…` (tried in turn), then run [notebooks/ltx_gpu_server.ipynb](notebooks/ltx_gpu_server.ipynb) on Kaggle/Colab and paste its link in the admin panel |

Admin panel: open the page with `#admin` at the end and enter `ADMIN_PIN`. It shows each Hugging Face key's quota status, lets you switch keys, and takes the Kaggle/Colab GPU links. Every job also shows a "How it was made" flow chart under the result.

If a real model fails, the app shows the mock animation with a warning instead of an error.

## Deploy to Azure

Use this when the local network blocks Hugging Face. It needs only the Azure CLI; the Docker image is built in Azure.

```powershell
az login
.\scripts\deploy-azure.ps1 -Part backend    # settings/keys come from backend\.env; prints the backend URL
copy frontend\.env.example frontend\.env    # set API_BASE_URL=<backend URL>
.\scripts\deploy-azure.ps1 -Part frontend   # prints the frontend URL to open on phones
.\scripts\deploy-azure.ps1 -Part character  # optional: Meta AnimatedDrawings service (first build is slow)
```

The backend runs on Azure Container Apps (1 replica, since jobs are in memory). The frontend is an Azure Storage static website: `-Part frontend` builds it (needs Node.js) and writes the backend URL into `config.js`. `/data` is an Azure Files share, so outputs and the Hugging Face cache (`HF_HOME`) persist. `-Part character` adds a second, internal-only container app; redeploy `-Part backend` afterwards so it gets `AD_SERVICE_URL`. Re-run any part to redeploy. Logs: `az containerapp logs show -n doodle-alive-api -g rg-doodle-alive --follow`.

## Frontend development

React 19 + TypeScript + Vite + Tailwind CSS v4, with Motion for animation. Vietnamese and English UI.

```powershell
cd frontend
npm install
npm run dev        # http://localhost:5173 (also on the LAN); proxies /api and /media to :8000
npm run typecheck; npm run lint; npm run build
```

Keep the backend running (`.\scripts\run.ps1`) while using `npm run dev`.

```
frontend/src/
  app/              App, providers, layout (header, bottom nav)
  features/
    create/         3-step wizard: drawing → motion (+ check prompt) → magic
    camera/         live camera that finds the paper and snaps by itself
    draw/           on-screen sketchpad
    game/           "Guess my drawing" while the animation is made
    pipeline/       "How it was made" flow chart
    result/         animation view, before/after, save/share
    library/        creations saved in this browser (localStorage)
    admin/          #admin panel: Hugging Face keys, free GPU servers
  shared/           api client, i18n (vi/en), sound, ui primitives, hooks, utils
  styles/           Tailwind theme tokens and animations
```

## Tests

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

## Layout

```
backend/app/        FastAPI app, pipeline, providers/
character-service/  Meta AnimatedDrawings as an HTTP service (Docker, deployed to Azure)
notebooks/          free Kaggle/Colab GPU server running LTX-Video (same API as the HF Space)
backend/tests/      API tests (use the mock animator)
frontend/           React mobile web app (built to frontend/dist)
scripts/            run.ps1, inspect_space.py
docs/PLAN.md        workshop plan
```
