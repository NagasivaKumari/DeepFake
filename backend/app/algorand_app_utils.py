import base64
import hashlib
from typing import Optional, Tuple, Dict, Any

from algosdk.v2client import algod
from algosdk import encoding
from algosdk.future import transaction as future_txn

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
    headers = _parse_headers(settings.ALGOD_HEADER_KV)
    return algod.AlgodClient(token, address, headers)


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
    embedding_sha256_hex: Optional[str] = None,
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
        # Fallback to sender(raw 32 bytes) + big-endian round to match on-chain Concat(Txn.sender(), Itob(Global.round()))
        status = client.status()
        current_round = status.get("last-round") or status.get("lastRound")
        if current_round is None:
            current_round = 0
        try:
            # decode the Algorand address to raw 32-byte public key
            sender_raw = encoding.decode_address(sender)
        except Exception:
            # fallback to utf-8 bytes if decode fails (shouldn't on valid addresses)
            sender_raw = sender.encode("utf-8")
        nonce_bytes = sender_raw + int(current_round).to_bytes(8, "big")
    else:
        nonce_bytes = nonce_str.encode("utf-8")
    reg_key = compute_reg_key(media_key, nonce_bytes)

    app_args = [
        b"register",
        H,
        cid.encode("utf-8"),
        nonce_bytes,
    ]

    # Optionally include the 32-byte embedding SHA-256 anchor so clients can
    # persist a compact embedding digest on-chain as part of the app call.
    if embedding_sha256_hex:
        try:
            emb_hex = embedding_sha256_hex[2:] if embedding_sha256_hex.startswith("0x") else embedding_sha256_hex
            emb_bytes = bytes.fromhex(emb_hex)
            if len(emb_bytes) == 32:
                app_args.append(emb_bytes)
        except Exception:
            # Ignore malformed embedding arg; caller may still sign without it
            pass

    # Boxes must be declared to access/create them in the app call. Some
    # versions of the Python SDK don't accept the `boxes=` kwarg when
    # constructing ApplicationNoOpTxn. Try to include boxes, but fall back
    # to constructing the txn without boxes for older SDKs.
    boxes = [(app_id, media_key), (app_id, reg_key)]
    try:
        txn = future_txn.ApplicationNoOpTxn(
            sender=sender,
            sp=params,
            index=app_id,
            app_args=app_args,
            boxes=boxes,
        )
    except TypeError as e:
        # Older SDK doesn't support boxes kwarg; fall back and warn.
        import logging
        logging.getLogger("algorand_app_utils").warning(
            "ApplicationNoOpTxn does not accept 'boxes' in this SDK version; "
            "constructing txn without boxes (app may require boxes at call time). %s",
            e,
        )
        txn = future_txn.ApplicationNoOpTxn(
            sender=sender,
            sp=params,
            index=app_id,
            app_args=app_args,
        )

    # Return dict and base64 msgpack for client-side signing
    txn_dict = txn.dictify()
    txn_b64 = base64.b64encode(encoding.msgpack_encode(txn).encode("utf-8")).decode("utf-8")
    return txn_dict, txn_b64, media_key, reg_key


def build_register_atomic_group(
    sender: str,
    app_id: int,
    sha256_hex: str,
    cid: str,
    payment_receiver: str,
    payment_amount: int,
    embedding_sha256_hex: Optional[str] = None,
) -> Tuple[Dict[str, Any], str, Dict[str, Any], str, bytes, bytes]:
    """
    Build an unsigned atomic group composed of a PaymentTxn (sender -> payment_receiver)
    and an ApplicationNoOpTxn register call. The payment transaction's txid is used as
    the nonce bytes included in the app call so the client can sign both txns and submit
    them atomically. Returns (payment_txn_dict, payment_b64, app_txn_dict, app_b64, media_key, reg_key).
    """
    client = get_algod_client()
    params = client.suggested_params()

    H = hex_to_bytes(sha256_hex)
    media_key = compute_media_key(H)

    # Build unsigned payment txn (sender -> payment_receiver)
    payment_txn = future_txn.PaymentTxn(
        sender,
        params,
        payment_receiver,
        payment_amount,
        None,
        "Registration nonce payment",
    )

    # Compute the payment txn id deterministically (available before signing)
    try:
        payment_txid = payment_txn.get_txid()
    except Exception:
        # fallback: compute from msgpack encode
        import base64 as _b64
        payment_txid = future_txn.calculate_txid(payment_txn.dictify())

    # Use payment_txid as nonce bytes
    nonce_bytes = str(payment_txid).encode("utf-8")
    reg_key = compute_reg_key(media_key, nonce_bytes)

    app_args = [b"register", H, cid.encode("utf-8"), nonce_bytes]
    if embedding_sha256_hex:
        try:
            emb_hex = embedding_sha256_hex[2:] if embedding_sha256_hex.startswith("0x") else embedding_sha256_hex
            emb_bytes = bytes.fromhex(emb_hex)
            if len(emb_bytes) == 32:
                app_args.append(emb_bytes)
        except Exception:
            pass

    app_txn = future_txn.ApplicationNoOpTxn(
        sender=sender,
        sp=params,
        index=app_id,
        app_args=app_args,
    )

    # Assign group id to both txns
    try:
        gid = future_txn.calculate_group_id([payment_txn, app_txn])
        payment_txn.group = gid
        app_txn.group = gid
    except Exception:
        # If grouping fails, continue without group (client can still sign and submit)
        pass

    # Serialize both transactions to dict + base64 msgpack for client signing
    from algosdk import encoding as _encoding
    import base64 as _base64

    payment_b64 = _base64.b64encode(encoding.msgpack_encode(payment_txn).encode("utf-8")).decode("utf-8")
    app_b64 = _base64.b64encode(encoding.msgpack_encode(app_txn).encode("utf-8")).decode("utf-8")

    return payment_txn.dictify(), payment_b64, app_txn.dictify(), app_b64, media_key, reg_key
