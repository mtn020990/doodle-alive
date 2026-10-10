# Frontend handoff

This note is for the next agent working on `frontend/` (for example GitHub Copilot). It explains what the frontend is, how it is organised, the rules it follows, what has been done so far, and what is still open. Read it before changing anything. For the backend, models and deployment, see `../docs/HANDOFF.md` and `../README.md`. For what the app does from a user's point of view, see `../docs/USER-GUIDE.md`.

_Last updated: 2026-10-10._

## 1. What it is

Doodle Alive is a mobile web app: a child or adult draws on paper (or on screen), takes a photo, and the backend turns it into an animated GIF or video. The frontend is a **React 19 + TypeScript + Vite + Tailwind CSS v4** app with Motion (framer-motion) for animation and lucide-react for icons. The UI is bilingual, Vietnamese and English, and works on phones first (from 320 px wide), tablets and desktop, in light and dark mode.

The old vanilla page (`app.js`, `camera.js`, `sound.js`, `styles.css`) was replaced. Every feature it had was ported. You can still read the old code with `git show 4143ce8:frontend/app.js` (and `camera.js`, `sound.js`) if you need to check the original behaviour.

## 2. Commands

Run these from `frontend/`:

| Task | Command |
|---|---|
| Install | `npm install` (CI and scripts use `npm ci`) |
| Dev server | `npm run dev` → http://localhost:5173, also on the LAN; proxies `/api` and `/media` to `http://localhost:8000` (override with `BACKEND_URL`) |
| Type check | `npm run typecheck` (strict mode) |
| Lint | `npm run lint` (ESLint flat config, react-hooks rules) |
| Format | `npm run format` (Prettier + `prettier-plugin-tailwindcss` sorts classes) |
| Build | `npm run build` → `frontend/dist` |

The backend serves `frontend/dist` (see `backend/app/config.py`, `FRONTEND_DIR`). From the repo root, `.\scripts\run.ps1` builds the frontend when `dist` is missing or `package-lock.json` changed, then starts the API on :8000. Use `-Build` to force a rebuild.

**Before you finish any change, `typecheck`, `lint` and `build` must all be clean.**

## 3. Deployment and runtime config

- `public/config.js` sets `window.DOODLE_CONFIG = { apiBaseUrl: '' }` and is loaded as a plain script, not bundled. Empty means "same site": the backend serves the page.
- `scripts/deploy-azure.ps1 -Part frontend` builds the app, copies `dist`, and rewrites `config.js` with `API_BASE_URL` from `frontend/.env`. It then uploads to an Azure Storage static website. The backend needs `CORS_ORIGINS` set to the frontend's origin (the script does this).
- In the code, call `apiUrl(path)` from `shared/api/client.ts` for every API and `/media` URL, so a separate backend origin keeps working. Never hard-code `/api/...` in `fetch`.
- The `Dockerfile` (repo root) builds the frontend in a `node:22-slim` stage and copies `dist` into the Python image.

## 4. Architecture

```
src/
  main.tsx                 entry
  app/                     composition only: App (tabs + #admin route), providers, layout (Header, BottomNav, AppShell), hooks/useHash
  features/
    create/                the 3-step wizard: Source → Motion (+ Review) → Generating → Result/Error
      components/          CreateFlow (step switch), SourceStep, SourceOption, SecondDrawing, MotionStep, ModeCard,
                           MotionChips, ReviewStep, GeneratingStep, Stepper, StickyActions, BackButton, ErrorAlert
      hooks/               useCreateFlow (reducer state machine + actions), useJobRunner (submit + poll, cancellable)
      lib/                 stages (backend step → progress stage), motionPresets (idea chips per mode, usesDuration),
                           mappers (job → result/draft), upload (shrink photos before upload)
      types.ts             FlowState, MotionChoice, PickedImage, FlowError, …
    camera/                live camera that snaps when the phone is held still (useSteadyCamera)
    draw/                  on-screen sketchpad + lazy-loaded SamplePicker: 18 local drawings, rasterised to PNG for main/second image
    game/                  "Guess my drawing" while the job runs (score in localStorage key doodleGameScore)
    pipeline/              "How it was made" flow chart from job.steps
    result/                ResultView (media, before/after compare, save, share, sound toggle)
    library/               finished animations kept in this browser (localStorage, max 30)
    admin/                 #admin panel: Hugging Face keys, free GPU server links (PIN in sessionStorage)
  shared/
    api/                   client (apiUrl, ApiError, requestJson), jobs (submitJob, describeDrawing, pollJob), admin, types
    i18n/                  LangProvider, useI18n, LanguageToggle, locales/vi.ts + en.ts
    sound/                 Web Audio sound effects + music (no audio files), SoundToggle
    ui/                    design-system primitives: Button, LinkButton, IconButton, Card, Chip, Badge, Alert, Spinner,
                           Sheet (full-screen modal), Segmented, Switch, TextInput, TextArea
    hooks/                 useObjectUrl, useLocalStorage
    lib/                   cn (clsx + tailwind-merge), image (shrink, thumbnail, canvasToBlob), storage (safe local/session storage)
    assets/                illustrations (Mascot, Sparkle, Squiggle as React SVG)
  styles/                  index.css (Tailwind import, @theme tokens, light/dark palette, utilities), animations.css
```

