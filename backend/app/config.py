"""Settings loaded from environment / backend/.env."""
import json
import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent

load_dotenv(BACKEND_DIR / ".env")


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


@dataclass
class Settings:
    data_dir: Path = field(default_factory=lambda: Path(_env("DATA_DIR") or BACKEND_DIR / "data"))
    frontend_dir: Path = PROJECT_DIR / "frontend"

    scene_animator: str = field(default_factory=lambda: _env("SCENE_ANIMATOR", "mock"))
    character_animator: str = field(default_factory=lambda: _env("CHARACTER_ANIMATOR", "mock"))

    hf_token: str = field(default_factory=lambda: _env("HF_TOKEN"))
    # Team keys, tried in turn on quota errors: "Ngan:hf_aaa,Minh:hf_bbb". Overrides HF_TOKEN.
    hf_tokens: str = field(default_factory=lambda: _env("HF_TOKENS"))
    # Own free GPU servers tried after the HF keys: "Kaggle=https://x.gradio.live,Colab=https://y.gradio.live".
    # Usually pasted in the admin panel instead, since the links change on every notebook restart.
    gpu_servers: str = field(default_factory=lambda: _env("GPU_SERVERS"))
    hf_space_id: str = field(default_factory=lambda: _env("HF_SPACE_ID", "Lightricks/ltx-video-distilled"))
    hf_api_name: str = field(default_factory=lambda: _env("HF_API_NAME", "/image_to_video"))
    hf_image_param: str = field(default_factory=lambda: _env("HF_IMAGE_PARAM", "input_image_filepath"))
    hf_prompt_param: str = field(default_factory=lambda: _env("HF_PROMPT_PARAM", "prompt"))
    hf_extra_params: dict = field(default_factory=lambda: json.loads(_env("HF_EXTRA_PARAMS") or "{}"))

    ad_repo_dir: str = field(default_factory=lambda: _env("AD_REPO_DIR"))
    ad_python: str = field(default_factory=lambda: _env("AD_PYTHON", "python"))
    ad_service_url: str = field(default_factory=lambda: _env("AD_SERVICE_URL"))
    ad_motion: str = field(default_factory=lambda: _env("AD_MOTION", "random"))

    anthropic_api_key: str = field(default_factory=lambda: _env("ANTHROPIC_API_KEY"))
    claude_model: str = field(default_factory=lambda: _env("CLAUDE_MODEL", "claude-opus-5"))

    gemini_api_key: str = field(default_factory=lambda: _env("GEMINI_API_KEY"))
    gemini_model: str = field(default_factory=lambda: _env("GEMINI_MODEL", "gemini-flash-lite-latest"))

    # PIN for the admin panel (page URL + #admin). Empty = admin API switched off.
    admin_pin: str = field(default_factory=lambda: _env("ADMIN_PIN"))

    # Comma-separated origins allowed to call the API from another site (the hosted frontend).
    cors_origins: list[str] = field(
        default_factory=lambda: [o.strip().rstrip("/") for o in _env("CORS_ORIGINS").split(",") if o.strip()]
    )

    @property
    def uploads_dir(self) -> Path:
        return self.data_dir / "uploads"

    @property
    def outputs_dir(self) -> Path:
        return self.data_dir / "outputs"


settings = Settings()
