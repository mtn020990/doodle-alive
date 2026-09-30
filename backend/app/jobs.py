"""In-memory job store + the drawing -> animation pipeline.

In-memory is fine for a demo (one server process). Restarting the server
forgets job status, but files already in data/outputs stay.
"""
import logging
import threading
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path

from .config import settings
from .preprocess import clean_photo
from .prompting import describe_drawing
from .providers import get_animator

log = logging.getLogger(__name__)


@dataclass
class Job:
    id: str
    mode: str                     # requested: auto | character | scene
    status: str = "queued"        # queued | running | done | failed
    step: str = ""                # human-readable progress for the UI
    subject: str | None = None
    kind: str | None = None       # resolved: character | scene
    prompt: str | None = None
    animator: str | None = None
    output_url: str | None = None
    warning: str | None = None    # e.g. real model failed, mock used instead
    error: str | None = None

    def to_dict(self) -> dict:
        return asdict(self)


_jobs: dict[str, Job] = {}
_lock = threading.Lock()


def create_job(mode: str) -> Job:
    job = Job(id=uuid.uuid4().hex[:12], mode=mode)
    with _lock:
        _jobs[job.id] = job
    return job


def get_job(job_id: str) -> Job | None:
    return _jobs.get(job_id)


def run_job(job: Job, upload_path: Path, user_prompt: str | None) -> None:
    out_dir = settings.outputs_dir / job.id
    try:
        job.status = "running"
        job.step = "Cleaning up photo"
        clean = clean_photo(upload_path, out_dir / "input.png")

        job.step = "Looking at your drawing"
        info = describe_drawing(clean)
        job.subject = info.subject
        job.kind = job.mode if job.mode in ("character", "scene") else info.kind
        job.prompt = user_prompt or info.motion_prompt

        name = settings.character_animator if job.kind == "character" else settings.scene_animator
        job.step = f"Animating ({name})"
        output = _animate_with_fallback(job, name, clean, out_dir)

        job.animator = job.animator or name
        job.output_url = f"/media/{job.id}/{output.relative_to(out_dir).as_posix()}"
        job.status = "done"
        job.step = "Done"
    except Exception as exc:
        log.exception("Job %s failed", job.id)
        job.status = "failed"
        job.error = str(exc)


def _animate_with_fallback(job: Job, name: str, image: Path, out_dir: Path) -> Path:
    try:
        return get_animator(name).animate(image, job.prompt or "", out_dir)
    except Exception as exc:
        if name == "mock":
            raise
        log.warning("Animator %s failed (%s); falling back to mock", name, exc)
        job.warning = f"{name} failed: {exc}. Showing the offline animation instead."
        job.animator = "mock"
        return get_animator("mock").animate(image, job.prompt or "", out_dir)
