---
name: verify
description: How to launch Doodle Alive and drive the mobile web UI end-to-end for verification.
---

# Verify Doodle Alive

## Launch
- Build: `cd frontend; npm run build` (or `.\scripts\run.ps1 -Build`).
- `backend/.env` may hold real keys (HF quota, Gemini). For verification start uvicorn from `backend/` with overrides,
  which win over `.env`: `SCENE_ANIMATOR=mock CHARACTER_ANIMATOR=mock ANTHROPIC_API_KEY= GEMINI_API_KEY= HF_TOKEN=
  HF_TOKENS=Alice:hf_fake1,Bob:hf_fake2 GPU_SERVERS= AD_SERVICE_URL= ADMIN_PIN=4321 .venv/Scripts/python.exe -m uvicorn app.main:app --port 8000`.
  Jobs then finish in ~1s with the mock animator.
- Health: `GET /api/health`. Job details incl. `mode`/`prompt`/`duration`/`painted`/`drawings`/`steps`: `GET /api/jobs/{id}`.

## Drive (no browser MCP here)
- Install `playwright-core` in the scratchpad (not the repo) and launch system Chrome with
  `args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']` (live camera),
  context `{ viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, locale: 'vi-VN', permissions: ['camera'] }`.
- Pick a photo: `page.locator('input[type=file]:not([capture])').first()`; the second drawing is `input[type=file][capture]` last.
- Flow: "Tiếp tục" → mode radios (default "Người / nhân vật") / idea chips / textarea / "Độ dài video" slider /
  "Tô màu trước" switch → "Làm phép thôi!" → wait for "Tada!". "Kiểm tra prompt trước" opens the review panel.
- Guess game and sound need an LLM; with the mock, inject them by fulfilling `**/api/jobs/*` with `guesses`/`sound`/`music` added.
- Admin: open `/#admin`, PIN from `ADMIN_PIN`.
- Separate backend (Azure-like): run a second uvicorn on :8001 with `CORS_ORIGINS=http://localhost:8000` and route
  `**/config.js` to `window.DOODLE_CONFIG = { apiBaseUrl: 'http://localhost:8001/' }`.
- Check `document.documentElement.scrollWidth` vs `innerWidth` for horizontal overflow.

## Gotchas
- Git Bash heredocs containing Vietnamese text fail to parse; write scripts with the Write tool.
- Playwright's `postData()` doesn't expose the multipart fields; read them back from `GET /api/jobs/{id}`.
- Don't proxy uploads through `route.fetch` (it corrupts the multipart image); use a real second server instead.
- Sheets (sketchpad, camera) take ~1s to animate out; wait before asserting the dialog is gone.
