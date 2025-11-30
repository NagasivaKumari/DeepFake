import sys
from ..config import settings
print("[STARTUP] settings.PINATA_API_KEY:", getattr(settings, 'PINATA_API_KEY', None), file=sys.stderr)
print("[STARTUP] settings.PINATA_API_SECRET:", getattr(settings, 'PINATA_API_SECRET', None), file=sys.stderr)
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi import Depends
import requests
from ..schemas import (
    GenerateRequest, UploadResponse, RegisterRequest, VerifySignatureRequest, DeriveKeysRequest,
    BroadcastRequest, BroadcastAppRequest
)
from typing import Dict
import hashlib
import time
import secrets
import tempfile
import json
import uuid
from datetime import datetime

# Optional ML analyzer import (provide graceful fallback if missing)
try:
    # Attempt to import analyze_media_record from light_detectors if present
    from ..light_detectors import analyze_media_record  # type: ignore
except Exception:
    # Fallback stub so /trust endpoint does not raise NameError when ML module absent
    def analyze_media_record(*args, **kwargs):  # type: ignore
        return {
            'ml_score': 0.0,
            'method': 'none',
            'details': 'analyze_media_record unavailable'
        }

# Diagnostic startup print to confirm env vars are loaded when module is imported
def _mask_secret(s: str | None) -> str:
    if not s:
        return "<missing>"
    s = str(s)
    if len(s) <= 8:
        return s
    return f"{s[:4]}...{s[-4:]}"

# Generic wallet address masker (non-destructive; we always keep full address in storage and logic).
# Returned alongside full address so callers can choose which to display.
def _mask_address(addr: str | None, prefix: int = 6, suffix: int = 4) -> str | None:
    if not addr:
        return None
    a = addr.strip()
    if len(a) <= prefix + suffix + 3:  # already short, skip masking
        return a
    return f"{a[:prefix]}...{a[-suffix:]}"

print(f"[STARTUP] PINATA_API_KEY={_mask_secret(settings.PINATA_API_KEY)}")
print(f"[STARTUP] PINATA_API_SECRET={_mask_secret(settings.PINATA_API_SECRET)}")

# Try to import Lute SDK verification helper
try:
    from ..lute_client import lute_client
    LUTE_AVAILABLE = True
except Exception:
    lute_client = None
    LUTE_AVAILABLE = False

router = APIRouter(prefix="/media", tags=["media"])

# --- Embedding & similarity helpers ---
def _cosine(a: list[float] | None, b: list[float] | None) -> float:
    try:
        if not a or not b or len(a) != len(b):
            return -1.0
        num = 0.0
        da = 0.0
        db = 0.0
        for x, y in zip(a, b):
            num += x * y
            da += x * x
            db += y * y
        if da <= 0 or db <= 0:
            return -1.0
        import math
        return num / (math.sqrt(da) * math.sqrt(db))
    except Exception:
        return -1.0

def _maybe_crop_watermark(img_bytes: bytes) -> bytes:
    """Heuristically remove a bottom watermark band by INPAINTING (not cropping).

    We detect a luminance-shifted bottom band (~12% height). If detected we replace it
    with a blurred clone of the region directly above, preserving original dimensions
    so UI/layout isn't truncated. Falls back to original bytes on errors or weak signal.
    """
    try:
        from PIL import Image, ImageFilter  # type: ignore
        import io
        im = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        h = im.height
        band = max(8, int(h * 0.12))
        if band >= h or band < 8:
            return img_bytes
        bottom = im.crop((0, h - band, im.width, h))
        mid = im.crop((0, int(h * 0.44), im.width, int(h * 0.56)))
        # brightness samples
        b_small = bottom.resize((32, 8))
        m_small = mid.resize((32, 8))
        b_vals = [p[0] + p[1] + p[2] for p in b_small.getdata()]
        m_vals = [p[0] + p[1] + p[2] for p in m_small.getdata()]
        b_avg = sum(b_vals) / len(b_vals)
        m_avg = sum(m_vals) / len(m_vals)
        if abs(b_avg - m_avg) < 15:  # not distinct enough
            return img_bytes
        # Choose source region just above watermark band (same height if possible)
        src_top = max(0, h - (band * 2))
        if src_top >= h - band:  # insufficient room
            return img_bytes
        src_region = im.crop((0, src_top, im.width, h - band))
        # Resize source region to band height and apply slight blur to mask seams
        filler = src_region.resize((im.width, band)).filter(ImageFilter.GaussianBlur(radius=1.2))
        # Paste filler over bottom band
        im.paste(filler, (0, h - band))
        out = io.BytesIO()
        im.save(out, format="PNG")
        return out.getvalue()
    except Exception:
        return img_bytes


def _crop_watermark_with_info(img_bytes: bytes):
    """Return (processed_bytes, info_dict) using inpainting (no cropping).

    info_dict keys:
      - cleaned: bool (watermark region replaced)
      - original_height: int
      - band_size: int | None
      - avg_bottom: float | None
      - avg_mid: float | None
      - reason: str
      - strategy: str
    """
    info = {
        "cleaned": False,
        "original_height": None,
        "band_size": None,
        "avg_bottom": None,
        "avg_mid": None,
        "reason": "init",
        "strategy": None,
    }
    try:
        from PIL import Image, ImageFilter  # type: ignore
        import io
        im = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        h = im.height
        info["original_height"] = h
        band = max(8, int(h * 0.12))
        if band >= h or band < 8:
            info["reason"] = "band too small"
            return img_bytes, info
        bottom = im.crop((0, h - band, im.width, h))
        mid = im.crop((0, int(h * 0.44), im.width, int(h * 0.56)))
        b_small = bottom.resize((32, 8))
        m_small = mid.resize((32, 8))
        b_vals = [p[0] + p[1] + p[2] for p in b_small.getdata()]
        m_vals = [p[0] + p[1] + p[2] for p in m_small.getdata()]
        b_avg = sum(b_vals) / len(b_vals)
        m_avg = sum(m_vals) / len(m_vals)
        info["band_size"] = band
        info["avg_bottom"] = round(b_avg, 2)
        info["avg_mid"] = round(m_avg, 2)
        if abs(b_avg - m_avg) < 15:
            info["reason"] = "luminance diff below threshold"
            return img_bytes, info
        src_top = max(0, h - (band * 2))
        if src_top >= h - band:
            info["reason"] = "insufficient source region"
            return img_bytes, info
        src_region = im.crop((0, src_top, im.width, h - band))
        filler = src_region.resize((im.width, band)).filter(ImageFilter.GaussianBlur(radius=1.2))
        im.paste(filler, (0, h - band))
        out = io.BytesIO()
        im.save(out, format="PNG")
        new_bytes = out.getvalue()
        info["cleaned"] = True
        info["reason"] = "watermark band replaced"
        info["strategy"] = "clone_above_blur"
        return new_bytes, info
    except Exception as e:
        info["reason"] = f"error: {e}"
        return img_bytes, info


