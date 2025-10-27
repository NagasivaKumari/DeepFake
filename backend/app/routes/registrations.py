from fastapi import APIRouter, HTTPException
from pathlib import Path
import json

router = APIRouter()

DATA_PATH = Path(__file__).resolve().parents[1] / "data"
DATA_PATH.mkdir(parents=True, exist_ok=True)
MEDIA_FILE = DATA_PATH / "registered_media.json"

def load_media():
    if not MEDIA_FILE.exists():
        return []
    try:
        return json.loads(MEDIA_FILE.read_text())
    except Exception:
        return []

@router.get("/api/registrations")
def list_registrations():
    """Return all registered media (dummy local file store)."""
    return load_media()
