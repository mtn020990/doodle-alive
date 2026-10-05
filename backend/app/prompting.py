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

DEFAULT_PROMPT = (
    "The hand-drawn picture comes to life with gentle, playful motion, "
    "keeping the crayon sketch style, static camera."
)

INSTRUCTIONS = """You are helping animate a hand-drawn picture that was photographed with a phone.
Reply with JSON only, no prose, in exactly this shape:
{"subject": "<what the drawing shows, max 8 words>",
 "kind": "character" | "scene",
 "motion_prompt": "<one sentence for an image-to-video model>"}

kind = "character" only if the main subject is a single human-like figure with a
head, body, two arms and two legs; otherwise "scene".
motion_prompt: describe fun, simple motion that fits the subject (e.g. a rocket
blasts off with puffs of smoke). Always keep the hand-drawn crayon style and a
static camera. Don't add new objects."""


@dataclass
class DrawingInfo:
    subject: str
    kind: str  # "character" | "scene"
    motion_prompt: str
    source: str  # "claude" | "gemini" | "default"


def describe_drawing(image_path: Path) -> DrawingInfo:
    if settings.anthropic_api_key:
        ask, name = _ask_claude, "Claude"
    elif settings.gemini_api_key:
        ask, name = _ask_gemini, "Gemini"
    else:
        return DrawingInfo("a drawing", "scene", DEFAULT_PROMPT, "default")
    try:
        return ask(image_path)
    except Exception as exc:  # never let captioning break the demo
        log.exception("%s captioning failed; using default prompt", name)
        note(f"{name} failed ({str(exc).splitlines()[0][:160]}), so the default prompt is used")
        return DrawingInfo("a drawing", "scene", DEFAULT_PROMPT, "default")


def _ask_claude(image_path: Path) -> DrawingInfo:
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
                {"type": "text", "text": INSTRUCTIONS},
            ],
        }],
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("Claude declined to describe the image")
    text = "".join(block.text for block in response.content if block.type == "text")
    return _parse_reply(text, "claude")


def _ask_gemini(image_path: Path) -> DrawingInfo:
    import httpx

    image_data = base64.standard_b64encode(image_path.read_bytes()).decode("utf-8")
    response = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
        headers={"x-goog-api-key": settings.gemini_api_key},
        json={
            "contents": [{"parts": [
                {"inline_data": {"mime_type": "image/png", "data": image_data}},
                {"text": INSTRUCTIONS},
            ]}],
            "generationConfig": {"responseMimeType": "application/json"},
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
