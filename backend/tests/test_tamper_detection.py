import io
import hashlib
from PIL import Image, ImageDraw
import pytest

from fastapi.testclient import TestClient

from app.light_detectors import compute_tamper_score_from_bytes
from app.main import app


def make_test_image(color=(128, 128, 128), size=(224, 224)):
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def make_modified_image(orig_bytes: bytes):
    buf = io.BytesIO(orig_bytes)
    img = Image.open(buf).convert("RGB")
    draw = ImageDraw.Draw(img)
    # draw a small black rectangle to simulate a subtle edit
    w, h = img.size
    draw.rectangle([w - 30, h - 30, w - 10, h - 10], fill=(0, 0, 0))
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


def test_tamper_detection_detects_modification():
    orig = make_test_image()
    mod = make_modified_image(orig)

    # compute tamper score between original and modified bytes
    res = compute_tamper_score_from_bytes(orig, mod)

    # Ensure SHA differ and label indicates not identical
    assert res.get("sha_reg") != res.get("sha_sus")
    assert res.get("label") in ("different/likely not same", "likely edited (minor edits)", "same/near-duplicate", "identical")
    # Expect not 'identical' for modified image
    assert res.get("label") != "identical"


def test_derive_keys_endpoint():
    client = TestClient(app)
    # create a dummy sha256 hash for testing
    data = b"test-content"
    H = hashlib.sha256(data).hexdigest()
    payload = {"sha256_hash": H, "signer_address": "ALICE", "nonce": "txid123"}
    r = client.post("/media/derive_keys", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert "content_key" in body and "unique_reg_key" in body
    # reproducibility: recompute locally
    K = hashlib.sha256(bytes.fromhex(H)).digest()
    expected = hashlib.sha256(K + payload["nonce"].encode("utf-8")).hexdigest()
    assert body["unique_reg_key"] == expected