**Import rule (keep it):** `app → features → shared`, one way only. A feature may import another feature only through that feature's `index.ts`, for example `@/features/result`, never `@/features/result/components/...`. `shared` never imports from `features` or `app`. Use the `@/` alias for `src/`.

## 5. Conventions

- **Styling:** Tailwind v4 is configured in CSS, in `styles/index.css`; there is no `tailwind.config`.
  - Colours are semantic tokens with light and dark values: `bg-paper`, `bg-card`, `bg-sunken`, `text-ink`, `text-muted`, `border-line`, `coral`, `grape`, `mint`, `sun`, `sky`, `text-coral-ink`, `text-sun-ink`, `danger-*`, `warn-*`. Use these tokens, not hex values.
  - The look is a "sticker": the `sticker` utility (a thick ink outline) plus `shadow-sticker-sm|shadow-sticker|shadow-sticker-lg`, and `pressable` for the press-down effect. Radius `rounded-blob`. Fonts `font-display` (Baloo 2) and `font-sans` (Be Vietnam Pro), both self-hosted via @fontsource.
- **Reuse `shared/ui` before writing markup.** Use `TextInput`/`TextArea` for fields, `Segmented` for single choice, `Switch` for on/off, `Badge` for the yellow subject label, and `Sheet` for full-screen overlays. Buttons never wrap their label (`whitespace-nowrap`).
- **Mobile:**
  - Touch targets ≥ 44–48 px, inputs ≥ 16 px font (avoids iOS zoom), `100dvh`.
  - Safe areas via the `pt-safe`/`pb-safe` utilities. The main call-to-action sits in `StickyActions`, above the floating bottom nav (`--nav-space`).
  - `<main>` has `overflow-x-clip`. Check that nothing scrolls sideways at 320 px.
- **i18n:**
  - Every visible string goes through `t('key')`, with Vietnamese in `locales/vi.ts` and English in `locales/en.ts`. `en.ts` must have the same keys; `satisfies Record<MessageKey, string>` enforces it at compile time.
  - Keys are grouped by prefix (`source.*`, `draw.*`, `motion.*`, …). Use `{name}` placeholders.
  - Text coming from the backend (subject, guesses, flow chart, warnings) stays as the backend sends it (English).
  - Prompts sent to the AI models stay in English: see `motionPresets.ts`.
- **Accessibility:**
  - Radio-like choices use `role="radiogroup"`/`role="radio"` + `aria-checked`. Icon-only buttons need `label`/`aria-label`.
  - Progress uses `role="progressbar"` with a label. Status changes go in `aria-live`.
  - `MotionConfig reducedMotion="user"`, plus a reduced-motion rule in `animations.css`.
- **Storage:** never touch `localStorage`/`sessionStorage` directly; use `shared/lib/storage.ts` (`readText/writeText/readJson/writeJson`). They never throw (private mode, full quota).
- **Errors in the create flow:** use `FlowError` (`{ kind: 'network' } | { kind: 'server', message }`), shown with `ErrorAlert`. A `TypeError` from `fetch` means the server is unreachable.
- **Comments:** short, and only to explain *why* something is done. The code is in English.

## 6. Backend contract (do not break)

The job JSON is add-only (see `../docs/HANDOFF.md`). Types live in `shared/api/types.ts`.

- `POST /api/jobs` (multipart) takes these fields; all are optional except `image`:
  - `image`, `image2`, `paint`
  - `mode`: `auto|character|animal|scene`
  - `prompt` (the typed idea), `duration` (seconds of AI video, 2–10 in the UI)
  - `final_prompt` (a reviewed prompt, used as-is); `subject`, `motion`, `sound`, `music` go with it
