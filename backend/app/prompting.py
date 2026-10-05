"""Ask an LLM what the drawing is and how it should move.

Uses Claude if ANTHROPIC_API_KEY is set, else Gemini's free tier if GEMINI_API_KEY
is set, else a generic prompt, so the rest of the pipeline never depends on it.
"""
import base64
import json
import logging
from dataclasses import dataclass
from pathlib import Path

from .config import settings
from .trace import note

log = logging.getLogger(__name__)

STYLE = "Keep the hand-drawn style of the drawing and a static camera."
DEFAULT_PROMPT = f"The hand-drawn picture comes to life with gentle, playful motion. {STYLE}"

INSTRUCTIONS = """You are helping animate a hand-drawn picture that was photographed with a phone.
Reply with JSON only, no prose, in exactly this shape:
{"subject": "<what the drawing shows, max 8 words>",
 "kind": "character" | "scene",
 "motion_prompt": "<2-3 sentences for an image-to-video model>"}

kind = "character" only if the main subject is a single human-like figure with a
head, body, two arms and two legs; otherwise "scene".
motion_prompt: video models follow detailed prompts much better than short ones, so
name the subject as drawn, then describe clearly and concretely how it moves (e.g. a
rocket blasts off upward, trailing puffs of smoke). Always keep the hand-drawn style
and a static camera. Don't add new objects.{idea}"""

# The person's own words for the motion, when they typed some.
IDEA = """

The person asked for this motion: "{text}"
motion_prompt must show exactly that motion (don't swap it for a different one),
described in detail for this drawing."""

# Reviewing a prompt on the page: change it as asked, or write a different take.
CHANGE = """

The current motion_prompt is: "{current}"
Rewrite it with this change: "{change}". Keep everything else that still fits."""

DIFFERENT = """

The current motion_prompt is: "{current}"
Write a clearly different, fun take on the motion (still fitting the drawing and the
person's idea, if any). Don't reuse its wording."""

MAX_IDEA_CHARS = 300
MAX_PROMPT_CHARS = 1500


@dataclass
class DrawingInfo:
    subject: str
    kind: str  # "character" | "scene"
    motion_prompt: str
    source: str  # "claude" | "gemini" | "default"


def describe_drawing(
    image_path: Path,
    user_idea: str | None = None,
    current: str | None = None,
    change: str | None = None,
    different: bool = False,
) -> DrawingInfo:
    """user_idea: the motion the person typed; the LLM expands it instead of inventing one.
    current + change: rewrite the current prompt with that change; current + different: a new take.
    """
    idea = (user_idea or "").strip()[:MAX_IDEA_CHARS]
    current = (current or "").strip()[:MAX_PROMPT_CHARS]
    change = (change or "").strip()[:MAX_IDEA_CHARS]
    if current and change:
        fallback = f"{current.rstrip('.')}. {change.rstrip('.')}."
    elif current:
        fallback = current
    else:
        fallback = f"{idea.rstrip('.')}. {STYLE}" if idea else DEFAULT_PROMPT
    if settings.anthropic_api_key:
        ask, name = _ask_claude, "Claude"
    elif settings.gemini_api_key:
        ask, name = _ask_gemini, "Gemini"
    else:
        return DrawingInfo("a drawing", "scene", fallback, "default")
    # replace(), not format(): the instructions contain JSON braces.
    quote = lambda text: text.replace('"', "'")
    extra = IDEA.replace("{text}", quote(idea)) if idea else ""
    if current and change:
        extra += CHANGE.replace("{current}", quote(current)).replace("{change}", quote(change))
    elif current and different:
        extra += DIFFERENT.replace("{current}", quote(current))
    instructions = INSTRUCTIONS.replace("{idea}", extra)
    try:
        return ask(image_path, instructions, creative=different)
    except Exception as exc:  # never let captioning break the demo
        log.exception("%s captioning failed; using default prompt", name)
        note(f"{name} failed ({str(exc).splitlines()[0][:160]}), so " + ("your prompt is used as typed" if idea else "the default prompt is used"))
        return DrawingInfo("a drawing", "scene", fallback, "default")


def _ask_claude(image_path: Path, instructions: str, creative: bool = False) -> DrawingInfo:
    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    image_data = base64.standard_b64encode(image_path.read_bytes()).decode("utf-8")
    response = client.beta.messages.create(
        model=settings.claude_model,
        max_tokens=1024,
        output_config={"effort": "low"},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_data}},
                {"type": "text", "text": instructions},
            ],
        }],
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("Claude declined to describe the image")
    text = "".join(block.text for block in response.content if block.type == "text")
    return _parse_reply(text, "claude")


def _ask_gemini(image_path: Path, instructions: str, creative: bool = False) -> DrawingInfo:
    import httpx

    image_data = base64.standard_b64encode(image_path.read_bytes()).decode("utf-8")
    response = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
        headers={"x-goog-api-key": settings.gemini_api_key},
        json={
            "contents": [{"parts": [
                {"inline_data": {"mime_type": "image/png", "data": image_data}},
                {"text": instructions},
            ]}],
            # A higher temperature for "different idea", so it really is different.
            "generationConfig": {"responseMimeType": "application/json", "temperature": 1.4 if creative else 1.0},
        },
        timeout=60,
    )
    response.raise_for_status()
    parts = response.json()["candidates"][0]["content"]["parts"]
    return _parse_reply("".join(part.get("text", "") for part in parts), "gemini")


def _parse_reply(text: str, source: str) -> DrawingInfo:
    data = json.loads(text[text.find("{"): text.rfind("}") + 1])
    kind = "character" if data.get("kind") == "character" else "scene"
    return DrawingInfo(
        subject=str(data.get("subject") or "a drawing"),
        kind=kind,
        motion_prompt=str(data.get("motion_prompt") or DEFAULT_PROMPT),
        source=source,
    )
