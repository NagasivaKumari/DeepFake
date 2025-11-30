from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
import json
import requests
from ..config import settings

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

def _gateway_base() -> str:
    domain = getattr(settings, 'PINATA_GATEWAY_DOMAIN', None)
    if domain:
        d = str(domain).rstrip('/')
        if d.startswith('http://') or d.startswith('https://'):
            return d
        return f"https://{d}"
    return "https://gateway.pinata.cloud"

def _cid_available(cid: str) -> tuple[bool, int | None]:
    if not cid:
        return False, None
    url = f"{_gateway_base()}/ipfs/{cid}"
    try:
        r = requests.head(url, timeout=8)  # Added timeout
        status = r.status_code
    except requests.exceptions.Timeout:
        return False, None
    except Exception:
        try:
            r = requests.get(url, headers={"Range": "bytes=0-0"}, timeout=10)  # Added timeout
            status = r.status_code
        except Exception:
            return False, None
    ok = 200 <= status < 300 or status == 206
    return ok, status


@router.get("/api/registrations")
def list_registrations(availability: str = Query("filter", description="none=don’t check, mark=include cid_available flag, filter=only available")):
    """Return registered media from local store, optionally checking IPFS availability.

    availability:
      - none   : no check
      - mark   : include field cid_available: true/false
      - filter : only return items where CID resolves via the configured gateway
    """
    items = load_media()
    if availability not in {"none", "mark", "filter"}:
        availability = "filter"

    if availability == "none":
        return items

    result = []
    for it in items:
        try:
            ok, _ = _cid_available(it.get("ipfs_cid"))
            if availability == "filter":
                if ok:
                    result.append(it)
            else:  # mark
                it["cid_available"] = bool(ok)
                result.append(it)
        except Exception:
            if availability == "mark":
                it["cid_available"] = False
                result.append(it)
            continue
    return result

@router.patch("/api/registrations/{sha256_hash}")
def update_registration(sha256_hash: str, patch: dict):
    """Update a registration by sha256_hash (status, etc)."""
    media = load_media()
    updated_items = []
    found = False
    for item in media:
        if item.get("sha256_hash") == sha256_hash:
            item.update(patch)
            updated_items.append(item)
            found = True
    if not found:
        raise HTTPException(status_code=404, detail="Registration not found")
    MEDIA_FILE.write_text(json.dumps(media, indent=2))
    return {"updated": updated_items}
