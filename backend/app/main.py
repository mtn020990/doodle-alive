"""Doodle Alive API. Run from backend/:  uvicorn app.main:app --host 0.0.0.0 --port 8000"""
import logging
import uuid
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles

from .config import settings
from .jobs import create_job, get_job, run_job

logging.basicConfig(level=logging.INFO)

ALLOWED_MODES = {"auto", "character", "scene"}
MAX_UPLOAD_BYTES = 15 * 1024 * 1024

settings.uploads_dir.mkdir(parents=True, exist_ok=True)
settings.outputs_dir.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Doodle Alive")


@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "scene_animator": settings.scene_animator,
        "character_animator": settings.character_animator,
        "claude_enabled": bool(settings.anthropic_api_key),
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


app.mount("/media", StaticFiles(directory=settings.outputs_dir), name="media")
app.mount("/", StaticFiles(directory=settings.frontend_dir, html=True), name="frontend")
