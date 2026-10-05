"""Doodle Alive API. Run from backend/:  uvicorn app.main:app --host 0.0.0.0 --port 8000"""
import asyncio
import logging
import secrets
import uuid
from pathlib import Path

import httpx

from fastapi import BackgroundTasks, Body, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .gpu_servers import servers as gpu_servers
from .hf_keys import pool as hf_key_pool
from .jobs import compose_prompt, create_job, get_job, run_job
from .preprocess import clean_photo
from .prompting import MAX_PROMPT_CHARS, describe_drawing
from .providers.animated_drawings_api import motion_for
from .trace import step

logging.basicConfig(level=logging.INFO)

ALLOWED_MODES = {"auto", "character", "scene"}
MIN_DURATION, MAX_DURATION = 1, 10  # seconds of AI video
MAX_UPLOAD_BYTES = 15 * 1024 * 1024

settings.uploads_dir.mkdir(parents=True, exist_ok=True)
settings.outputs_dir.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Doodle Alive")

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["GET", "POST"], allow_headers=["*"]
    )


@app.get("/api/health")
def health() -> dict:
    character_service_ok = None
    if settings.ad_service_url:
        try:
            character_service_ok = httpx.get(f"{settings.ad_service_url.rstrip('/')}/health", timeout=3).status_code == 200
        except httpx.HTTPError:
            character_service_ok = False
    return {
        "ok": True,
        "scene_animator": settings.scene_animator,
        "character_animator": settings.character_animator,
        "claude_enabled": bool(settings.anthropic_api_key),
        "gemini_enabled": bool(settings.gemini_api_key),
        "hf_keys": len(hf_key_pool.status()),
        "gpu_servers": len(gpu_servers.usable()),
        "character_service_ok": character_service_ok,  # None = not configured
    }


def _check_mode(mode: str) -> None:
    if mode not in ALLOWED_MODES:
        raise HTTPException(400, f"mode must be one of {sorted(ALLOWED_MODES)}")


def _save_upload(image: UploadFile, data: bytes) -> Path:
    if not (image.content_type or "").startswith("image/"):
        raise HTTPException(400, "Please upload an image")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Image is too large (max 15 MB)")
    upload_path = settings.uploads_dir / f"{uuid.uuid4().hex}{Path(image.filename or '').suffix or '.jpg'}"
    upload_path.write_bytes(data)
    return upload_path


@app.post("/api/jobs", status_code=202)
async def submit_job(
    background: BackgroundTasks,
    image: UploadFile = File(...),
    mode: str = Form("auto"),
    prompt: str | None = Form(None),
    duration: float | None = Form(None),  # optional; absent = the video model's default length
    final_prompt: str | None = Form(None),  # optional; a prompt reviewed via /api/describe, used as-is
    subject: str | None = Form(None),  # optional; goes with final_prompt, for display
) -> dict:
    _check_mode(mode)
    if duration is not None and not MIN_DURATION <= duration <= MAX_DURATION:
        raise HTTPException(400, f"duration must be between {MIN_DURATION} and {MAX_DURATION} seconds")
    upload_path = _save_upload(image, await image.read())

    job = create_job(mode)
    job.duration = duration
    reviewed = (final_prompt or "").strip()[:MAX_PROMPT_CHARS] or None
    background.add_task(run_job, job, upload_path, (prompt or "").strip() or None,
                        reviewed, (subject or "").strip()[:120] or None)
    return job.to_dict()


@app.post("/api/describe")
def describe(
    image: UploadFile = File(...),
    mode: str = Form("auto"),
    prompt: str | None = Form(None),  # the person's idea, as on /api/jobs
    current: str | None = Form(None),  # the prompt shown on the page, for change / different
    change: str | None = Form(None),  # e.g. "the ball rolls on the ground"
    different: bool = Form(False),  # write a new take on `current`
) -> dict:
    """Write (or rewrite) the motion prompt so the person can review it before animating."""
    _check_mode(mode)
    upload_path = _save_upload(image, image.file.read())
    clean_path = upload_path.with_name(f"{upload_path.stem}-clean.png")
    trace: list = []
    try:
        clean_photo(upload_path, clean_path)
        with step(trace, "🧠", "describe") as current_step:
            idea = (prompt or "").strip() or None
            info = describe_drawing(clean_path, idea, current=current, change=change, different=different)
    finally:
        upload_path.unlink(missing_ok=True)
        clean_path.unlink(missing_ok=True)
    kind = mode if mode in ("character", "scene") else info.kind
    rewrite = bool((current or "").strip() and (change or different))
    # A rewrite of the reviewed text replaces it as-is; a first description gets composed like a job's.
    final = info.motion_prompt if rewrite else compose_prompt(info, kind, idea)
    warnings = list(current_step.notes)
    if different and info.source == "default":
        warnings.append("A different idea needs Gemini, so the prompt is unchanged")
    result = {"subject": info.subject, "kind": kind, "prompt": final, "source": info.source,
              "warning": " ".join(warnings) or None}
    if kind == "character":
        result["motion"] = motion_for(final)[0]
    return result


@app.get("/api/jobs/{job_id}")
def job_status(job_id: str) -> dict:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, "Job not found")
    return job.to_dict()


async def _check_admin_pin(pin: str | None) -> None:
    if not settings.admin_pin:
        raise HTTPException(404, "Admin is switched off (set ADMIN_PIN)")
    if not secrets.compare_digest((pin or "").encode(), settings.admin_pin.encode()):
        await asyncio.sleep(1)  # slows down PIN guessing
        raise HTTPException(401, "Wrong PIN")


@app.get("/api/admin/hf-keys")
async def list_hf_keys(x_admin_pin: str | None = Header(None)) -> dict:
    await _check_admin_pin(x_admin_pin)
    return {"keys": hf_key_pool.status()}


@app.post("/api/admin/hf-keys/active")
async def set_active_hf_key(name: str = Body(..., embed=True), x_admin_pin: str | None = Header(None)) -> dict:
    await _check_admin_pin(x_admin_pin)
    if not hf_key_pool.set_active(name):
        raise HTTPException(404, f"No key named {name!r}")
    return {"keys": hf_key_pool.status()}


@app.get("/api/admin/gpu-servers")
async def list_gpu_servers(x_admin_pin: str | None = Header(None)) -> dict:
    await _check_admin_pin(x_admin_pin)
    return {"servers": gpu_servers.status()}


@app.post("/api/admin/gpu-servers")
async def set_gpu_server_url(
    name: str = Body(...), url: str = Body(""), x_admin_pin: str | None = Header(None)
) -> dict:
    await _check_admin_pin(x_admin_pin)
    if url.strip() and not url.strip().startswith("https://"):
        raise HTTPException(400, "The link must start with https:// (the gradio.live link the notebook prints)")
    if not gpu_servers.set_url(name, url):
        raise HTTPException(404, f"No GPU server named {name!r}")
    return {"servers": gpu_servers.status()}


app.mount("/media", StaticFiles(directory=settings.outputs_dir), name="media")
app.mount("/", StaticFiles(directory=settings.frontend_dir, html=True), name="frontend")
