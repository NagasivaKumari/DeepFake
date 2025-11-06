"""Pluggable deepfake/forgery detector helper.

This module attempts to call an installed ML detector if available. If no model
is present, it falls back to a lightweight heuristic so the trust pipeline can
still use a 'ml_score' (forgery_likelihood) signal.

To enable a real model, install a detector and export ENABLE_DEEPFAKE_MODEL=1
and, if necessary, MODEL_PATH or other config env vars. The detector should
expose a `predict_bytes(bytes) -> float` API that returns a score in [0,1]
where 1.0 means very likely forged.
"""
from __future__ import annotations
import os
import requests
import io
import logging
from typing import Optional, Dict

logger = logging.getLogger("deepfake_detector")

# Feature flag to opt into ML usage (default off for local dev)
ENABLE_MODEL = bool(os.getenv("ENABLE_DEEPFAKE_MODEL", "0") in ("1", "true", "True"))

# Try to import a real detector (this is intentionally generic). If you have a
# concrete detector library, adapt the import and call below to match its API.
MODEL = None
MODEL_AVAILABLE = False
if ENABLE_MODEL:
    try:
        # Example: a package that exposes predict_bytes
        import deepfake_detector as df
        MODEL = df
        MODEL_AVAILABLE = True
        logger.info("Deepfake model loaded from deepfake_detector package")
    except Exception:
        try:
            # Try a torch-based custom loader if configured (dynamic import)
            import importlib
            torch = importlib.import_module('torch')
            # Users can implement loader logic here using MODEL_PATH env var
            MODEL_PATH = os.getenv("DEEPFAKE_MODEL_PATH")
            if MODEL_PATH and os.path.exists(MODEL_PATH):
                # placeholder: user must implement model loading if needed
                logger.warning("DEEPFAKE_MODEL_PATH set but automatic loading not implemented; implement loader to use custom model")
            else:
                logger.warning("ENABLE_DEEPFAKE_MODEL set but no model package or path found")
        except Exception:
            logger.warning("ENABLE_DEEPFAKE_MODEL set but no supported model library found")


def _fetch_image_bytes(url: str, timeout: int = 15) -> Optional[bytes]:
    try:
        r = requests.get(url, timeout=timeout)
        if r.status_code >= 400:
            logger.debug(f"Failed to fetch image for ML analysis: {r.status_code}")
            return None
        return r.content
    except Exception as e:
        logger.debug(f"Image fetch error for ML analysis: {e}")
        return None


def analyze_image_from_url(url: str, fallback_hint: Optional[Dict] = None) -> Dict:
    """Analyze an image at a URL and return a dictionary:

    { available: bool, method: 'model'|'heuristic'|'none', ml_score: float|None }

    ml_score is a forgery likelihood in [0,1] where 1.0 is very likely forged.
    """
    result = {"available": False, "method": "none", "ml_score": None}
    img_bytes = _fetch_image_bytes(url)
    if not img_bytes:
        return result
    result["available"] = True

    # If a real model is available, try to use it
    if MODEL_AVAILABLE and MODEL is not None:
        try:
            # Expect the model package to provide `predict_bytes` returning 0..1
            if hasattr(MODEL, "predict_bytes"):
                score = float(MODEL.predict_bytes(img_bytes))
            elif hasattr(MODEL, "predict"):
                score = float(MODEL.predict(img_bytes))
            else:
                logger.warning("Model package present but does not expose predict_bytes/predict")
                score = None
            if score is not None:
                score = max(0.0, min(1.0, score))
                result.update({"method": "model", "ml_score": score})
                return result
        except Exception as e:
            logger.exception(f"Model prediction failed: {e}")

    # Heuristic fallback: use hints when available (perceptual_hash, duplicate signers)
    # fallback_hint: { "perceptual_hash": str, "duplicate_signers": int }
    dup_score = 0.0
    ph_score = 0.0
    if fallback_hint:
        try:
            dup = int(fallback_hint.get("duplicate_signers") or 0)
            # If many different signers have same content, suspicious (scale 0..1)
            dup_score = min(1.0, max(0.0, (dup - 1) / 4.0))
        except Exception:
            dup_score = 0.0
        try:
            ph = fallback_hint.get("perceptual_hash")
            if ph and isinstance(ph, str) and len(ph) > 8:
                # presence of perceptual hash indicates some processing; give small positive
                ph_score = 0.1
        except Exception:
            ph_score = 0.0

    # Heuristic combined score (favoring duplicates as stronger signal)
    heuristic = min(1.0, dup_score * 0.7 + ph_score * 0.3)
    result.update({"method": "heuristic", "ml_score": heuristic})
    return result


def analyze_media_record(record: Dict, gateway_base: Optional[str] = None, media_group: Optional[Dict] = None) -> Dict:
    """Analyze a media record (from registered_media.json).

    - record: single media dict
    - gateway_base: optional base URL for IPFS gateway
    - media_group: optional dict of aggregated info for same content (e.g., duplicate_signers)

    Returns: { ml_score, method, available }
    """
    cid = record.get("ipfs_cid")
    if not cid:
        return {"available": False, "method": "none", "ml_score": None}

    if gateway_base:
        if gateway_base.startswith("http://") or gateway_base.startswith("https://"):
            base = gateway_base.rstrip('/')
        else:
            base = f"https://{gateway_base.rstrip('/')}"
        url = f"{base}/ipfs/{cid}"
    else:
        url = f"https://gateway.pinata.cloud/ipfs/{cid}"

    hint = {}
    if record.get("perceptual_hash"):
        hint["perceptual_hash"] = record.get("perceptual_hash")
    if media_group and isinstance(media_group, dict):
        hint["duplicate_signers"] = media_group.get("distinct_signers", 1)

    return analyze_image_from_url(url, fallback_hint=hint)
