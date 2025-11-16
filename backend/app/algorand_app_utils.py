import base64
import hashlib
from typing import Optional, Tuple, Dict, Any

from algosdk.v2client import algod
from algosdk import encoding
# algosdk versions expose transaction in different places. Try the future module first,
# then fall back to the top-level transaction module. If neither is available, leave
# future_txn as None and raise a clear error at use-time.
try:
    from algosdk.future import transaction as future_txn
except Exception:
    try:
        from algosdk import transaction as future_txn
    except Exception:
        future_txn = None

from .config import settings


def _parse_headers(raw: str | None) -> dict:
    if not raw:
        return {}
    raw = raw.strip()
    # Try JSON first
    try:
        import json as _json
        val = _json.loads(raw)
        if isinstance(val, dict):
            return {str(k): str(v) for k, v in val.items()}
    except Exception:
        pass
    # Fallback: comma-separated key:value or key=value
    headers: dict[str, str] = {}
    parts = [p for p in raw.split(',') if p.strip()]
    for p in parts:
        if ':' in p:
            k, v = p.split(':', 1)
        elif '=' in p:
            k, v = p.split('=', 1)
        else:
            continue
        headers[k.strip()] = v.strip()
    return headers


def get_algod_client() -> algod.AlgodClient:
    address = settings.ALGOD_ADDRESS or settings.ALGOD_URL
    if not address:
        raise RuntimeError("Algod address not configured: set ALGOD_ADDRESS or ALGOD_URL in .env")
    token = settings.ALGOD_TOKEN or ""
    raw_headers = _parse_headers(settings.ALGOD_HEADER_KV)
    # Sanitize headers: never override Content-Type so SDK can send application/x-binary for raw txns
    headers = {k: v for k, v in raw_headers.items() if k.lower() not in ("content-type", "content_type")}
    try:
        if raw_headers and raw_headers != headers:
            removed = [k for k in raw_headers.keys() if k.lower() in ("content-type", "content_type")]
            print(f"[ALGOD CLIENT] Removed custom Content-Type from ALGOD_HEADER_KV: {removed}")
        print(f"[ALGOD CLIENT] Using headers keys: {list(headers.keys())}")
    except Exception:
        pass
    return algod.AlgodClient(token, address, headers)


def send_raw_transaction_bytes(signed_bytes: bytes) -> str:
    """Post raw signed txn bytes directly via HTTP to avoid any SDK header overrides.

    Returns txid on success, raises Exception on failure with response text.
    """
    import requests
    address = settings.ALGOD_ADDRESS or settings.ALGOD_URL
    if not address:
        raise RuntimeError("Algod address not configured: set ALGOD_ADDRESS or ALGOD_URL in .env")
    token = settings.ALGOD_TOKEN or ""
    raw_headers = _parse_headers(settings.ALGOD_HEADER_KV)
    # Always set x-binary content type; never allow user-provided Content-Type here
    headers = {k: v for k, v in raw_headers.items() if k.lower() not in ("content-type", "content_type")}
    headers["Content-Type"] = "application/x-binary"
    if token:
        # Standard header for direct algod token auth
        headers.setdefault("X-Algo-API-Token", token)
    url = address.rstrip("/") + "/v2/transactions"
    resp = requests.post(url, headers=headers, data=signed_bytes, timeout=30)
    if resp.status_code >= 400:
        raise Exception(f"HTTP {resp.status_code}: {resp.text}")
    try:
        j = resp.json()
        txid = j.get("txId") or j.get("txid") or j.get("txID")
        if not txid:
            # Some nodes return plain text txid
            txid = resp.text.strip().strip('"')
        if not txid:
            raise Exception(f"Unexpected algod response: {resp.text}")
        return txid
    except ValueError:
        # Not JSON, treat as plain id
        txid = resp.text.strip().strip('"')
        if not txid:
            raise Exception(f"Unexpected algod response: {resp.text}")
        return txid


def compute_media_key(h_preimage: bytes) -> bytes:
    """Derive on-chain media key K = sha256(H)."""
    return hashlib.sha256(h_preimage).digest()


def compute_reg_key(media_key: bytes, nonce: bytes) -> bytes:
    """Per-submission key: sha256(media_key || nonce)."""
    return hashlib.sha256(media_key + nonce).digest()


def hex_to_bytes(h: str) -> bytes:
    h = h.strip().lower()
    if h.startswith("0x"):
        h = h[2:]
    return bytes.fromhex(h)


def build_register_app_call(
    sender: str,
    app_id: int,
    sha256_hex: str,
    cid: str,
    nonce_str: Optional[str] = None,
) -> Tuple[Dict[str, Any], str, bytes, bytes]:
    """
    Build an unsigned ApplicationNoOpTxn for the ProofChain register flow.

    Args:
        sender: Wallet address that will sign the transaction.
        app_id: Deployed PyTeal application id.
        sha256_hex: Hex string of the file's SHA-256 digest (H preimage).
        cid: IPFS CID string to store under media key.
        nonce_str: Optional nonce to ensure unique registration (e.g., payment txid).

    Returns:
        (txn_dict, txn_b64, media_key, reg_key)
    """
    client = get_algod_client()
    params = client.suggested_params()

    H = hex_to_bytes(sha256_hex)
    media_key = compute_media_key(H)
    if nonce_str is None:
        # Fallback to sender+round by querying the current round; caller may override.
        status = client.status()
        current_round = status.get("last-round") or status.get("lastRound")
        if current_round is None:
            current_round = 0
        nonce_bytes = (sender.encode("utf-8") + int(current_round).to_bytes(8, "big"))
    else:
        nonce_bytes = nonce_str.encode("utf-8")
    reg_key = compute_reg_key(media_key, nonce_bytes)

    app_args = [
        b"register",
        H,
        cid.encode("utf-8"),
        nonce_bytes,
    ]

    # Boxes must be declared to access/create them in the app call
    boxes = [(app_id, media_key), (app_id, reg_key)]

    txn = future_txn.ApplicationNoOpTxn(
        sender=sender,
        sp=params,
        index=app_id,
        app_args=app_args,
        boxes=boxes,
    )

    # Return dict and base64 msgpack for client-side signing
    txn_dict = txn.dictify()
    txn_b64 = base64.b64encode(encoding.msgpack_encode(txn).encode("utf-8")).decode("utf-8")
    return txn_dict, txn_b64, media_key, reg_key
