"""Lightweight CPU-friendly image comparison utilities.

Provides a simple ensemble: SHA-256, pHash, ORB feature matching, and MobileNetV2
embeddings (CPU). Designed to run on a laptop for single-image comparisons.
"""
from __future__ import annotations
import hashlib
from PIL import Image
import imagehash
import numpy as np
import cv2
from scipy.spatial.distance import cosine
import tempfile
import os
import logging

# Note: we prefer an ONNX runtime when available to avoid importing heavy torch
# at module import time on CPU-only machines. Torch/torchvision are only
# imported lazily if no ONNX model is present.
_onnx_sess = None
_onnx_model_path = os.path.join(os.path.dirname(__file__), "..", "models", "mobilenetv2.onnx")

logger = logging.getLogger("light_detectors")

_device = None
_model = None
_transform = None


def sha256_bytes_path(path: str) -> str:
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def phash_hex_path(path: str) -> str:
    return str(imagehash.phash(Image.open(path).convert("RGB")))


def hamming_distance_hex(h1: str, h2: str) -> int:
    a = int(h1, 16)
    b = int(h2, 16)
    return (a ^ b).bit_count()


def orb_match_score(path_a: str, path_b: str, max_features: int = 500):
    a = cv2.imdecode(np.fromfile(path_a, dtype=np.uint8), cv2.IMREAD_GRAYSCALE)
    b = cv2.imdecode(np.fromfile(path_b, dtype=np.uint8), cv2.IMREAD_GRAYSCALE)
    if a is None or b is None:
        return 0.0, 0
    orb = cv2.ORB_create(nfeatures=max_features)
    kp1, des1 = orb.detectAndCompute(a, None)
    kp2, des2 = orb.detectAndCompute(b, None)
    if des1 is None or des2 is None or len(kp1) < 8 or len(kp2) < 8:
        return 0.0, 0
    bf = cv2.BFMatcher(cv2.NORM_HAMMING)
    matches = bf.knnMatch(des1, des2, k=2)
    good = []
    for m_n in matches:
        if len(m_n) < 2:
            continue
        m, n = m_n
        if m.distance < 0.75 * n.distance:
            good.append(m)
    denom = max(1, min(len(kp1), len(kp2)))
    ratio = len(good) / denom
    return ratio, len(good)


def _ensure_onnx_session():
    """Lazily load an ONNX session if a model file is present.

    Returns the onnxruntime.InferenceSession or None if unavailable.
    """
    global _onnx_sess
    if _onnx_sess is not None:
        return _onnx_sess
    try:
        import onnxruntime as ort
    except Exception:
        return None
    model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models', 'mobilenetv2.onnx'))
    if not os.path.exists(model_path):
        return None
    try:
        sess = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
        _onnx_sess = sess
        return _onnx_sess
    except Exception:
        return None


def _ensure_torch_model():
    """Lazily load torch + torchvision MobileNetV2 if ONNX not available.

    This avoids importing torch at module import time which fails when torch
    isn't installed on lightweight developer machines.
    """
    global _model, _device, _transform
    if _model is not None:
        return _model
    try:
        import torch
        import torchvision.transforms as T
        import torchvision.models as models
    except Exception as e:
        raise RuntimeError(f"Torch/model loading failed: {e}")
    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    m = models.mobilenet_v2(pretrained=True)
    m.classifier = torch.nn.Identity()
    m.to(_device).eval()
    _model = m
    _transform = T.Compose([
        T.Resize(256),
        T.CenterCrop(224),
        T.ToTensor(),
        T.Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225])
    ])
    return _model


def _preprocess_for_onnx(path: str) -> np.ndarray:
    img = Image.open(path).convert("RGB")
    # Resize + center crop to 224x224
    img = img.resize((256, int(256 * img.size[1] / img.size[0])), resample=Image.BILINEAR) if img.size[0] < img.size[1] else img.resize((int(256 * img.size[0] / img.size[1]), 256), resample=Image.BILINEAR)
    # Now center crop
    width, height = img.size
    left = (width - 224) / 2
    top = (height - 224) / 2
    right = (width + 224) / 2
    bottom = (height + 224) / 2
    img = img.crop((left, top, right, bottom)).resize((224,224), resample=Image.BILINEAR)
    arr = np.array(img).astype('float32') / 255.0
    # Normalize
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    arr = (arr - mean) / std
    # HWC -> CHW
    arr = arr.transpose(2,0,1)
    arr = np.expand_dims(arr, axis=0).astype(np.float32)
    return arr


