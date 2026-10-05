"""Per-job pipeline trace, shown as a flow chart in the UI ("How it was made").

The pipeline opens a step; anything running inside it (an LLM call, a provider
switching Hugging Face keys) can add a line with `note("...")`. Outside a job
`note` does nothing, so providers can call it freely.
"""
import time
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import asdict, dataclass, field

_current: ContextVar["Step | None"] = ContextVar("current_step", default=None)


@dataclass
class Step:
    icon: str
    title: str
    model: str = ""                         # what did the work, e.g. "Gemini · gemini-flash-lite-latest"
    status: str = "running"                 # running | done | failed
    outputs: dict = field(default_factory=dict)  # what it decided/produced, shown as key: value
    notes: list[str] = field(default_factory=list)
    duration_ms: int | None = None

    def to_dict(self) -> dict:
        return asdict(self)


@contextmanager
def step(steps: list[Step], icon: str, title: str, model: str = ""):
    """Append a step, time it, and mark it done or failed (the exception still propagates)."""
    current = Step(icon, title, model)
    steps.append(current)
    token = _current.set(current)
    started = time.monotonic()
    try:
        yield current
        current.status = "done"
    except Exception as exc:
        current.status = "failed"
        current.notes.append(f"Error: {_short(exc)}")
        raise
    finally:
        current.duration_ms = int((time.monotonic() - started) * 1000)
        _current.reset(token)


def note(text: str) -> None:
    current = _current.get()
    if current is not None:
        current.notes.append(text)


def set_model(text: str) -> None:
    """Relabel the current step, e.g. when a provider ends up on a different server."""
    current = _current.get()
    if current is not None:
        current.model = text


def _short(exc: Exception) -> str:
    text = str(exc).strip().splitlines()
    return (text[0] if text else type(exc).__name__)[:240]
