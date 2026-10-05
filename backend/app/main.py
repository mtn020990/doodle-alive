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
from .jobs import create_job, get_job, run_job

logging.basicConfig(level=logging.INFO)

ALLOWED_MODES = {"auto", "character", "scene"}
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


@app.post("/api/jobs", status_code=202)
async def submit_job(
    background: BackgroundTasks,
    image: UploadFile = File(...),
    mode: str = Form("auto"),
    prompt: str | None = Form(None),
) -> dict:
    if mode not in ALLOWED_MODES:
        raise HTTPException(400, f"mode must be one of {sorted(ALLOWED_MODES)}")
    if not (image.content_type or "").startswith("image/"):
        raise HTTPException(400, "Please upload an image")
    data = await image.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Image is too large (max 15 MB)")

    upload_path = settings.uploads_dir / f"{uuid.uuid4().hex}{Path(image.filename or '').suffix or '.jpg'}"
    upload_path.write_bytes(data)

    job = create_job(mode)
    background.add_task(run_job, job, upload_path, (prompt or "").strip() or None)
    return job.to_dict()


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