def get_mobilenet_embed(path: str) -> np.ndarray:
    """Get a normalized embedding for the image at `path`.

    Tries ONNX runtime first (if a model file exists under backend/app/models/),
    otherwise falls back to a torch MobileNetV2 loaded lazily.
    """
    # Try ONNX first
    sess = _ensure_onnx_session()
    if sess is not None:
        try:
            input_name = sess.get_inputs()[0].name
            x = _preprocess_for_onnx(path)
            out = sess.run(None, {input_name: x})
            feat = np.asarray(out[0]).squeeze()
            norm = np.linalg.norm(feat)
            if norm > 0:
                feat = feat / norm
            return feat
        except Exception:
            # Fall through to torch path
            pass

    # Fallback to torch if ONNX not available or failed
    model = _ensure_torch_model()
    try:
        import torch
    except Exception:
        raise RuntimeError("Neither ONNX runtime nor torch are available for embedding extraction")
    img = Image.open(path).convert("RGB")
    x = _transform(img).unsqueeze(0).to(_device)
    with torch.no_grad():
        feat = model(x).squeeze().cpu().numpy()
    norm = np.linalg.norm(feat)
    if norm > 0:
        feat = feat / norm
    return feat


def get_embedding_from_bytes(b: bytes) -> np.ndarray:
    """Write bytes to a temp file and return the embedding vector (numpy).

    Caller must handle exceptions. This helper avoids duplication of temp file
    logic elsewhere.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".img") as f:
        f.write(b)
        tmp = f.name
    try:
        emb = get_mobilenet_embed(tmp)
        return emb
    finally:
        try:
            os.remove(tmp)
        except Exception:
            pass


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return 1.0 - cosine(a, b)


def compute_tamper_score(reg_path: str, sus_path: str) -> dict:
    """Compute tamper/near-duplicate score between two local image paths.

    Returns a dict with signals and a combined score in 0..1 and label.
    """
    out = {}
    out['sha_reg'] = sha256_bytes_path(reg_path)
    out['sha_sus'] = sha256_bytes_path(sus_path)
    out['sha_equal'] = (out['sha_reg'] == out['sha_sus'])

    ph_reg = phash_hex_path(reg_path)
    ph_sus = phash_hex_path(sus_path)
    hdist = hamming_distance_hex(ph_reg, ph_sus)
    out['phash_hamming'] = hdist
    ph_match = hdist <= 10
    out['phash_match'] = ph_match

    orb_ratio, orb_matches = orb_match_score(reg_path, sus_path)
    out['orb_ratio'] = orb_ratio
    out['orb_matches'] = orb_matches

    try:
        emb_reg = get_mobilenet_embed(reg_path)
        emb_sus = get_mobilenet_embed(sus_path)
        emb_sim = float(cosine_sim(emb_reg, emb_sus))
    except Exception as e:
        logger.warning(f"Embedding extraction failed: {e}")
        emb_sim = 0.0
    out['embedding_sim'] = emb_sim

    # Weights
    w_ph = 0.30
    w_emb = 0.45
    w_orb = 0.25

    ph_score = 1.0 if ph_match else max(0.0, 1.0 - (hdist / 64.0))
    emb_score = max(0.0, min(1.0, (emb_sim - 0.5) / 0.5))
    orb_score = min(1.0, orb_ratio * 2.0)

    combined = w_ph * ph_score + w_emb * emb_score + w_orb * orb_score
    out['ph_score'] = ph_score
    out['emb_score'] = emb_score
    out['orb_score'] = orb_score
    out['combined'] = combined

    if out['sha_equal']:
        out['label'] = 'identical'
    else:
        if combined >= 0.85:
            out['label'] = 'same/near-duplicate'
        elif combined >= 0.65:
            out['label'] = 'likely edited (minor edits)'
        else:
            out['label'] = 'different/likely not same'

    return out


def compute_tamper_score_from_bytes(reg_bytes: bytes, sus_bytes: bytes) -> dict:
    # write to temp files then call compute_tamper_score
    with tempfile.NamedTemporaryFile(delete=False, suffix=".img") as f1:
        f1.write(reg_bytes)
        reg_path = f1.name
    with tempfile.NamedTemporaryFile(delete=False, suffix=".img") as f2:
        f2.write(sus_bytes)
        sus_path = f2.name
    try:
        return compute_tamper_score(reg_path, sus_path)
    finally:
        try:
            os.remove(reg_path)
        except Exception:
            pass
        try:
            os.remove(sus_path)
        except Exception:
            pass
