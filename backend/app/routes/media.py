
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

        # Get server account (compatible with newer SDKs without to_public_key)
        sender_private_key = mnemonic.to_private_key(server_mnemonic)
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
def register_media(payload: RegisterRequest):
    """Register media metadata with the on-chain registry (Algorand) or store locally.

    This endpoint verifies the creator signature and returns a verified payload. The caller
    typically uses the returned data to prepare an Algorand transaction (unsigned) that the
    client signs with Lute and submits to Algorand.
    """
    # Metadata signature policy: enforce or skip based on settings.ENFORCE_METADATA_SIGNATURE
    signature_status = "skipped"
    if getattr(settings, 'ENFORCE_METADATA_SIGNATURE', False) and not payload.metadata_signature:
        raise HTTPException(status_code=400, detail="metadata_signature is required by server policy")
    if payload.metadata_signature:
        if LUTE_AVAILABLE:
            try:
                # Expect Lute client to return either a boolean or recovered address.
                res = lute_client.verify_signature(payload.sha256_hash, payload.metadata_signature)
                ok = False
                if isinstance(res, bool):
                    ok = res
                elif isinstance(res, str):
                    ok = (res.lower() == payload.signer_address.lower())
                elif isinstance(res, dict):
                    addr = (res.get("address") or res.get("signer") or "").lower()
                    ok = bool(addr) and (addr == payload.signer_address.lower())
                else:
                    ok = bool(res)

                if not ok:
                    signature_status = "failed"
                    if getattr(settings, 'ENFORCE_METADATA_SIGNATURE', False):
                        raise HTTPException(status_code=403, detail="Lute signature verification failed or signer mismatch")
                else:
                    signature_status = "verified"
            except Exception as e:
                if getattr(settings, 'ENFORCE_METADATA_SIGNATURE', False):
                    raise HTTPException(status_code=400, detail=f"Lute verification error: {e}")
                signature_status = f"error: {e}"
        else:
            if getattr(settings, 'ENFORCE_METADATA_SIGNATURE', False):
                raise HTTPException(status_code=500, detail="No signature verification method available (install Lute SDK)")
            signature_status = "skipped_no_verifier"


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

    # Fetch KYC info for wallet address
    user_address = getattr(payload, 'signer_address', None)
    KYC_FILE = DATA_PATH / "kyc.json"
    kyc_email = None
    kyc_phone = None
    if KYC_FILE.exists():
        try:
            raw = json.loads(KYC_FILE.read_text())
            # support kyc.json being either a list of records or a dict keyed by id
            if isinstance(raw, dict):
                kyc_records = list(raw.values())
            else:
                kyc_records = raw
            for kyc in kyc_records:
                try:
                    if kyc.get("wallet_address", "").lower() == (user_address or "").lower():
                        kyc_email = kyc.get("email")
                        kyc_phone = kyc.get("phone")
                        break
                except Exception:
                    continue
        except Exception:
            pass
    ipfs_cid = getattr(payload, 'ipfs_cid', None)
    file_url = getattr(payload, 'file_url', None)

    reg_data = payload.dict()
    reg_data["email"] = kyc_email
    reg_data["phone"] = kyc_phone
    reg_data["ipfs_cid"] = ipfs_cid
    reg_data["file_url"] = file_url
    reg_data["algo_tx"] = algo_tx
    reg_data["algo_explorer_url"] = explorer_url
    if 'reg_error' in locals():
        reg_data["algo_error"] = reg_error
    reg_data["signature_status"] = signature_status

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
            registrants.append({
                "signer_address": item.get("signer_address"),
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
        return {"txid": txid, "explorer_url": explorer_url}
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
        # This ensures the backend uses the mnemonic in the .env as the canonical receiver.
        addr = None
        mn = getattr(settings, 'DEPLOYER_MNEMONIC', None)
        if mn:
            try:
                from algosdk import mnemonic as _mnemonic, account as _account
                priv = _mnemonic.to_private_key(mn.replace('"', '').strip())
                addr = _account.address_from_private_key(priv)
            except Exception:
                addr = None
        # Fallback to an explicit DEPLOYER_ADDRESS if mnemonic not present or derivation failed
        if not addr:
            addr = getattr(settings, 'DEPLOYER_ADDRESS', None)
        return {"deployer_address": addr}
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

    if not matches:
        return {"registrants": [], "average": None, "count": 0}

    # Aggregate info for heuristics: number of distinct signers
    distinct_signers = len({(m.get('signer_address') or '').lower() for m in matches if m.get('signer_address')})
    media_group = {"distinct_signers": distinct_signers, "total": len(matches)}

    results = []
    scores = []

    # Weights (total positive weights = 80, ML penalty = 20)
    W_SIGNATURE = 20
    W_ONCHAIN = 25
    W_IPFS = 15
    W_KYC = 15
    W_STATUS = 5
    W_ML = 20  # penalty weight

    # Helper to test IPFS availability (lightweight)
    gateway_domain = getattr(settings, 'PINATA_GATEWAY_DOMAIN', None)
    def check_cid_available(cid_val: str) -> bool:
        try:
            if not cid_val:
                return False
            if gateway_domain:
                if str(gateway_domain).startswith('http://') or str(gateway_domain).startswith('https://'):
                    base = str(gateway_domain).rstrip('/')
                else:
                    base = f"https://{str(gateway_domain).rstrip('/')}"
                url = f"{base}/ipfs/{cid_val}"
            else:
                url = f"https://gateway.pinata.cloud/ipfs/{cid_val}"
            try:
                r = requests.head(url, timeout=8)
                status = r.status_code
            except Exception:
                try:
                    r = requests.get(url, headers={"Range": "bytes=0-0"}, timeout=12)
                    status = r.status_code
                except Exception:
                    return False
            return 200 <= status < 300 or status == 206
        except Exception:
            return False

    # Optional algod client for on-chain checks
    algod_client = None
    if check_onchain:
        try:
            from ..algorand_app_utils import get_algod_client
            algod_client = get_algod_client()
        except Exception:
            algod_client = None

    for item in matches:
        try:
            sig_ok = (item.get('signature_status') == 'verified')
            onchain_present = False
            if item.get('algo_tx'):
                # If check_onchain requested, try to confirm tx is known
                if check_onchain and algod_client:
                    try:
                        info = algod_client.pending_transaction_info(item.get('algo_tx'))
                        confirmed = info.get('confirmed-round') or info.get('confirmed_round')
                        onchain_present = bool(confirmed)
                    except Exception:
                        onchain_present = False
                else:
                    # trust presence of algo_tx as a soft indicator
                    onchain_present = True

            ipfs_ok = check_cid_available(item.get('ipfs_cid'))
            kyc_ok = bool(item.get('email') or item.get('phone'))
            not_revoked = (item.get('status') != 'revoked')

            ml_info = None
            ml_score = None
            if include_ml:
                try:
                    ml_info = analyze_media_record(item, gateway_base=gateway_domain, media_group=media_group)
                    ml_score = ml_info.get('ml_score')
                except Exception:
                    ml_score = None

            # Compute base positive score
            base = 0
            base += W_SIGNATURE if sig_ok else 0
            base += W_ONCHAIN if onchain_present else 0
            base += W_IPFS if ipfs_ok else 0
            base += W_KYC if kyc_ok else 0
            base += W_STATUS if not_revoked else 0

            ml_penalty = (ml_score or 0.0) * W_ML
            pct = max(0.0, min(100.0, base - ml_penalty))
            score_5 = round(pct / 20.0, 2)

            results.append({
                'signer_address': item.get('signer_address'),
                'unique_reg_key': item.get('unique_reg_key'),
                'content_key': item.get('content_key'),
                'signals': {
                    'signature_verified': sig_ok,
                    'onchain_present': onchain_present,
                    'ipfs_available': ipfs_ok,
                    'kyc_present': kyc_ok,
                    'not_revoked': not_revoked,
                },
                'ml': ml_info or {'method': 'none', 'ml_score': None},
                'trust': {
                    'pct': pct,
                    'score_5': score_5,
                    'breakdown': {
                        'signature': W_SIGNATURE if sig_ok else 0,
                        'onchain': W_ONCHAIN if onchain_present else 0,
                        'ipfs': W_IPFS if ipfs_ok else 0,
                        'kyc': W_KYC if kyc_ok else 0,
                        'status': W_STATUS if not_revoked else 0,
                        'ml_penalty': ml_penalty,
                    }
                }
            })
            scores.append(pct)
        except Exception:
            continue

    avg = None
    if scores:
        avg = sum(scores) / len(scores)

    return {"registrants": results, "average_pct": avg, "count": len(results), "content_key": target_key}



@router.post("/compare")
def compare_media(suspect: UploadFile = File(None), ipfs_cid: str | None = None, registered_sha256: str | None = None):
    """Compare an uploaded suspect image against a registered asset.

    Provide either:
      - multipart file field `suspect` and `ipfs_cid` (server will fetch registered file by CID), or
      - `suspect` and `registered_sha256` (server will look up registered_media.json for file_url).

    Returns the lightweight tamper/near-duplicate score and signals.
    """
    # Read suspect bytes
    if not suspect:
        raise HTTPException(status_code=400, detail="Missing suspect file upload")
    try:
        suspect_bytes = suspect.file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read suspect file: {e}")

    # Determine registered file bytes by CID or sha256 search
    from pathlib import Path
    DATA_PATH = Path(__file__).resolve().parents[1] / "data"
    MEDIA_FILE = DATA_PATH / "registered_media.json"
    reg_bytes = None
    reg_path_hint = None
    rec = None

    if ipfs_cid:
        # find first matching record with this cid, else fetch directly from gateway
        reg_url = None
        if MEDIA_FILE.exists():
            try:
                media = json.loads(MEDIA_FILE.read_text())
                rec = next((m for m in media if m.get('ipfs_cid') == ipfs_cid), None)
                if rec and rec.get('file_url'):
                    reg_url = rec.get('file_url')
            except Exception:
                reg_url = None
        if not reg_url:
            gateway_domain = getattr(settings, 'PINATA_GATEWAY_DOMAIN', None)
            if gateway_domain:
                if str(gateway_domain).startswith('http://') or str(gateway_domain).startswith('https://'):
                    base = str(gateway_domain).rstrip('/')
                else:
                    base = f"https://{str(gateway_domain).rstrip('/')}"
                reg_url = f"{base}/ipfs/{ipfs_cid}"
            else:
                reg_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_cid}"
        try:
            r = requests.get(reg_url, timeout=30)
            if r.status_code >= 400:
                raise HTTPException(status_code=502, detail=f"Failed to fetch registered file: {r.status_code}")
            reg_bytes = r.content
            reg_path_hint = reg_url
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch registered file: {e}")
    elif registered_sha256:
        if not MEDIA_FILE.exists():
            raise HTTPException(status_code=404, detail="registered_media.json not found")
        try:
            media = json.loads(MEDIA_FILE.read_text())
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read media database: {e}")
        # normalize sha
        key = registered_sha256[2:] if registered_sha256.startswith('0x') else registered_sha256
        rec = next((m for m in media if (m.get('sha256_hash') or '').replace('0x','').lower() == key.lower()), None)
        if not rec or not rec.get('file_url'):
            raise HTTPException(status_code=404, detail="Registered asset not found or missing file_url")
        reg_url = rec.get('file_url')
        try:
            r = requests.get(reg_url, timeout=30)
            if r.status_code >= 400:
                raise HTTPException(status_code=502, detail=f"Failed to fetch registered file: {r.status_code}")
            reg_bytes = r.content
            reg_path_hint = reg_url
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch registered file: {e}")
    else:
        raise HTTPException(status_code=400, detail="Provide either ipfs_cid or registered_sha256")

    # Compute using light_detectors (fast, dependency-free comparison)
    try:
        from ..light_detectors import compute_tamper_score_from_bytes
        result = compute_tamper_score_from_bytes(reg_bytes, suspect_bytes)
        result['registered_source'] = reg_path_hint
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {e}")


@router.get("/siamese_status")
def siamese_status():
    """Return availability info for Siamese inference backends (ONNX runtime, TensorFlow) and whether weights/models are present.

    This server build has Siamese support disabled locally; the endpoint reports
    availability flags to guide the client.
    """
    try:
        import os as _os
        onnx_path = _os.path.join(_os.path.dirname(__file__), '..', 'models', 'siamese.onnx')
        weights_path = _os.path.join(_os.path.dirname(__file__), '..', 'models', 'siamese_weights.h5')
        onnx_model_present = _os.path.exists(onnx_path)
        weights_present = _os.path.exists(weights_path)
        # Try importing runtimes
        onnx_runtime_available = False
        tf_available = False
        try:
            import onnxruntime as _ort  # type: ignore
            onnx_runtime_available = True
        except Exception:
            onnx_runtime_available = False
        try:
            import tensorflow as _tf  # type: ignore
            tf_available = True
        except Exception:
            tf_available = False

        return {
            'onnx_model_present': bool(onnx_model_present),
            'onnx_runtime_available': bool(onnx_runtime_available),
            'tf_available': bool(tf_available),
            'weights_present': bool(weights_present),
            'weights_path': weights_path if weights_present else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"siamese_status error: {e}")


@router.post("/precompute_embeddings")
def precompute_embeddings(skip_existing: bool = True):
    """Compute and persist MobileNet embeddings for all registered media.

    - skip_existing: if true, skip records that already have an 'embedding' field.
    The server will write embeddings as lists of floats into registered_media.json
    under the key 'embedding'. This is intended for small catalogs and dev use.
    """
    from pathlib import Path
    DATA_PATH = Path(__file__).resolve().parents[1] / "data"
    MEDIA_FILE = DATA_PATH / "registered_media.json"
    if not MEDIA_FILE.exists():
        raise HTTPException(status_code=404, detail="No registered_media.json found to update")

    try:
        media = json.loads(MEDIA_FILE.read_text())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read media file: {e}")

    from ..light_detectors import get_embedding_from_bytes

    updated = 0
    skipped = 0
    failed = []

    for item in media:
        try:
            if skip_existing and item.get('embedding'):
                skipped += 1
                continue

            # determine file url - prefer stored file_url, else use gateway + cid
            url = item.get('file_url')
            if not url and item.get('ipfs_cid'):
                cid = item.get('ipfs_cid')
                gateway_domain = getattr(settings, 'PINATA_GATEWAY_DOMAIN', None)
                if gateway_domain:
                    if str(gateway_domain).startswith('http://') or str(gateway_domain).startswith('https://'):
                        base = str(gateway_domain).rstrip('/')
                    else:
                        base = f"https://{str(gateway_domain).rstrip('/')}"
                    url = f"{base}/ipfs/{cid}"
                else:
                    url = f"https://gateway.pinata.cloud/ipfs/{cid}"

            if not url:
                failed.append({'signer': item.get('signer_address'), 'reason': 'no file_url or ipfs_cid'})
                continue

            try:
                r = requests.get(url, timeout=30)
                if r.status_code >= 400:
                    failed.append({'signer': item.get('signer_address'), 'reason': f'http {r.status_code}'})
                    continue
                b = r.content
            except Exception as e:
                failed.append({'signer': item.get('signer_address'), 'reason': f'fetch error: {e}'})
                continue

            try:
                emb = get_embedding_from_bytes(b)
                # store as list of floats
                item['embedding'] = [float(x) for x in emb.tolist()]
                updated += 1
            except Exception as e:
                failed.append({'signer': item.get('signer_address'), 'reason': f'embedding error: {e}'})
                continue
        except Exception:
            continue

    try:
        MEDIA_FILE.write_text(json.dumps(media, indent=2))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist embeddings: {e}")

    return {"updated": updated, "skipped": skipped, "failed_count": len(failed), "failed": failed}


@router.post("/siamese_check")
def siamese_check(suspect: UploadFile = File(None), ipfs_cid: str | None = None, registered_sha256: str | None = None, weights_path: str | None = None, threshold: float = 0.5):
    """Compare a suspect image against a registered asset using the Siamese model.

    Params:
      - suspect: multipart upload of the suspect image (required)
      - ipfs_cid OR registered_sha256: identifies the registered asset to compare against
      - weights_path: optional path to siamese weights file; if omitted the server will look for
        `backend/app/models/siamese_weights.h5` by default.
      - threshold: similarity threshold (0..1) above which the images are considered similar/authentic.

    Returns JSON: { available: bool, method: 'siamese'|'none', similarity: float, decision: 'authentic'|'altered', details }
    """
    try:
        if not suspect:
            raise HTTPException(status_code=400, detail="Missing suspect file upload")
        try:
            suspect_bytes = suspect.file.read()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read suspect file: {e}")

        # Determine registered file bytes (same logic as /compare)
        reg_bytes = None
        reg_path_hint = None
        from pathlib import Path
        DATA_PATH = Path(__file__).resolve().parents[1] / "data"
        MEDIA_FILE = DATA_PATH / "registered_media.json"
        if ipfs_cid:
            # try to find record and its file_url
            if MEDIA_FILE.exists():
                try:
                    media = json.loads(MEDIA_FILE.read_text())
                    rec = next((m for m in media if m.get('ipfs_cid') == ipfs_cid), None)
                    if rec and rec.get('file_url'):
                        reg_url = rec.get('file_url')
                    else:
                        reg_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_cid}"
                except Exception:
                    reg_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_cid}"
            else:
                reg_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_cid}"
            try:
                r = requests.get(reg_url, timeout=30)
                if r.status_code >= 400:
                    raise HTTPException(status_code=502, detail=f"Failed to fetch registered file: {r.status_code}")
                reg_bytes = r.content
                reg_path_hint = reg_url
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Failed to fetch registered file: {e}")
        elif registered_sha256:
            if not MEDIA_FILE.exists():
                raise HTTPException(status_code=404, detail="registered_media.json not found")
            try:
                media = json.loads(MEDIA_FILE.read_text())
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to read media database: {e}")
            key = registered_sha256[2:] if registered_sha256.startswith('0x') else registered_sha256
            rec = next((m for m in media if (m.get('sha256_hash') or '').replace('0x','').lower() == key.lower()), None)
            if not rec or not rec.get('file_url'):
                raise HTTPException(status_code=404, detail="Registered asset not found or missing file_url")
            reg_url = rec.get('file_url')
            try:
                r = requests.get(reg_url, timeout=30)
                if r.status_code >= 400:
                    raise HTTPException(status_code=502, detail=f"Failed to fetch registered file: {r.status_code}")
                reg_bytes = r.content
                reg_path_hint = reg_url
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Failed to fetch registered file: {e}")
        else:
            raise HTTPException(status_code=400, detail="Provide either ipfs_cid or registered_sha256")

        # Try to import siamese helper and load weights lazily
        try:
            from .. import siamese_model  # type: ignore
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Siamese model module not available: {e}")

        # Determine weights path
        if not weights_path:
            default_weights = Path(__file__).resolve().parents[1] / 'models' / 'siamese_weights.h5'
            weights_path = str(default_weights)

        # Build model structure and load weights
        try:
            model, _ = siamese_model.build_siamese_network()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to construct siamese model: {e}")

        try:
            siamese_model.load_weights(model, weights_path)
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Failed to load siamese weights from {weights_path}: {e}")

        # Run prediction
        try:
            sim = siamese_model.predict_similarity_from_bytes(model, reg_bytes, suspect_bytes)
            sim = float(max(0.0, min(1.0, sim)))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Siamese prediction failed: {e}")

        decision = 'authentic' if sim >= float(threshold) else 'altered'
        return {"available": True, "method": "siamese", "similarity": sim, "threshold": float(threshold), "decision": decision, "registered_source": reg_path_hint}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Siamese check error: {e}")