def _build_provenance_graph(
    *,
    query_sha256: str | None,
    canonical_strategy: str,
    query_ipfs_cid: str | None,
    query_source_url: str | None,
    best_item: dict | None,
    best_similarity: float,
    match_candidates: list[tuple[dict, float]],
    match_summaries: list[dict],
    media: list,
    similarity_threshold: float,
    graph_top_k: int,
) -> dict | None:
    """Build a trimmed provenance graph for visualization on the client."""

    def _node_identifier(item: dict | None) -> str | None:
        if not isinstance(item, dict):
            return None
        for key in ("unique_reg_key", "sha256_hash", "ipfs_cid"):
            value = item.get(key)
            if value:
                return str(value)
        return None

    TYPE_PRIORITY = {
        "query": 5,
        "anchor": 4,
        "declared": 3,
        "duplicate": 2,
        "match": 1,
        "neighbor": 1,
    }

    def _round_val(value: float | None) -> float | None:
        if value is None:
            return None
        try:
            return round(float(value), 5)
        except Exception:
            return None

    node_map: dict[str, dict] = {}
    edge_keys: set[tuple[str, str, str]] = set()
    edges: list[dict] = []

    def add_node(item: dict | None, node_type: str, *, similarity: float | None = None) -> str | None:
        node_id = _node_identifier(item)
        if not node_id:
            return None
        existing = node_map.get(node_id)
        similarity_value = _round_val(similarity)
        if existing:
            if similarity_value is not None and existing.get("similarity") is None:
                existing["similarity"] = similarity_value
            if TYPE_PRIORITY.get(node_type, 0) > TYPE_PRIORITY.get(existing.get("type", ""), 0):
                existing["type"] = node_type
            return node_id

        label = item.get("file_name") if isinstance(item, dict) else None
        if not label and node_type != "query":
            trunc = node_id[:10]
            label = f"{trunc}..." if len(node_id) > 13 else node_id

        node_map[node_id] = {
            "id": node_id,
            "label": label or ("Query Asset" if node_type == "query" else node_id),
            "type": node_type,
            "signer_address": item.get("signer_address") if isinstance(item, dict) else None,
            "sha256_hash": item.get("sha256_hash") if isinstance(item, dict) else None,
            "ipfs_cid": item.get("ipfs_cid") if isinstance(item, dict) else None,
            "file_url": item.get("file_url") if isinstance(item, dict) else None,
            "algo_tx": item.get("algo_tx") if isinstance(item, dict) else None,
            "content_key": item.get("content_key") if isinstance(item, dict) else None,
            "status": item.get("status") if isinstance(item, dict) else None,
            "generation_time": item.get("generation_time") if isinstance(item, dict) else None,
            "similarity": similarity_value,
        }
        return node_id

    def add_edge(source: str | None, target: str | None, *, similarity: float | None, relationship: str) -> None:
        if not source or not target or source == target:
            return
        key = (source, target, relationship)
        if key in edge_keys:
            return
        edge_keys.add(key)
        edges.append(
            {
                "source": source,
                "target": target,
                "relationship": relationship,
                "similarity": _round_val(similarity),
            }
        )

    # Seed suspect / query node
    suspect_id = "suspect"
    node_map[suspect_id] = {
        "id": suspect_id,
        "label": "Query Asset",
        "type": "query",
        "sha256_hash": query_sha256,
        "ipfs_cid": query_ipfs_cid,
        "source_url": query_source_url,
        "canonical_strategy": canonical_strategy,
    }

    def _push_unique(accum: list[tuple[dict, float]], item: dict | None, score: float) -> None:
        if not isinstance(item, dict):
            return
        node_id = _node_identifier(item)
        if not node_id:
            return
        if any(node_id == _node_identifier(existing) for existing, _ in accum):
            return
        accum.append((item, score))

    candidate_pairs: list[tuple[dict, float]] = []
    if isinstance(best_item, dict):
        _push_unique(candidate_pairs, best_item, best_similarity if best_similarity is not None else 1.0)

    try:
        sorted_candidates = sorted(match_candidates, key=lambda p: p[1], reverse=True)
    except Exception:
        sorted_candidates = match_candidates

    for itm, score in sorted_candidates:
        _push_unique(candidate_pairs, itm, score)
        if len(candidate_pairs) >= graph_top_k:
            break

    anchor_id = None
    if candidate_pairs:
        anchor_id = add_node(candidate_pairs[0][0], "anchor", similarity=candidate_pairs[0][1])

    unique_lookup = {
        itm.get("unique_reg_key"): itm
        for itm in media
        if isinstance(itm, dict) and itm.get("unique_reg_key")
    }

    match_id_set = set()
    for summary in match_summaries:
        if isinstance(summary, dict):
            uid = summary.get("unique_reg_key") or summary.get("ipfs_cid")
            if uid:
                match_id_set.add(str(uid))

    for item, score in candidate_pairs:
        node_id = add_node(
            item,
            "anchor" if anchor_id and _node_identifier(item) == anchor_id else ("match" if score >= similarity_threshold else "neighbor"),
            similarity=score,
        )
        if not node_id:
            continue
        add_edge(
            suspect_id,
            node_id,
            similarity=score,
            relationship="query_match" if node_id in match_id_set or score >= similarity_threshold else "query_neighbor",
        )
        if anchor_id and node_id != anchor_id:
            add_edge(anchor_id, node_id, similarity=score, relationship="similarity")

    anchor_item = candidate_pairs[0][0] if candidate_pairs else best_item
    if anchor_id and isinstance(anchor_item, dict):
        content_key = anchor_item.get("content_key")
        if content_key:
            for itm in media:
                if itm is anchor_item:
                    continue
                if itm.get("content_key") == content_key:
                    dup_id = add_node(itm, "duplicate", similarity=1.0)
                    add_edge(anchor_id, dup_id, similarity=1.0, relationship="same_content")

    if anchor_id:
        anchor_key = None
        if isinstance(anchor_item, dict):
            anchor_key = anchor_item.get("unique_reg_key")
        for itm in media:
            parent_key = itm.get("near_duplicate_of")
            if parent_key and parent_key == anchor_key:
                child_id = add_node(itm, "declared", similarity=itm.get("near_duplicate_similarity"))
                add_edge(anchor_id, child_id, similarity=itm.get("near_duplicate_similarity"), relationship="declared_lineage")

    if isinstance(anchor_item, dict):
        parent_key = anchor_item.get("near_duplicate_of")
        if parent_key:
            parent_item = unique_lookup.get(parent_key)
            parent_id = add_node(parent_item, "anchor")
            if parent_id:
                add_edge(parent_id, anchor_id or parent_id, similarity=anchor_item.get("near_duplicate_similarity"), relationship="declared_lineage")

    if len(node_map) <= 1:
        return None

    # Simplify graph visualization by limiting edge density
    edges = [
        edge for edge in edges
        if edge["relationship"] in {"query_match", "declared_lineage", "same_content"}
    ]

    return {
        "nodes": list(node_map.values()),
        "edges": edges,
        "suspect_id": suspect_id,
        "anchor_id": anchor_id,
        "threshold": similarity_threshold,
        "graph_top_k": graph_top_k,
    }


def _build_summary_charts(media: list, similarity_threshold: float) -> dict:
    """Generate summary data for pie/bar charts based on media relationships."""
    summary = {
        "query": 0,
        "anchor": 0,
        "near_match": 0,
        "duplicate": 0,
        "declared": 0,
    }

    for item in media:
        try:
            similarity = item.get("near_duplicate_similarity", 0)
            if similarity >= similarity_threshold:
                summary["near_match"] += 1
            elif item.get("type") == "duplicate":
                summary["duplicate"] += 1
            elif item.get("type") == "declared":
                summary["declared"] += 1
            elif item.get("type") == "anchor":
                summary["anchor"] += 1
            else:
                summary["query"] += 1
        except Exception:
            continue

    return summary


@router.post("/generate")
def generate_media(payload: GenerateRequest):
    """Proxy a generation request to the AI generator configured via AI_API_URL/AI_API_KEY.

    The server forwards the request and returns the generated response. No keys are embedded in client.
    """
    if not settings.AI_API_URL:
        raise HTTPException(status_code=500, detail="AI_API_URL not configured")

    headers = {}
    if settings.AI_API_KEY:
        headers["Authorization"] = f"Bearer {settings.AI_API_KEY}"

    resp = requests.post(settings.AI_API_URL, json=payload.dict(), headers=headers, timeout=120)
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"AI service error: {resp.text}")

    result = resp.json()

    # Algorand transaction logic: send 0.01 Algo from server wallet to user wallet
    algo_tx = None
    explorer_url = None
    try:
        from algosdk import account, mnemonic, transaction
        from algosdk.v2client import algod
        # Load server mnemonic (prefer DEPLOYER_MNEMONIC) and user wallet address
        server_mnemonic = getattr(settings, 'DEPLOYER_MNEMONIC', None)
        if server_mnemonic:
            server_mnemonic = server_mnemonic.replace('"', '').strip()
        user_address = getattr(payload, 'wallet_address', None)
        if not server_mnemonic or not user_address:
            raise Exception("Missing server DEPLOYER_MNEMONIC or user wallet address")

        # Setup Algod client
        algod_address = settings.ALGOD_ADDRESS
        algod_token = settings.ALGOD_TOKEN
        algod_client = algod.AlgodClient(algod_token, algod_address)

        # Derive deployer keypair (compatible with newer SDKs without to_public_key)
        clean_mnemonic = server_mnemonic.replace('"', '').strip()
        sender_private_key = mnemonic.to_private_key(clean_mnemonic)
        sender_address = account.address_from_private_key(sender_private_key)

        # Get suggested params
        params = algod_client.suggested_params()

        # Amount to send (0.01 Algo = 100000 microalgos)
        amount = 100000

        # Create transaction
        unsigned_txn = transaction.PaymentTxn(
            sender_address,
            params,
            user_address,
            amount,
            None,
            "Image generation fee"
        )

        # Sign transaction
        signed_txn = unsigned_txn.sign(sender_private_key)

        # Send transaction
        txid = algod_client.send_transaction(signed_txn)
        algo_tx = txid
        explorer_url = f"https://lora.algokit.io/testnet/transaction/{txid}"
    except Exception as e:
        print(f"Algorand transaction error: {e}")
        algo_tx = None
        explorer_url = None

    return {
        "result": result.get("result"),
        "algo_tx": algo_tx,
        "algo_explorer_url": explorer_url,
        "receiver_address_masked": _mask_address(getattr(payload, 'wallet_address', None)),
        "detail": "Image generated and transaction processed"
    }