- `GET /api/jobs/{id}` returns `status`, `step`, `subject`, `kind`, `prompt`, `animator`, `output_url`, `warning`, `error`, `duration`, `motion`, `guesses`, `sound`, `music`, `drawings`, `painted`, `steps[]`. The frontend polls every 1.5 s. `features/create/lib/stages.ts` maps the `step` strings ("Cleaning up photo", "Looking at your drawing", "Animating (x)", "Done") to progress stages.
- `POST /api/describe` takes the same drawing fields plus `mode`, `prompt`, `current`, `change`, `different`. It returns a draft: `subject`, `kind`, `prompt`, `warning`, `guesses`, `sound`, `music`, `motion`, `motion_reason`.
- Admin (header `X-Admin-Pin`):
  - `GET /api/admin/hf-keys` and `POST /api/admin/hf-keys/active {name}`
  - `GET /api/admin/gpu-servers` and `POST /api/admin/gpu-servers {name, url}` (the URL must be `https://`)
- Figures (`character`) can only play 5 recorded moves: wave, jump, jumping jacks, zombie walk, dab. Animals only walk. Only AI video (`scene`, `auto`, or two drawings) takes a duration; use `usesDuration(mode, pair)`.

## 7. What was done (history)

1. **Rebuilt the UI in React** (first commit `69ffc24`, cherry-picked onto main and merged as `fc58cc2`, PR #1).
   - New design (warm paper, sticker style, mascot), a 3-step wizard with stepper, bottom tab bar (Create / Library), VI/EN toggle, dark mode, PWA manifest and icons.
   - Added features the old page didn't have: on-screen sketchpad, idea chips, before/after compare slider, Web Share, local library.
2. **Ported every feature from the old page on main into React:**
   - Live camera, second drawing, colour-in, 4 modes with "person" as the default, video length slider.
   - Check / edit the prompt (`/api/describe`: apply a change, different idea), "edit prompt & remake".
   - Guess game, "How it was made" flow chart, synthesised sound, `#admin` panel, runtime `API_BASE_URL`.
   - Also updated `Dockerfile`, `.dockerignore`, `deploy-azure.ps1 -Part frontend` and `docs/USER-GUIDE.md` (button names).
3. **Review and refactor** (in `fc58cc2`). Fixed 11 bugs:
   - A late `/api/describe` reply jumped to the wrong step or drawing; it is now aborted on navigation.
   - Music kept looping after leaving a result; it now stops on unmount and tab switch.
   - Share is now prepared ahead of time for Safari.
   - Guesses from the previous drawing leaked into the next one.
   - Admin: the server row went stale, and old data stayed after a 401.
   - The camera got stuck when the photo could not be encoded.
   - `ImageBitmap`s were never closed.
   - A missing media file showed a blank box; it now shows a message.
   - Cancel during the photo shrink didn't cancel.
   - `useObjectUrl` broke under StrictMode.
   - `npm ci` didn't rerun when the lockfile changed.

   The refactor itself: added the shared primitives in `shared/ui`, the `sun-ink` token, `shared/lib/storage.ts`, a slimmer `useCreateFlow` with pure helpers in `create/lib`, and removed unused i18n keys and exports.
4. **Sketchpad and result layout** (`cb8a644`):
   - The drawing paper now fills the free space instead of being a fixed square. Its shape is measured once when the pad opens (`paperFor` in `DrawPad.tsx`), and canvas pixels are stored per pad.
   - Added shape tools: line, circle, square, triangle, star, heart. Drag to size; circles and squares stay even, within the dragged box (`draw/lib/shapes.ts`, `ToolPicker.tsx`).
   - The result animation was cropped on short windows. It now fits: the height limit `SCREEN_FIT = max-h-[55dvh]` is on the `<img>/<video>` itself, with `object-contain`.
5. **Uncommitted right now:** a small change in `features/result/components/AnimationMedia.tsx` sizes videos with `h-auto w-auto max-w-full` (images keep `w-full`). It was made outside this session. Review and commit it, or revert it.

6. **Sample drawings:** Source has a Sample drawings tile and replacement chip. The second drawing also has a sample button. `draw/lib/samples.ts` contains eighteen original SVG drawings (person, baby, cartoon robot, cat, dog, dinosaur, rabbit, elephant, lion, bear, turtle, bird, rocket, flower, fish, butterfly, house, car); `SamplePicker` is loaded only when opened and converts the selected artwork to a 768×768 PNG through the existing image upload pipeline. No backend changes or external assets are required.
   - Samples have coloured/outline variants. Source's Draw on image action opens the main image in `DrawPad`; the second drawing has its own edit pencil. Blank Draw now remains separate. The editor loads the image at its original aspect ratio (max 1400 px), replays strokes over it, and exports the composite PNG. Erasing paints white over both the base image and strokes. Clear is an undoable operation, including restoration of the base image. Closing discards edits; Done saves them. Decode/export failures show translated errors.
   - Verified both variants of the first six samples: outline PNGs contain no coloured pixels. Editor checks covered erasing the original artwork, adding strokes, undo/clear restoration, pixel-exact PNG export, reopening saved edits, cancellation during export, decode/export error and retry, and independently editing the second drawing. VI/EN mobile light/dark layouts and rotation preserved the artwork; edited pairs completed with the mock backend.
   - Verified all eighteen samples, replacement/removal, close/cancel during conversion, error/retry, photo upload and sketchpad. Mobile checks covered Vietnamese at 320×640 (light) and English at 390×844 (dark), with no horizontal overflow. Single and paired samples completed with mock animators; real AI services were not tested.

## 8. Not verified yet / known gaps

- **Not tested yet:**
  - A real phone, especially Share on iPhone (the file is prefetched, then `navigator.share({ files })`) and the live camera's auto-snap. Headless tests only covered "Snap now", because the fake camera is never steady.
  - Real AI: Gemini/Claude, Hugging Face video, AnimatedDrawings. With the mock animator, the backend returns no `guesses` or `sound`, so the game and sound were only tested with injected data.
  - Docker build and Azure deploy were never run after these changes.
- **Share and live camera need HTTPS (or localhost).** On `http://<laptop-ip>:8000` the Share button is hidden and the live camera tile is not shown; that is expected.
- **Known UI rough edges:**
  - At 320×640 the sticky action bar plus the bottom nav cover a large part of the screen.
  - The header title wraps to two lines at 320 px.
  - Without Gemini, "Apply" in the review panel returns the prompt unchanged and gives no feedback ("Different idea" does show a warning).
- **Sketchpad:** shapes are outlines only, with no fill tool. Colouring comes from the backend's "Colour it in first" option. There is no redo and no zoom.
- Bundle is ~478 kB JS (~152 kB gzip), mostly React + Motion. `LazyMotion` could trim it.

## 9. How to verify a change (runtime, not just tests)

Follow `../.claude/skills/verify/SKILL.md`. In short:

1. Build (`npm run build`). Start the backend from `backend/` with overrides, so the real keys in `backend/.env` are not used:
   `SCENE_ANIMATOR=mock CHARACTER_ANIMATOR=mock ANTHROPIC_API_KEY= GEMINI_API_KEY= HF_TOKEN= HF_TOKENS=Alice:hf_fake1,Bob:hf_fake2 GPU_SERVERS= AD_SERVICE_URL= ADMIN_PIN=4321 .venv/Scripts/python.exe -m uvicorn app.main:app --port 8000`
   With the mock animator, jobs finish in about a second.
2. Drive the real UI with Playwright (install `playwright-core` outside the repo) using the system Chrome:
   - Mobile context: 390×844 and 320×640, `isMobile`, `hasTouch`, locale `vi-VN` / `en-US`.
   - Live camera: launch Chrome with `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`.
   - Pick a photo with `input[type=file]:not([capture])`.
   - Read the submitted fields back from `GET /api/jobs/{id}`; Playwright cannot see multipart bodies.
   - Inject `guesses`/`sound`/`music` by fulfilling `**/api/jobs/*`.
   - To test a separate backend, run a second uvicorn on :8001 with `CORS_ORIGINS=http://localhost:8000` and route `**/config.js` to point at it.
3. Check at least:
   - No horizontal overflow (`scrollWidth === innerWidth`) at 320 px.
   - Both languages, with no raw `key.name` showing.
   - Dark mode.
   - The main flows: person, animal, AI video with length, two drawings, check prompt → review → go, remake, cancel, admin.

**Gotchas:**
- Git Bash heredocs mangle Vietnamese text and backslashes; write script files with an editor or tool instead.
- Sheets (sketchpad, camera) take about 1 s to animate out.
- `route.fetch` corrupts multipart uploads, so don't proxy uploads through it.
- In headless Chrome the AudioContext clock does not run. To check that music stopped, count the long `setInterval` loops, not oscillators.

## 10. Ideas for next steps

- Fill tool or "filled shape" toggle in the sketchpad; redo; stickers/stamps; more shapes (arrow, cloud, sun).
- Show the AI's guesses and the sound picker in the review panel; let the person choose the music mood.
- Library: rename an item, share several items, export everything.
- Make the sticky action bar collapse when scrolling on short screens.
- Offline-friendly PWA (service worker for the shell and fonts).
- Add Playwright end-to-end tests to the repo, based on the recipe above.
