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
    hf_space_id: str = field(default_factory=lambda: _env("HF_SPACE_ID", "Wan-AI/Wan-2.2-5B"))
    hf_api_name: str = field(default_factory=lambda: _env("HF_API_NAME", "/generate_video"))
    hf_image_param: str = field(default_factory=lambda: _env("HF_IMAGE_PARAM", "image"))
    hf_prompt_param: str = field(default_factory=lambda: _env("HF_PROMPT_PARAM", "prompt"))
    hf_extra_params: dict = field(default_factory=lambda: json.loads(_env("HF_EXTRA_PARAMS") or "{}"))

    ad_repo_dir: str = field(default_factory=lambda: _env("AD_REPO_DIR"))
    ad_python: str = field(default_factory=lambda: _env("AD_PYTHON", "python"))

    anthropic_api_key: str = field(default_factory=lambda: _env("ANTHROPIC_API_KEY"))
    claude_model: str = field(default_factory=lambda: _env("CLAUDE_MODEL", "claude-opus-5"))

    @property
    def uploads_dir(self) -> Path:
        return self.data_dir / "uploads"

    @property
    def outputs_dir(self) -> Path:
        return self.data_dir / "outputs"


settings = Settings()