@router.post("/upload", response_model=UploadResponse)
def upload_file(file: UploadFile = File(...)):
    # Masked debug (avoid printing full secrets)
    def _mask(s: str | None) -> str:
        if not s:
            return "<missing>"
        s = str(s)
        return s if len(s) <= 8 else f"{s[:4]}...{s[-4:]}"
        print("[UPLOAD] PINATA_API_KEY:", _mask(getattr(settings, 'PINATA_API_KEY', None)), file=sys.stderr)
        print("[UPLOAD] PINATA_API_SECRET:", _mask(getattr(settings, 'PINATA_API_SECRET', None)), file=sys.stderr)
    """Upload a file to the storage provider (Pinata/IPFS) using the configured API.

    This endpoint pins the file to Pinata and returns the IPFS CID and gateway URL.
    """
    # Use Pinata pinFileToIPFS
    if not settings.PINATA_API_KEY or not settings.PINATA_API_SECRET:
        print("[DEBUG] Pinata API keys not configured")
        raise HTTPException(status_code=500, detail="Pinata API keys not configured")

    if not file or not file.filename:
        print("[DEBUG] No file uploaded or filename missing")
        raise HTTPException(status_code=400, detail="No file uploaded or filename missing")

    pinata_url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    # Ensure the stream is at the beginning for reliable upload
    try:
        file.file.seek(0)
    except Exception:
        pass
    # Read file bytes to ensure consistent upload regardless of stream state
    try:
        content_bytes = file.file.read()
    except Exception as e:
        print(f"[ERROR] Unable to read uploaded file: {e}")
        raise HTTPException(status_code=400, detail=f"Unable to read uploaded file: {e}")
    files = {"file": (file.filename, content_bytes, file.content_type or "application/octet-stream")}
    headers = {
        "pinata_api_key": settings.PINATA_API_KEY,
        "pinata_secret_api_key": settings.PINATA_API_SECRET,
    }
    # Keep request minimal; metadata is optional and sometimes restricted by account settings
    form_data = {}
    print(f"[DEBUG] Sending file '{file.filename}' to Pinata...")
    print(f"[DEBUG] Pinata headers: {headers}")
    try:
        resp = requests.post(pinata_url, files=files, data=form_data, headers=headers, timeout=120)
        print(f"[DEBUG] Pinata response status: {resp.status_code}")
        print(f"[DEBUG] Pinata response text: {resp.text}")
    except Exception as e:
        print(f"[ERROR] Pinata upload request failed: {e}")
        raise HTTPException(status_code=502, detail=f"Pinata upload request failed: {e}")

    if resp.status_code >= 400:
        print(f"[ERROR] Pinata upload error: {resp.status_code} {resp.text}")
        raise HTTPException(status_code=502, detail=f"Pinata upload error: {resp.status_code} {resp.text}")

    try:
        data_json = resp.json()
        print(f"[DEBUG] Pinata response JSON: {data_json}")
    except Exception as e:
        print(f"[ERROR] Pinata response not JSON: {resp.text}")
        raise HTTPException(status_code=502, detail=f"Pinata response not JSON: {resp.text}")

    ipfs_hash = data_json.get("IpfsHash")
    # Build file URL using custom gateway domain if provided in settings.
    gateway_domain = getattr(settings, 'PINATA_GATEWAY_DOMAIN', None)
    if gateway_domain:
        # allow the env var to be either a full URL or just a host
        if str(gateway_domain).startswith("http://") or str(gateway_domain).startswith("https://"):
            base = str(gateway_domain).rstrip('/')
        else:
            base = f"https://{str(gateway_domain).rstrip('/')}"
        file_url = f"{base}/ipfs/{ipfs_hash}" if ipfs_hash else None
        print(f"[DEBUG] Using custom Pinata gateway domain: {base}")
    else:
        file_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}" if ipfs_hash else None
    if not ipfs_hash:
        print(f"[ERROR] Pinata response missing IpfsHash: {data_json}")
        raise HTTPException(status_code=502, detail=f"Pinata response missing IpfsHash: {data_json}")
    print(f"[DEBUG] Pinata upload successful. IPFS CID: {ipfs_hash}")
    return {"file_url": file_url, "ipfs_cid": ipfs_hash}


