"""In-memory job store + the drawing -> animation pipeline.

In-memory is fine for a demo (one server process). Restarting the server
forgets job status, but files already in data/outputs stay.
"""
import logging
import threading
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path

from PIL import Image

from .config import settings
from .preprocess import clean_photo
from .prompting import DrawingInfo, describe_drawing
from .providers import get_animator
from .providers.animated_drawings_api import choose_motion
from .trace import Step, note, step

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
    duration: float | None = None  # requested video length in seconds (AI video only)
    motion: str | None = None  # dance move for figures (AnimatedDrawings plays recorded moves only)
    steps: list[Step] = field(default_factory=list)  # pipeline trace for the UI flow chart

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


def compose_prompt(info: DrawingInfo, kind: str, user_prompt: str | None) -> str:
    """The prompt sent to the animator. The LLM's text expands the typed idea (video models follow
    detailed prompts far better); figures keep the typed words up front, so they pick the dance move."""
    if user_prompt and kind == "character" and info.source != "default":
        return f"{user_prompt}. {info.motion_prompt}"
    return info.motion_prompt


def run_job(job: Job, upload_path: Path, user_prompt: str | None,
            final_prompt: str | None = None, subject: str | None = None, motion: str | None = None) -> None:
    """final_prompt: a prompt the person already reviewed on the page; used as-is, no LLM call.
    motion: the dance move suggested while reviewing (a move word in the text still wins)."""
    out_dir = settings.outputs_dir / job.id
    try:
        job.status = "running"
        job.step = "Cleaning up photo"
        with step(job.steps, "📷", "Clean up photo", "Pillow") as current:
            clean = clean_photo(upload_path, out_dir / "input.png")
            width, height = Image.open(clean).size
            current.outputs = {"size": f"{width}×{height}", "fixes": "rotation, resize, contrast"}

        job.step = "Looking at your drawing"
        if final_prompt:
            # Already described and reviewed on the page (POST /api/describe): no second LLM call.
            with step(job.steps, "🧠", "Understand the drawing", "Reviewed by you") as current:
                job.subject = subject or "your drawing"
                job.kind = job.mode if job.mode in ("character", "scene") else "scene"
                job.prompt = final_prompt
                current.outputs = {"subject": job.subject, "kind": job.kind, "your prompt": final_prompt}
                note("You checked and edited the prompt before animating")
            typed, suggested = final_prompt, motion  # the whole reviewed text is the person's
        else:
            with step(job.steps, "🧠", "Understand the drawing", _describer_label()) as current:
                info = describe_drawing(clean, user_prompt)
                if info.source == "default" and not current.notes:
                    note("No AI key set, so " + ("your idea gets style hints added" if user_prompt else "the default prompt is used"))
                current.outputs = {"subject": info.subject, "kind": info.kind}
                if user_prompt:
                    current.outputs["your idea"] = user_prompt
                    current.outputs["enriched prompt"] = info.motion_prompt
                    if info.source != "default":
                        note(f"{info.source.title()} enriched your idea into a detailed prompt "
                             "(video models follow those much better)")
                else:
                    current.outputs["motion prompt"] = info.motion_prompt
            job.subject = info.subject
            job.kind = job.mode if job.mode in ("character", "scene") else info.kind
            job.prompt = compose_prompt(info, job.kind, user_prompt)
            typed, suggested = user_prompt, info.move
        motion_reason = None
        if job.kind == "character":
            job.motion, motion_reason = choose_motion(typed, suggested, job.prompt)

        name = settings.character_animator if job.kind == "character" else settings.scene_animator
        with step(job.steps, "🔀", "Pick the animator", "Router") as current:
            why = "you chose it" if job.mode != "auto" else f"decided by {_describer_label() or 'default'}"
            current.outputs = {"mode": f"{job.kind} ({why})", "animator": _animator_label(name)}
            if user_prompt:
                current.outputs["your idea"] = user_prompt
            current.outputs["final prompt"] = job.prompt
            if job.motion:
                current.outputs["dance move"] = f"{job.motion.replace('_', ' ')} ({motion_reason})"
            if job.duration:
                current.outputs["length"] = (f"{job.duration:g} s" if job.kind == "scene"
                                             else f"{job.duration:g} s if it falls back to AI video (dances have a fixed length)")

        output = _animate_with_fallback(job, name, clean, out_dir, motion_reason)

        job.output_url = f"/media/{job.id}/{output.relative_to(out_dir).as_posix()}"
        made_by = job.steps[-1].model  # the Animate step that worked, e.g. "Kaggle GPU (free) · LTX-Video"
        with step(job.steps, "✅", "Ready", made_by) as current:
            current.outputs = {"file": "MP4 video" if output.suffix == ".mp4" else "animated GIF",
                               "size": f"{output.stat().st_size // 1024} KB"}
        job.status = "done"
        job.step = "Done"
    except Exception as exc:
        log.exception("Job %s failed", job.id)
        job.status = "failed"
        job.error = str(exc)


def _animate_with_fallback(job: Job, name: str, image: Path, out_dir: Path, motion_reason: str | None = None) -> Path:
    # The chosen model, then (e.g. AnimatedDrawings found no figure) the scene model, then the offline mock.
    candidates = [name]
    if name != "mock":
        if settings.scene_animator not in (name, "mock"):
            candidates.append(settings.scene_animator)
        candidates.append("mock")

    first_error = None
    for i, candidate in enumerate(candidates):
        job.step = f"Animating ({candidate})"
        try:
            with step(job.steps, "🎬", "Animate" if i == 0 else "Fallback: animate", _animator_label(candidate)):
                animator = get_animator(candidate)
                # Only video models take a length; the dance and mock animators have a fixed one.
                options = {"duration": job.duration} if job.duration and getattr(animator, "takes_duration", False) else {}
                if job.motion and getattr(animator, "takes_motion", False):
                    options.update(motion=job.motion, motion_reason=motion_reason)
                output = animator.animate(image, job.prompt or "", out_dir, **options)
        except Exception as exc:
            if candidate == "mock":
                raise
            log.warning("Animator %s failed (%s)", candidate, exc)
            first_error = first_error or f"{candidate} failed: {exc}"
            continue
        job.animator = candidate
        if first_error:
            instead = "Showing the offline animation instead." if candidate == "mock" else f"Made with {candidate} instead."
            job.warning = f"{first_error}. {instead}"
        return output
    raise AssertionError("unreachable: the mock animator either returns or raises")


def _describer_label() -> str:
    if settings.anthropic_api_key:
        return f"Claude · {settings.claude_model}"
    if settings.gemini_api_key:
        return f"Gemini · {settings.gemini_model}"
    return ""


def _animator_label(name: str) -> str:
    labels = {
        "hf_space": f"Hugging Face Space · {settings.hf_space_id}",
        "animated_drawings_api": "Meta AnimatedDrawings",
        "animated_drawings": "Meta AnimatedDrawings (local)",
        "mock": "Offline wobble (no AI)",
    }
    return labels.get(name, name)
