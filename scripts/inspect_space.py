"""Print a Hugging Face Space's API so you can fill HF_* settings in backend/.env.

Usage (from the project root, with the backend venv active):
    python scripts/inspect_space.py                       # uses HF_SPACE_ID from .env
    python scripts/inspect_space.py Lightricks/ltx-video-distilled
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from gradio_client import Client

load_dotenv(Path(__file__).resolve().parent.parent / "backend" / ".env")

space = sys.argv[1] if len(sys.argv) > 1 else os.getenv("HF_SPACE_ID", "Lightricks/ltx-video-distilled")
print(f"Connecting to {space} ...")
client = Client(space, token=os.getenv("HF_TOKEN") or None)
client.view_api(all_endpoints=True)