@router.post("/register")
def register_media(payload: RegisterRequest = None, file: UploadFile = None):
    """Register media metadata with the on-chain registry (Algorand) or store locally."""
    if not payload:
        raise HTTPException(status_code=400, detail="Payload is required for registration.")

    if not file:
        raise HTTPException(status_code=400, detail="File is required for registration.")

    # Fetch KYC info for wallet address
    user_address = getattr(payload, 'signer_address', None)
    DATA_PATH = Path(__file__).resolve().parents[1] / "data"
    KYC_FILE = DATA_PATH / "kyc.json"
    kyc_status = "not_started"
    if KYC_FILE.exists():
        try:
            raw = json.loads(KYC_FILE.read_text())
            if isinstance(raw, dict):
                kyc_records = list(raw.values())
            else:
                kyc_records = raw
            for kyc in kyc_records:
                try:
                    if kyc.get("wallet_address", "").lower() == (user_address or "").lower():
                        kyc_status = kyc.get("status", "not_started")
                        break
                except Exception:
                    continue
        except Exception:
            pass

    if not user_address:
        return {"status": "wallet_not_connected", "message": "Please connect your wallet."}

    if kyc_status != "verified":
        return {"status": "kyc_not_approved", "message": "Admin has not approved your KYC."}

    try:
        # Read image bytes from the uploaded file
        image_bytes = file.file.read()
        # Generate unique hash for the image
        unique_hash = hashlib.sha256(image_bytes).hexdigest()
        payload.sha256_hash = unique_hash

        # Proceed with registration logic if KYC is verified
        # --- Algorand transaction logic ---
        # Preferred flow: client pays the registration fee and provides `algo_tx` (txid) in the payload.
        # If the client did not provide `algo_tx`, the server will attempt to send the payment using
        # DEPLOYER_MNEMONIC (backwards-compatible). If server sending fails and ENFORCE_TX_NONCE is
        # enabled, the request will error.
        algo_tx = getattr(payload, 'algo_tx', None)
        explorer_url = getattr(payload, 'algo_explorer_url', None)
        reg_error = None

        # If strict mode is enabled, require a txid-based nonce; otherwise we'd fall back to a random nonce
        if getattr(settings, 'ENFORCE_TX_NONCE', False) and not algo_tx:
            detail = f"Algorand transaction is required for registration and was not created: {reg_error if 'reg_error' in locals() else 'client did not provide algo_tx'}"
            raise HTTPException(status_code=502, detail=detail)

        # --- Save registration data ---
        from pathlib import Path
        import json
        DATA_PATH = Path(__file__).resolve().parents[1] / "data"
        DATA_PATH.mkdir(parents=True, exist_ok=True)
        MEDIA_FILE = DATA_PATH / "registered_media.json"

        ipfs_cid = getattr(payload, 'ipfs_cid', None)
        file_url = getattr(payload, 'file_url', None)

        reg_data = payload.dict()
        reg_data["ipfs_cid"] = ipfs_cid
        reg_data["file_url"] = file_url
        reg_data["algo_tx"] = algo_tx
        reg_data["algo_explorer_url"] = explorer_url
        if 'reg_error' in locals():
            reg_data["algo_error"] = reg_error

        # --- Derive content_key (K = sha256(H)) and a unique registration key (reg_key = sha256(K||nonce)) locally ---
        try:
            sha_hex = reg_data.get('sha256_hash') or ''
            h_hex = sha_hex[2:] if sha_hex.startswith('0x') else sha_hex
            H_bytes = bytes.fromhex(h_hex)
            K_bytes = hashlib.sha256(H_bytes).digest()
            content_key_hex = K_bytes.hex()
            # Prefer txid as nonce to guarantee uniqueness across submissions; fallback to signer+time
            nonce_src = (
                algo_tx
                or f"{reg_data.get('signer_address', '')}:{time.time_ns()}:{secrets.token_hex(4)}"
            )
            nonce_bytes = nonce_src.encode('utf-8')
            reg_key_bytes = hashlib.sha256(K_bytes + nonce_bytes).digest()
            reg_key_hex = reg_key_bytes.hex()
            reg_data["content_key"] = content_key_hex
            reg_data["unique_reg_key"] = reg_key_hex
        except Exception as e:
            print(f"[WARN] Failed to compute content/registration keys: {e}")

        try:
            if MEDIA_FILE.exists():
                media = json.loads(MEDIA_FILE.read_text())
            else:
                media = []
        except Exception:
            media = []

        # Backfill email/phone for existing records if missing (handle existing legacy data)
        try:
            for item in media:
                sa = item.get("signer_address")
                if sa and (not item.get("email") or not item.get("phone")):
                    # find kyc for signer
                    if KYC_FILE.exists():
                        try:
                            raw = json.loads(KYC_FILE.read_text())
                            if isinstance(raw, dict):
                                kyc_records = list(raw.values())
                            else:
                                kyc_records = raw
                            for kyc in kyc_records:
                                if kyc.get("wallet_address", "").lower() == sa.lower():
                                    item["email"] = item.get("email") or kyc.get("email")
                                    item["phone"] = item.get("phone") or kyc.get("phone")
                                    break
                        except Exception:
                            pass
                # Compute and backfill missing content_key / unique_reg_key for legacy rows
                try:
                    if not item.get("content_key") and item.get("sha256_hash"):
                        h_hex = item.get("sha256_hash")
                        h_hex = h_hex[2:] if isinstance(h_hex, str) and h_hex.startswith('0x') else h_hex
                        H = bytes.fromhex(h_hex)
                        K = hashlib.sha256(H).hexdigest()
                        item["content_key"] = K
                    if not item.get("unique_reg_key") and item.get("content_key"):
                        # Use txn id if present, else signer:created_time
                        nonce_src = item.get("algo_tx") or f"{item.get('signer_address','')}:{time.time_ns()}:{secrets.token_hex(4)}"
                        item["unique_reg_key"] = hashlib.sha256(bytes.fromhex(item["content_key"]) + nonce_src.encode('utf-8')).hexdigest()
                except Exception:
                    pass
        except Exception:
            pass

        # --- Embedding computation (original + cropped) ---
        embedding = None
        embedding_source = None
        try:
            from ..light_detectors import get_embedding_from_bytes  # type: ignore
            # Fetch file bytes from file_url (IPFS gateway). Avoid very large files (>10MB) for now.
            if file_url:
                try:
                    r = requests.get(file_url, timeout=30)
                    if r.status_code < 400 and len(r.content) < 10_000_000:
                        orig_bytes = r.content
                        cleaned_bytes = _maybe_crop_watermark(orig_bytes)
                        use_bytes = cleaned_bytes if cleaned_bytes != orig_bytes else orig_bytes
                        embedding_source = "cleaned" if use_bytes is cleaned_bytes else "original"
                        emb_vec = get_embedding_from_bytes(use_bytes)
                        # Round floats for storage compactness
                        embedding = [round(float(x), 5) for x in emb_vec][:512]
                except Exception as e:
                    reg_data["embedding_error"] = f"fetch/embed failed: {e}"  # store diagnostic
        except Exception as e:
            reg_data["embedding_error"] = f"embedding module unavailable: {e}"

        if embedding:
            reg_data["embedding"] = embedding
            reg_data["embedding_source"] = embedding_source

        # Load existing media again if not already loaded (media variable present). Use for lineage detection.
        try:
            existing = media if isinstance(media, list) else []
            best_sim = -1.0
            best_reg = None
            if embedding:
                for item in existing:
                    try:
                        emb2 = item.get("embedding")
                        sim = _cosine(embedding, emb2)
                        if sim > best_sim:
                            best_sim = sim
                            best_reg = item
                    except Exception:
                        continue
            # Similarity threshold (tunable). High to avoid false lineage.
            if best_reg and best_sim >= 0.92:
                reg_data["near_duplicate_of"] = best_reg.get("unique_reg_key") or best_reg.get("algo_tx")
                reg_data["near_duplicate_similarity"] = round(best_sim, 5)
        except Exception:
            pass

        media.append(reg_data)
        try:
            MEDIA_FILE.write_text(json.dumps(media, indent=2))
        except Exception as e:
            import traceback as _tb, sys as _sys
            _tb.print_exc(file=_sys.stderr)
            raise HTTPException(status_code=500, detail=f"Failed to persist registration: {e}")
        # --- Prepare unsigned application call for on-chain registration ---
        unsigned_app_txn = None
        unsigned_app_txn_b64 = None
        media_key_hex = None
        reg_key_hex = None
        try:
            from ..algorand_app_utils import build_register_app_call
            # app id from settings
            app_id_str = getattr(settings, 'proofchain_app_id', None)
            if app_id_str:
                app_id = int(app_id_str)
                # Use payment txid as nonce if available to guarantee uniqueness across submissions
                nonce = algo_tx or None
                sender_addr = getattr(payload, 'signer_address', None)
                sha256_hex = getattr(payload, 'sha256_hash', None)
                cid = ipfs_cid or reg_data.get('ipfs_cid') or ''
                if sender_addr and sha256_hex and cid:
                    txn_dict, txn_b64, media_key, reg_key = build_register_app_call(
                        sender=sender_addr,
                        app_id=app_id,
                        sha256_hex=sha256_hex,
                        cid=cid,
                        nonce_str=nonce,
                    )
                    unsigned_app_txn = txn_dict
                    unsigned_app_txn_b64 = txn_b64
                    media_key_hex = media_key.hex()
                    reg_key_hex = reg_key.hex()
        except Exception as e:
            print(f"[WARN] Failed to prepare unsigned app call: {e}")

        response = {"status": "verified_locally", "payload": reg_data}
        if unsigned_app_txn:
            response["unsigned_app_call"] = {
                "txn": unsigned_app_txn,
                "txn_b64": unsigned_app_txn_b64,
                "media_key": media_key_hex,
                "reg_key": reg_key_hex,
            }
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {e}")


@router.post("/search_similar")
def search_similar(suspect: UploadFile = File(None), ipfs_cid: str | None = None, threshold: float = 0.9, top_k: int = 5):
    """Return top-K registered media items with embedding similarity above a threshold.

    Provide either an uploaded file (suspect) or an existing ipfs_cid to reuse stored file_url.
    Response: { matches: [ { unique_reg_key, signer_address, similarity, file_url, ipfs_cid } ], count }
    """
    from pathlib import Path
    DATA_PATH = Path(__file__).resolve().parents[1] / "data"
    MEDIA_FILE = DATA_PATH / "registered_media.json"
    if not MEDIA_FILE.exists():
        return {"matches": [], "count": 0}
    try:
        media = json.loads(MEDIA_FILE.read_text())
    except Exception:
        media = []
    # Acquire bytes
    suspect_bytes = None
    if suspect:
        try:
            suspect_bytes = suspect.file.read()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read suspect upload: {e}")
    elif ipfs_cid:
        # Find file_url from registry or build gateway URL
        rec = next((m for m in media if m.get("ipfs_cid") == ipfs_cid and m.get("file_url")), None)
        file_url = rec.get("file_url") if rec else None
        if not file_url:
            gateway_domain = getattr(settings, 'PINATA_GATEWAY_DOMAIN', None)
            if gateway_domain:
                if str(gateway_domain).startswith("http://") or str(gateway_domain).startswith("https://"):
                    base = str(gateway_domain).rstrip('/')
                else:
                    base = f"https://{str(gateway_domain).rstrip('/')}"
                file_url = f"{base}/ipfs/{ipfs_cid}"
            else:
                file_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_cid}"
        try:
            r = requests.get(file_url, timeout=30)
            if r.status_code >= 400:
                raise HTTPException(status_code=502, detail=f"Failed to fetch cid file: {r.status_code}")
            suspect_bytes = r.content
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Fetch error: {e}")
    else:
        raise HTTPException(status_code=400, detail="Provide suspect upload or ipfs_cid")

    # Compute embedding
    try:
        from ..light_detectors import get_embedding_from_bytes  # type: ignore
        cropped = _maybe_crop_watermark(suspect_bytes)
        use_bytes = cropped if cropped != suspect_bytes else suspect_bytes
        emb_vec = get_embedding_from_bytes(use_bytes)
        query_emb = [float(x) for x in emb_vec][:512]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding computation failed: {e}")

    # Compare
    matches = []
    for m in media:
        try:
            emb2 = m.get("embedding")
            if not isinstance(emb2, list):
                continue
            sim = _cosine(query_emb, emb2)
            if sim >= threshold:
                matches.append({
                    "unique_reg_key": m.get("unique_reg_key"),
                    "signer_address": m.get("signer_address"),
                    "similarity": round(sim, 5),
                    "file_url": m.get("file_url"),
                    "ipfs_cid": m.get("ipfs_cid"),
                    "near_duplicate_of": m.get("near_duplicate_of"),
                })
        except Exception:
            continue
    matches.sort(key=lambda x: x.get("similarity", 0), reverse=True)
    return {"matches": matches[:top_k], "count": len(matches)}


@router.get("/visualization_summary")
def visualization_summary(similarity_threshold: float = 0.9):
    """Endpoint to return summary data for pie/bar charts."""
    from pathlib import Path
    import json

    DATA_PATH = Path(__file__).resolve().parents[1] / "data"
    MEDIA_FILE = DATA_PATH / "registered_media.json"

    if not MEDIA_FILE.exists():
        return {"summary": {}, "count": 0}

    try:
        media = json.loads(MEDIA_FILE.read_text())
    except Exception:
        media = []

    summary = _build_summary_charts(media, similarity_threshold)
    return {"summary": summary, "count": sum(summary.values())}


@router.post("/classify")
def classify_media(
    suspect: UploadFile = File(None),
    ipfs_cid: str | None = None,
    canonicalize: bool = True,
    similarity_threshold: float = 0.92,
    include_matches: bool = False,
    top_k: int = 5,
    include_graph: bool = False,
    graph_top_k: int = 8,
    include_summary: bool = False,
):
    """Classify an input image and optionally include graph and summary data."""
    from pathlib import Path
    DATA_PATH = Path(__file__).resolve().parents[1] / "data"
    MEDIA_FILE = DATA_PATH / "registered_media.json"
    if not MEDIA_FILE.exists():
        return {
            "status": "unregistered",
            "query_sha256": None,
            "canonical_strategy": "none" if not canonicalize else "inpaint_v1",
            "exact_match": None,
            "best_match": None,
            "similarity_threshold": similarity_threshold,
            "matches": [] if include_matches else None,
            "lineage_graph": None,
        }
    try:
        media = json.loads(MEDIA_FILE.read_text())
    except Exception:
        media = []

    # Acquire suspect bytes
    suspect_bytes = None
    source_url = None
    if suspect:
        try:
            suspect_bytes = suspect.file.read()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read upload: {e}")
    elif ipfs_cid:
        # Attempt to reuse stored file_url; fallback to gateway construction
        rec = next((m for m in media if m.get("ipfs_cid") == ipfs_cid and m.get("file_url")), None)
        source_url = rec.get("file_url") if rec else None
        if not source_url:
            gateway_domain = getattr(settings, 'PINATA_GATEWAY_DOMAIN', None)
            if gateway_domain:
                if str(gateway_domain).startswith("http://") or str(gateway_domain).startswith("https://"):
                    base = str(gateway_domain).rstrip('/')
                else:
                    base = f"https://{str(gateway_domain).rstrip('/')}"
                source_url = f"{base}/ipfs/{ipfs_cid}"
            else:
                source_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_cid}"
        try:
            r = requests.get(source_url, timeout=30)
            if r.status_code >= 400:
                raise HTTPException(status_code=502, detail=f"Failed to fetch cid file: {r.status_code}")
            suspect_bytes = r.content
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Fetch error: {e}")
    else:
        raise HTTPException(status_code=400, detail="Provide suspect upload or ipfs_cid")

    if not suspect_bytes:
        raise HTTPException(status_code=500, detail="No suspect bytes loaded")

    # Canonicalization (optional)
    canonical_strategy = "inpaint_v1" if canonicalize else "raw"
    processed_bytes = _maybe_crop_watermark(suspect_bytes) if canonicalize else suspect_bytes
    # If canonicalization made no change, treat as raw
    if processed_bytes == suspect_bytes and canonicalize:
        canonical_strategy = "raw_no_change"

    # Compute sha256 of canonical bytes
    query_sha256 = hashlib.sha256(processed_bytes).hexdigest()

    # Exact match search (by sha256_hash stored)
    exact_rec = None
    for item in media:
        try:
            item_sha = item.get('sha256_hash') or ''
            item_sha = item_sha[2:] if item_sha.startswith('0x') else item_sha
            if item_sha.lower() == query_sha256.lower():
                exact_rec = item
                break
        except Exception:
            continue

    # If exact match found, return immediately (no embedding computation needed)
    if exact_rec:
        graph_payload = None
        if include_graph:
            graph_payload = _build_provenance_graph(
                query_sha256=query_sha256,
                canonical_strategy=canonical_strategy,
                query_ipfs_cid=ipfs_cid,
                query_source_url=source_url,
                best_item=exact_rec,
                best_similarity=1.0,
                match_candidates=[(exact_rec, 1.0)],
                match_summaries=[
                    {
                        "unique_reg_key": exact_rec.get("unique_reg_key"),
                        "signer_address": exact_rec.get("signer_address"),
                        "file_url": exact_rec.get("file_url"),
                        "ipfs_cid": exact_rec.get("ipfs_cid"),
                        "similarity": 1.0,
                    }
                ],
                media=media,
                similarity_threshold=similarity_threshold,
                graph_top_k=graph_top_k,
            )
        return {
            "status": "exact_registered",
            "query_sha256": query_sha256,
            "canonical_strategy": canonical_strategy,
            "exact_match": {
                "unique_reg_key": exact_rec.get("unique_reg_key"),
                "signer_address": exact_rec.get("signer_address"),
                "file_url": exact_rec.get("file_url"),
                "ipfs_cid": exact_rec.get("ipfs_cid"),
                "sha256_hash": exact_rec.get("sha256_hash"),
                "algo_tx": exact_rec.get("algo_tx"),
            },
            "best_match": None,
            "similarity_threshold": similarity_threshold,
            "matches": None if not include_matches else [],
            "lineage_graph": graph_payload,
        }

    # Derivative detection via embeddings
    try:
        from ..light_detectors import get_embedding_from_bytes  # type: ignore
        emb_vec = get_embedding_from_bytes(processed_bytes)
        query_emb = [float(x) for x in emb_vec][:512]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding computation failed: {e}")

    best_sim = -1.0
    best_item = None
    match_list = []
    match_candidates: list[tuple[dict, float]] = []
    for item in media:
        try:
            emb2 = item.get("embedding")
            if not isinstance(emb2, list):
                continue
            sim = _cosine(query_emb, emb2)
            match_candidates.append((item, sim))
            if sim >= similarity_threshold:
                match_list.append({
                    "unique_reg_key": item.get("unique_reg_key"),
                    "signer_address": item.get("signer_address"),
                    "file_url": item.get("file_url"),
                    "ipfs_cid": item.get("ipfs_cid"),
                    "similarity": round(sim, 5),
                })
            if sim > best_sim:
                best_sim = sim
                best_item = item
        except Exception:
            continue

    match_list.sort(key=lambda x: x.get("similarity", 0), reverse=True)
    best_match_payload = None
    status = "unregistered"
    if best_item and best_sim >= similarity_threshold:
        status = "derivative"
        best_match_payload = {
            "unique_reg_key": best_item.get("unique_reg_key"),
            "signer_address": best_item.get("signer_address"),
            "file_url": best_item.get("file_url"),
            "ipfs_cid": best_item.get("ipfs_cid"),
            "similarity": round(best_sim, 5),
        }

    graph_payload = None
    if include_graph:
        graph_payload = _build_provenance_graph(
            query_sha256=query_sha256,
            canonical_strategy=canonical_strategy,
            query_ipfs_cid=ipfs_cid,
            query_source_url=source_url,
            best_item=best_item,
            best_similarity=best_sim,
            match_candidates=match_candidates,
            match_summaries=match_list,
            media=media,
            similarity_threshold=similarity_threshold,
            graph_top_k=graph_top_k,
        )

    summary_payload = None
    if include_summary:
        summary_payload = _build_summary_charts(media, similarity_threshold)

    return {
        "status": status,
        "query_sha256": query_sha256,
        "canonical_strategy": canonical_strategy,
        "exact_match": None,
        "best_match": best_match_payload,
        "similarity_threshold": similarity_threshold,
        "matches": match_list[:top_k] if include_matches else None,
        "lineage_graph": graph_payload,
        "summary": summary_payload,
    }


@router.post("/remove_watermark")
def remove_watermark(file: UploadFile = File(None), ipfs_cid: str | None = None, repin: bool = False):
    """Remove (heuristically) a watermark band from bottom of the image.

    Provide either an uploaded file or an ipfs_cid. If repin=true and Pinata keys are
    configured, the cropped image is pinned to IPFS and its CID returned.

    Returns: { cleaned: { file_url?, ipfs_cid? }, info, original: { file_url?, ipfs_cid? } }
    """
    if not file and not ipfs_cid:
        raise HTTPException(status_code=400, detail="Provide either file upload or ipfs_cid")

    # Acquire bytes
    original_bytes = None
    original_url = None
    original_cid = ipfs_cid
    if file:
        try:
            original_bytes = file.file.read()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read upload: {e}")
    else:
        # Build gateway URL similar to upload
        gateway_domain = getattr(settings, 'PINATA_GATEWAY_DOMAIN', None)
        if gateway_domain:
            if str(gateway_domain).startswith("http://") or str(gateway_domain).startswith("https://"):
                base = str(gateway_domain).rstrip('/')
            else:
                base = f"https://{str(gateway_domain).rstrip('/')}"
            original_url = f"{base}/ipfs/{ipfs_cid}"
        else:
            original_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_cid}"
        try:
            r = requests.get(original_url, timeout=30)
            if r.status_code >= 400:
                raise HTTPException(status_code=502, detail=f"Fetch CID failed: {r.status_code}")
            original_bytes = r.content
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Fetch error: {e}")

    if not original_bytes:
        raise HTTPException(status_code=500, detail="No bytes loaded for processing")

    cleaned_bytes, info = _crop_watermark_with_info(original_bytes)

    cleaned_cid = None
    cleaned_url = None
    if repin:
        if not settings.PINATA_API_KEY or not settings.PINATA_API_SECRET:
            raise HTTPException(status_code=500, detail="Pinata API keys not configured for repin")
        try:
            pinata_url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
            import io
            # Choose filename
            fname = (file.filename if file and file.filename else (ipfs_cid or "image"))
            files = {"file": (f"cleaned_{fname}.png", cleaned_bytes, "image/png")}
            headers = {
                "pinata_api_key": settings.PINATA_API_KEY,
                "pinata_secret_api_key": settings.PINATA_API_SECRET,
            }
            resp = requests.post(pinata_url, files=files, headers=headers, timeout=120)
            if resp.status_code >= 400:
                raise HTTPException(status_code=502, detail=f"Pinata repin error: {resp.status_code} {resp.text}")
            data_json = resp.json()
            cleaned_cid = data_json.get("IpfsHash")
            if not cleaned_cid:
                raise HTTPException(status_code=502, detail=f"Pinata response missing IpfsHash: {data_json}")
            gateway_domain = getattr(settings, 'PINATA_GATEWAY_DOMAIN', None)
            if gateway_domain:
                if str(gateway_domain).startswith("http://") or str(gateway_domain).startswith("https://"):
                    base = str(gateway_domain).rstrip('/')
                else:
                    base = f"https://{str(gateway_domain).rstrip('/')}"
                cleaned_url = f"{base}/ipfs/{cleaned_cid}"
            else:
                cleaned_url = f"https://gateway.pinata.cloud/ipfs/{cleaned_cid}"
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Repin failed: {e}")

    return {
        "original": {"ipfs_cid": original_cid, "file_url": original_url},
        "cleaned": {"ipfs_cid": cleaned_cid, "file_url": cleaned_url},
        "info": info,
        "repinned": bool(repin and cleaned_cid)
    }


@router.post("/register_debug")
def register_media_debug(payload: RegisterRequest):
    """Debug wrapper that calls register_media and returns full traceback on error (local dev only)."""
    try:
        return register_media(payload)
    except Exception as e:
        import traceback, sys as _sys
        tb = traceback.format_exc()
        print(f"[REGISTER DEBUG EXC] {tb}", file=_sys.stderr)
        # Return the traceback to the client for local debugging
        raise HTTPException(status_code=500, detail=tb)


@router.get("/registrants")
def list_registrants(sha256_hash: str | None = None, cid: str | None = None):
    """Return a list of registrants for a given content, identified by sha256_hash (hex) or ipfs cid.

    When sha256_hash is provided, we compute content_key K = sha256(H) and match on stored content_key.
    When only cid is provided, we match records with the same ipfs_cid.
    """
    from pathlib import Path
    import json
    DATA_PATH = Path(__file__).resolve().parents[1] / "data"
    MEDIA_FILE = DATA_PATH / "registered_media.json"
    if not MEDIA_FILE.exists():
        return {"registrants": []}
    try:
        media = json.loads(MEDIA_FILE.read_text())
    except Exception:
        media = []

    target_key = None
    if sha256_hash:
        try:
            h_hex = sha256_hash[2:] if sha256_hash.startswith('0x') else sha256_hash
            H_bytes = bytes.fromhex(h_hex)
            K_bytes = hashlib.sha256(H_bytes).digest()
            target_key = K_bytes.hex()
        except Exception:
            target_key = None

    registrants = []
    for item in media:
        try:
            if target_key:
                if item.get("content_key") != target_key:
                    continue
            elif cid:
                if item.get("ipfs_cid") != cid:
                    continue
            else:
                # Neither filter provided
                continue
            signer_addr = item.get("signer_address")
            registrants.append({
                "signer_address": signer_addr,
                "email": item.get("email"),
                "phone": item.get("phone"),
                "unique_reg_key": item.get("unique_reg_key"),
                "algo_tx": item.get("algo_tx"),
                "algo_explorer_url": item.get("algo_explorer_url"),
            })
        except Exception:
            continue

    return {"registrants": registrants, "count": len(registrants), "content_key": target_key}


@router.post("/derive_keys")
def derive_keys(body: DeriveKeysRequest):
    """Derive content_key (K = sha256(H)) and unique_reg_key (sha256(K||nonce)).

    Pass the transaction id as `nonce` to reproduce the registration key you expect on-chain.
    If `nonce` is omitted, the server will fallback to `signer_address:timestamp` for uniqueness.
    """
    try:
        sha_hex = body.sha256_hash or ''
        h_hex = sha_hex[2:] if sha_hex.startswith('0x') else sha_hex
        H = bytes.fromhex(h_hex)
        K = hashlib.sha256(H).digest()
        K_hex = K.hex()
        # Choose nonce
        if body.nonce:
            nonce_src = body.nonce
            derived_from = "txid"
        else:
            nonce_src = f"{body.signer_address or ''}:{time.time_ns()}:{secrets.token_hex(4)}"
            derived_from = "fallback"
        reg_key = hashlib.sha256(K + nonce_src.encode('utf-8')).hexdigest()
        return {
            "content_key": K_hex,
            "unique_reg_key": reg_key,
            "nonce": nonce_src,
            "derived_from": derived_from,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to derive keys: {e}")


@router.post("/verify")
def verify_signature(payload: VerifySignatureRequest) -> Dict[str, str]:
    """Verify a signature via Lute and return the recovered address (Algorand).

    This is useful for verifying that the client signed the payload before the backend performs an action.
    """
    # Try Lute verification first
    if LUTE_AVAILABLE:
        try:
            res = lute_client.verify_signature(payload.message, payload.signature)
            if isinstance(res, bool):
                return {"verified": str(res).lower()}
            if isinstance(res, str):
                return {"address": res}
            if isinstance(res, dict):
                addr = res.get("address") or res.get("signer")
                return {"address": addr} if addr else {"verified": "true"}
            return {"verified": "true"}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Lute verification failed: {e}")

    raise HTTPException(status_code=500, detail="No verification method available (install Lute SDK)")


@router.get("/tx_status/{txid}")
def tx_status(txid: str):
    """Check whether an Algorand transaction id is known to the configured algod node.

    Returns JSON: { exists: bool, confirmed_round: int | None }
    """
    try:
        from algosdk.v2client import algod
        algod_address = settings.ALGOD_ADDRESS
        algod_token = settings.ALGOD_TOKEN
        algod_client = algod.AlgodClient(algod_token, algod_address)
        # pending_transaction_info raises if not found; wrap in try
        try:
            info = algod_client.pending_transaction_info(txid)
            # If 'confirmed-round' present and > 0, tx is confirmed
            confirmed = info.get('confirmed-round') or info.get('confirmed_round')
            return {"exists": True, "confirmed_round": confirmed}
        except Exception:
            # Not found yet
            return {"exists": False, "confirmed_round": None}
    except Exception as e:
        # If algod client not configured or fails, return error
        raise HTTPException(status_code=500, detail=f"Algod status check failed: {e}")


@router.get("/algod_params")
def algod_params():
    """Fetch suggested params from Algod and format for JS algosdk.

    Handles potential string/bytes issues with genesisHash and returns
    camelCase keys that the JavaScript SDK expects.
    """
    try:
        import base64
        from ..algorand_app_utils import get_algod_client

        algod_client = get_algod_client()
        params = algod_client.suggested_params()

        genesis_hash_data = params.gh
        if isinstance(genesis_hash_data, str):
            genesis_hash_data = genesis_hash_data.encode("utf-8")

        genesis_hash_b64 = base64.b64encode(genesis_hash_data).decode("utf-8")

        p = {
            "fee": params.min_fee,
            "flatFee": True,
            "firstRound": params.first,
            "lastRound": params.last,
            "genesisID": params.gen,
            "genesisHash": genesis_hash_b64,
        }

        return p

    except Exception as e:
        print(f"Error fetching algod params: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch Algod suggested params.")


@router.post("/broadcast_signed_tx")
async def broadcast_signed_tx(request: Request):
    """Accept base64 signed txn and forward raw bytes to Algod.

    Forward-only; no mutation or rebuild. Falls back to direct HTTP with
    explicit application/x-binary if SDK call is rejected with padding error.
    """
    import base64, binascii, hashlib

    ct = request.headers.get("content-type", "").lower()
    signed_bytes: bytes
    if "application/json" in ct:
        try:
            body_json = await request.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON body: {e}")
        signed_b64 = body_json.get("signed_tx_b64") or body_json.get("signedB64")
        if not isinstance(signed_b64, str):
            raise HTTPException(status_code=400, detail="signed_tx_b64 required as string")
        sb = signed_b64.strip()
        if "," in sb and ";base64" in sb[:64]:
            sb = sb.split(",", 1)[1]
        sb = sb.replace("-", "+").replace("_", "/").replace("\n", "")
        pad = "=" * ((4 - len(sb) % 4) % 4)
        try:
            signed_bytes = base64.b64decode(sb + pad, validate=False)
        except (binascii.Error, ValueError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 for signed txn: {e}")
    else:
        # Treat body as raw bytes
        signed_bytes = await request.body()

    sha = hashlib.sha256(signed_bytes).hexdigest()
    print(f"[FORWARD] raw_len={len(signed_bytes)} head=0x{signed_bytes[:8].hex()} sha256={sha}")

    from ..algorand_app_utils import get_algod_client, send_raw_transaction_bytes
    try:
        txid = get_algod_client().send_raw_transaction(signed_bytes)
    except Exception as e:
        # If padding complaint or HTTP error occurs, try explicit HTTP binary fallback
        print(f"[ALGOD ERROR] SDK send_raw_transaction failed: {e}")
        try:
            txid = send_raw_transaction_bytes(signed_bytes)
            print("[ALGOD FALLBACK] HTTP binary submit succeeded", txid)
        except Exception as e2:
            print(f"[ALGOD FALLBACK ERROR] {e2}")
            head_hex = signed_bytes[:8].hex() if len(signed_bytes) >= 8 else signed_bytes.hex()
            raise HTTPException(status_code=502, detail=f"Algod error: {e2} bytes={len(signed_bytes)} head=0x{head_hex}")

    return {"txid": txid, "explorer_url": f"https://lora.algokit.io/testnet/transaction/{txid}"}


@router.post("/broadcast_signed_app_tx")
def broadcast_signed_app_tx(body: BroadcastAppRequest):
    """Broadcast a signed Algorand application transaction (single txn, non-atomic) and
    optionally attach the resulting txid to an existing registration record.

    Body parameters:
      - signed_tx_b64: base64 of the signed txn bytes (required)
      - unique_reg_key: optional registration key to attach the app txid to the stored record
      - content_key: optional content_key (K) to locate matching records when unique_reg_key omitted

    Returns: { txid, explorer_url, updated_record?: {...} }
    """
    try:
        signed_b64 = body.signed_tx_b64
        if not signed_b64:
            raise HTTPException(status_code=400, detail="signed_tx_b64 is required")
        import base64, re
        try:
            sb = (signed_b64 or "").strip()
            sb = re.sub(r"\s+", "", sb)
            if "," in sb and ";base64" in sb[:64]:
                sb = sb.split(",", 1)[1]
            core = sb.replace("-", "+").replace("_", "/")
            decoded = None
            for pad in range(0,4):
                try:
                    decoded = base64.b64decode(core + ("="*pad), validate=False)
                    break
                except Exception:
                    continue
            if decoded is None:
                for pad in range(0,4):
                    try:
                        decoded = base64.urlsafe_b64decode(sb + ("="*pad))
                        break
                    except Exception:
                        continue
            if decoded is None:
                raise Exception("could not decode after normalization")
            signed_bytes = decoded
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 signed txn: {e}")

        from ..algorand_app_utils import get_algod_client
        algod_client = get_algod_client()
        # Use send_raw_transaction for raw signed bytes for compatibility
        try:
            txid = algod_client.send_raw_transaction(signed_bytes)
        except Exception as e:
            try:
                from algosdk.error import AlgodHTTPError  # type: ignore
            except Exception:
                AlgodHTTPError = Exception  # type: ignore
            if isinstance(e, AlgodHTTPError):
                err_text = str(e)
                raise HTTPException(status_code=502, detail=f"Algod error: {err_text}")
            raise HTTPException(status_code=500, detail=f"Broadcast app-tx failed (send_raw_transaction): {e}")
        explorer_url = f"https://lora.algokit.io/testnet/transaction/{txid}"

        # Diagnostics similar to payment broadcast (added after successful send to avoid altering already valid bytes).
        first_byte = signed_bytes[0] if signed_bytes else None
        if first_byte is not None:
            fb_hex = f"0x{first_byte:02x}"
            is_fixmap = 0x80 <= first_byte <= 0x8f
            is_map_ext = first_byte in (0xde, 0xdf)
            is_fixarray = 0x90 <= first_byte <= 0x9f
            is_array_ext = first_byte in (0xdc, 0xdd)
            classification = (
                "fixmap" if is_fixmap else
                "map_ext" if is_map_ext else
                "fixarray" if is_fixarray else
                "array_ext" if is_array_ext else
                "json_or_text" if first_byte in (0x7b, 0x5b) else
                "other"
            )
            print(f"[APP FIRST BYTE] {fb_hex} classification={classification} raw_len={len(signed_bytes)}")
        # Fingerprint
        fp_sha256 = hashlib.sha256(signed_bytes).hexdigest()
        head_hex = signed_bytes[:16].hex()
        tail_hex = signed_bytes[-16:].hex() if len(signed_bytes) >= 16 else signed_bytes.hex()
        print(f"[APP FINGERPRINT] raw_len={len(signed_bytes)} head=0x{head_hex} tail=0x{tail_hex} sha256={fp_sha256}")

        # If app tx came as JSON wrapper (rare), attempt repair BEFORE send would be ideal; for safety we only log if classification suggests JSON.
        if first_byte in (0x7b, 0x5b):
            print("[APP JSON NOTICE] App transaction appears to be JSON-wrapped; ensure frontend sends raw signed msgpack bytes.")

        # Optionally attach txid to stored registration by unique_reg_key or content_key
        unique_reg_key = body.unique_reg_key
        content_key = body.content_key
        updated = None
        try:
            from pathlib import Path
            import json
            DATA_PATH = Path(__file__).resolve().parents[1] / "data"
            MEDIA_FILE = DATA_PATH / "registered_media.json"
            if MEDIA_FILE.exists() and (unique_reg_key or content_key):
                media = json.loads(MEDIA_FILE.read_text())
                for item in media:
                    try:
                        if unique_reg_key and item.get('unique_reg_key') == unique_reg_key:
                            item['app_tx'] = txid
                            item['app_explorer_url'] = explorer_url
                            updated = item
                            break
                        if content_key and item.get('content_key') == content_key:
                            item['app_tx'] = txid
                            item['app_explorer_url'] = explorer_url
                            updated = item
                            break
                    except Exception:
                        continue
                if updated:
                    MEDIA_FILE.write_text(json.dumps(media, indent=2))
        except Exception:
            # non-fatal: ignore persistence errors but return txid
            updated = None

        resp = {"txid": txid, "explorer_url": explorer_url}
        if updated:
            resp['updated_record'] = updated
        return resp
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Broadcast app-tx failed: {e}")


@router.post("/server_pay")
def server_pay():
    """Send a 1 ALGO payment from the server's deployer account to the deployer address.

    This provides a txid nonce without requiring the client to sign. Requires
    DEPLOYER_MNEMONIC to be set on the server. Returns { txid, explorer_url }.
    """
    try:
        # Ensure mnemonic is available
        mn = getattr(settings, 'DEPLOYER_MNEMONIC', None)
        if not mn:
            raise HTTPException(status_code=500, detail="DEPLOYER_MNEMONIC not configured on server")
        try:
            from algosdk import mnemonic as _mn, account as _acct
            from algosdk.v2client import algod
            # Prefer building txn with whichever transaction module is available
            try:
                from algosdk.future import transaction as _txn  # type: ignore
            except Exception:
                from algosdk import transaction as _txn  # type: ignore
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Algorand SDK import failed: {e}")

        # Build algod client
        from ..algorand_app_utils import get_algod_client
        algod_client = get_algod_client()

        # Derive deployer keypair (compatible with newer SDKs without to_public_key)
        clean_mn = mn.replace('"', '').strip()
        priv = _mn.to_private_key(clean_mn)
        sender_addr = _acct.address_from_private_key(priv)

        # Receiver is the configured deployer address (self-transfer)
        recv_resp = get_deployer_address()
        recv_addr = recv_resp.get('deployer_address')
        if not recv_addr:
            raise HTTPException(status_code=500, detail="DEPLOYER_ADDRESS not available from server")

        # Build and sign txn
        try:
            params = algod_client.suggested_params()
            amount = 1_000_000  # 1 ALGO in microAlgos
            note = b"ProofChain registration (server-pays)"
            unsigned_txn = _txn.PaymentTxn(sender_addr, params, recv_addr, amount, None, note)
            signed_txn = unsigned_txn.sign(priv)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to build/sign server payment: {e}")

        # Send via send_transaction (SignedTransaction object)
        try:
            txid = algod_client.send_transaction(signed_txn)
        except Exception as e:
            try:
                from algosdk.error import AlgodHTTPError  # type: ignore
            except Exception:
                AlgodHTTPError = Exception  # type: ignore
            if isinstance(e, AlgodHTTPError):
                raise HTTPException(status_code=502, detail=f"Algod error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Server payment failed: {e}")

        explorer_url = f"https://lora.algokit.io/testnet/transaction/{txid}"
        return {
            "txid": txid,
            "explorer_url": explorer_url,
            "receiver_address_masked": _mask_address(recv_addr)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"server_pay error: {e}")


@router.get("/cid_status/{cid}")
def cid_status(cid: str):
    """Lightweight availability check for an IPFS CID via the configured gateway.

    Returns: { cid, available: bool, http_status: int | None, url: str }
    """
    try:
        # Build the same gateway URL used on upload
        gateway_domain = getattr(settings, 'PINATA_GATEWAY_DOMAIN', None)
        if gateway_domain:
            if str(gateway_domain).startswith("http://") or str(gateway_domain).startswith("https://"):
                base = str(gateway_domain).rstrip('/')
            else:
                base = f"https://{str(gateway_domain).rstrip('/')}"
            url = f"{base}/ipfs/{cid}"
        else:
            url = f"https://gateway.pinata.cloud/ipfs/{cid}"

        # Issue a HEAD request first; if not supported, try GET with small range
        try:
            r = requests.head(url, timeout=10)
            status = r.status_code
        except Exception:
            # Some gateways don't support HEAD; try GET with Range
            try:
                r = requests.get(url, headers={"Range": "bytes=0-0"}, timeout=15)
                status = r.status_code
            except Exception as e2:
                raise HTTPException(status_code=502, detail=f"Gateway check failed: {e2}")

        available = 200 <= status < 300 or status == 206
        return {"cid": cid, "available": bool(available), "http_status": int(status), "url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"cid_status error: {e}")


@router.get("/deployer_address")
def get_deployer_address():
    """Return the configured deployer/receiver address used by the backend.

    This is a convenience endpoint for the frontend to know which address to
    send the client-side payment to when using a client-pays flow.
    """
    try:
        # Prefer deriving the deployer address from DEPLOYER_MNEMONIC when available
        addr = None
        mn = getattr(settings, 'DEPLOYER_MNEMONIC', None)
        if mn:
            try:
                from algosdk import mnemonic as _mn, account as _acct
                from algosdk.v2client import algod
                # Prefer building txn with whichever transaction module is available
                try:
                    from algosdk.future import transaction as _txn  # type: ignore
                except Exception:
                    from algosdk import transaction as _txn  # type: ignore

                # Derive deployer keypair (compatible with newer SDKs without to_public_key)
                clean_mn = mn.replace('"', '').strip()
                priv = _mn.to_private_key(clean_mn)
                addr = _acct.address_from_private_key(priv)
            except Exception:
                addr = None
        # Fallback to an explicit DEPLOYER_ADDRESS if mnemonic not present or derivation failed
        if not addr:
            addr = getattr(settings, 'DEPLOYER_ADDRESS', None)
        return {
            "deployer_address": addr,
            "deployer_address_masked": _mask_address(addr)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get deployer address: {e}")


@router.post("/recompute_reg_key")
def recompute_reg_key(body: DeriveKeysRequest):
    """Recompute and persist unique_reg_key for existing records matching the provided sha256_hash.

    This is useful to normalize legacy records to use a txid-based nonce. If `nonce` is provided
    it will be used as the txid (and stored into `algo_tx` on matching records). When
    ENFORCE_TX_NONCE is true the request must include a nonce.
    """
    try:
        sha_hex = body.sha256_hash or ''
        h_hex = sha_hex[2:] if sha_hex.startswith('0x') else sha_hex
        H = bytes.fromhex(h_hex)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid sha256_hash: {e}")

    # If server requires a txid nonce, ensure it's provided
    if getattr(settings, 'ENFORCE_TX_NONCE', False) and not body.nonce:
        raise HTTPException(status_code=400, detail="Server requires a txid nonce for recompute (ENFORCE_TX_NONCE=true)")

    K_bytes = hashlib.sha256(H).digest()
    K_hex = K_bytes.hex()

    from pathlib import Path
    import json
    DATA_PATH = Path(__file__).resolve().parents[1] / "data"
    MEDIA_FILE = DATA_PATH / "registered_media.json"
    if not MEDIA_FILE.exists():
        raise HTTPException(status_code=404, detail="No registered_media.json found to update")

    try:
        media = json.loads(MEDIA_FILE.read_text())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read media file: {e}")

    updated = []
    target_h = h_hex.lower()
    for item in media:
        try:
            item_h = item.get('sha256_hash') or ''
            item_h = item_h[2:] if isinstance(item_h, str) and item_h.startswith('0x') else item_h
            if not item_h:
                continue
            if item_h.lower() != target_h:
                continue

            # Determine nonce source: prefer provided nonce, else fallback to signer-based seed
            if body.nonce:
                nonce_src = body.nonce
            else:
                nonce_src = f"{item.get('signer_address','')}:{time.time_ns()}:{secrets.token_hex(4)}"

            reg_key = hashlib.sha256(K_bytes + nonce_src.encode('utf-8')).hexdigest()
            item['content_key'] = K_hex
            item['unique_reg_key'] = reg_key
            if body.nonce:
                item['algo_tx'] = body.nonce
                item['algo_explorer_url'] = f"https://lora.algokit.io/testnet/transaction/{body.nonce}"

            updated.append({
                'signer_address': item.get('signer_address'),
                'unique_reg_key': reg_key,
                'algo_tx': item.get('algo_tx'),
            })
        except Exception:
            continue

    try:
        MEDIA_FILE.write_text(json.dumps(media, indent=2))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist updates: {e}")

    return {"updated_count": len(updated), "updated": updated, "content_key": K_hex}



@router.get("/trust")
def media_trust(sha256_hash: str | None = None, cid: str | None = None, check_onchain: bool = False, include_ml: bool = True):
    """Compute a trust score for registrants of a media item identified by `sha256_hash` or `cid`.

    Returns a per-registrant trust breakdown and an aggregate score.
    """
    from pathlib import Path
    import math
    DATA_PATH = Path(__file__).resolve().parents[1] / "data"
    MEDIA_FILE = DATA_PATH / "registered_media.json"
    if not MEDIA_FILE.exists():
        raise HTTPException(status_code=404, detail="No registered_media.json found")

    try:
        media = json.loads(MEDIA_FILE.read_text())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read media file: {e}")

    target_key = None
    if sha256_hash:
        try:
            h_hex = sha256_hash[2:] if sha256_hash.startswith('0x') else sha256_hash
            H_bytes = bytes.fromhex(h_hex)
            K_bytes = hashlib.sha256(H_bytes).digest()
            target_key = K_bytes.hex()
        except Exception:
            target_key = None

    # Gather matching records
    matches = []
    for item in media:
        try:
            if target_key:
                if item.get("content_key") != target_key:
                    continue
            elif cid:
                if item.get("ipfs_cid") != cid:
                    continue
            else:
                continue
            matches.append(item)
        except Exception:
            continue

    # Compute trust score
    trust_score = 0
    if matches:
        trust_score = sum(item.get("trust_factor", 0) for item in matches) / len(matches)

    # Ensure all fields are properly referenced
    result = []
    for match in matches:
        result.append({
            "signer_address": match.get("signer_address"),
            "file_url": match.get("file_url"),
            "ipfs_cid": match.get("ipfs_cid"),
            "sha256_hash": match.get("sha256_hash"),
            "algo_tx": match.get("algo_tx"),
        })

    return {"trust_score": round(trust_score, 2), "matches": result}
