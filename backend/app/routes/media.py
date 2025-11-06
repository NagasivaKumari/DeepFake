
import sys
from ..config import settings
print("[STARTUP] settings.PINATA_API_KEY:", getattr(settings, 'PINATA_API_KEY', None), file=sys.stderr)
print("[STARTUP] settings.PINATA_API_SECRET:", getattr(settings, 'PINATA_API_SECRET', None), file=sys.stderr)
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi import Depends
import requests
from ..schemas import GenerateRequest, UploadResponse, RegisterRequest, VerifySignatureRequest, DeriveKeysRequest
from typing import Dict
import hashlib
import time
import json
import secrets
from ..deepfake_detector import analyze_media_record
from ..light_detectors import compute_tamper_score_from_bytes, get_embedding_from_bytes, cosine_sim
import numpy as np
import tempfile

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


def _resolve_onchain_anchor(reg_key_hex: str):
    """Helper: read on-chain reg box and media box for a reg_key and return
    a tuple (registered_embedding_hash_or_None, reg_url_or_None).
    Raises HTTPException on algod failures.
    """
    try:
        oc = onchain_registration(reg_key_hex)
    except HTTPException as he:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to query on-chain registration: {e}")

    reg_box = oc.get('reg_box')
    media_box = oc.get('media_box')
    registered_embedding_hash = None
    reg_url = None

    # New reg box layout (contract v2): [optional 32-byte embedding_sha256][32-byte submitter][8-byte round]
    if reg_box and isinstance(reg_box, dict):
        raw_hex = reg_box.get('raw') or reg_box.get('value') or reg_box.get('bytes')
        if raw_hex and isinstance(raw_hex, str):
            try:
                raw_bytes = bytes.fromhex(raw_hex)
                # Minimum expected length is 32 (sender) + 8 (round) = 40
                if len(raw_bytes) >= 40:
                    # tail: last 40 bytes are sender(32) + round(8)
                    sender_bytes = raw_bytes[-40:-8]
                    round_bytes = raw_bytes[-8:]
                    try:
                        reg_round = int.from_bytes(round_bytes, 'big')
                    except Exception:
                        reg_round = None
                    # If there are leading bytes, treat them as embedding anchor
                    leading = raw_bytes[0:len(raw_bytes) - 40]
                    if len(leading) == 32:
                        registered_embedding_hash = leading.hex()
                    # Try to decode sender to Algorand address (best-effort)
                    try:
                        from algosdk.encoding import encode_address
                        owner_addr = encode_address(sender_bytes)
                        reg_url = reg_url or None
                        # attach owner info into reg_box for caller use
                        reg_box['owner_address'] = owner_addr
                        reg_box['registered_round'] = reg_round
                    except Exception:
                        # if algosdk not available, still provide hex
                        reg_box['owner_raw'] = sender_bytes.hex()
                        reg_box['registered_round'] = reg_round
            except Exception:
                pass

    if media_box and isinstance(media_box, dict):
        mtext = media_box.get('as_text')
        if mtext and ('Qm' in mtext or 'bafy' in mtext):
            reg_url = f"https://gateway.pinata.cloud/ipfs/{mtext.strip()}"

    return registered_embedding_hash, reg_url


def _validate_txid(txid: str, signer_address: str | None = None):
    """Validate a txid with the configured algod node.

    Ensures the tx exists and is confirmed. If signer_address is provided,
    ensure the transaction involves that address (as sender or receiver).
    Raises HTTPException on failure.
    """
    try:
        from ..algorand_app_utils import get_algod_client
        client = get_algod_client()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Algod client not available for tx validation: {e}")

    try:
        info = client.pending_transaction_info(txid)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Transaction not found or algod query failed: {e}")

    # Check for confirmation
    confirmed = info.get('confirmed-round') or info.get('confirmed_round')
    if not confirmed or int(confirmed) <= 0:
        raise HTTPException(status_code=400, detail="Transaction is not confirmed on-chain yet")

    # If signer_address provided, ensure it's involved in the tx
    if signer_address:
        signer_address = signer_address.strip().lower()
        try:
            tx = info.get('txn') or info
            # txn may be nested in different SDK versions
            payer = None
            receiver = None
            if isinstance(tx, dict):
                # Try common fields
                payer = (tx.get('snd') or tx.get('sender'))
                # inner txn fields
                if not payer and isinstance(tx.get('txn'), dict):
                    payer = tx.get('txn').get('snd') or tx.get('txn').get('sender')
                # receiver amount fields
                pay = info.get('payment-transaction') or info.get('payment_transaction') or {}
                receiver = pay.get('receiver')
        except Exception:
            payer = None
            receiver = None

        if not payer and not receiver:
            # can't verify involvement; be conservative and fail
            raise HTTPException(status_code=400, detail="Unable to verify transaction participants")

        if signer_address != (str(payer).lower() if payer else "") and signer_address != (str(receiver).lower() if receiver else ""):
            raise HTTPException(status_code=403, detail="Transaction does not involve the claimed signer address")

    return True


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
        # Load server mnemonic and user wallet address
        server_mnemonic = settings.LUTE_MNEMONIC.replace('"', '').strip()
        user_address = getattr(payload, 'wallet_address', None)
        if not server_mnemonic or not user_address:
            raise Exception("Missing server mnemonic or user wallet address")

        # Setup Algod client
        algod_address = settings.ALGOD_ADDRESS
        algod_token = settings.ALGOD_TOKEN
        algod_client = algod.AlgodClient(algod_token, algod_address)

        # Get server account
        sender_private_key = mnemonic.to_private_key(server_mnemonic)
        sender_address = mnemonic.to_public_key(server_mnemonic)

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


    # --- Algorand transaction logic: send 1 ALGO from server wallet to user wallet ---
    algo_tx = None
    explorer_url = None
    try:
        from algosdk import account, mnemonic, transaction
        # Load server mnemonic and user wallet address
        # Use DEPLOYER_MNEMONIC if set, else fallback to LUTE_MNEMONIC
        server_mnemonic = (settings.DEPLOYER_MNEMONIC or settings.LUTE_MNEMONIC)
        if server_mnemonic:
            server_mnemonic = server_mnemonic.replace('"', '').strip()
        user_address = getattr(payload, 'signer_address', None)
        if not user_address:
            raise Exception("Missing user wallet address (signer_address)")
        if not server_mnemonic:
            raise Exception("Server mnemonic is not configured; set DEPLOYER_MNEMONIC or LUTE_MNEMONIC")

        # Setup Algod client (supports ALGOD_ADDRESS or ALGOD_URL and optional headers)
        from ..algorand_app_utils import get_algod_client
        algod_client = get_algod_client()

        # Get server account
        sender_private_key = mnemonic.to_private_key(server_mnemonic)
        sender_address = account.address_from_private_key(sender_private_key)
        print(f"[ALGO DEBUG] Sender address: {sender_address}")

        # Get suggested params
        params = algod_client.suggested_params()

        # Amount to send (1 Algo = 1,000,000 microalgos)
        amount = 1000000

        # Create transaction
        unsigned_txn = transaction.PaymentTxn(
            sender_address,
            params,
            user_address,
            amount,
            None,
            "Media registration fee"
        )

        # Sign transaction
        signed_txn = unsigned_txn.sign(sender_private_key)

        # Send transaction
        txid = algod_client.send_transaction(signed_txn)
        algo_tx = txid
        # Use Algokit explorer link (consistent with other endpoints)
        explorer_url = f"https://lora.algokit.io/testnet/transaction/{txid}"
    except Exception as e:
        print(f"Algorand transaction error: {e}")
        algo_tx = None
        explorer_url = None
        # Also include the error in the response for client visibility
        reg_error = str(e)

    # If an algo_tx was created by server or provided in payload, validate it
    try:
        tx_to_validate = reg_data.get('algo_tx') or algo_tx
        if tx_to_validate:
            _validate_txid(tx_to_validate, signer_address=reg_data.get('signer_address'))
            # ensure we use the validated txid as the nonce
            algo_tx = tx_to_validate
    except HTTPException:
        # If enforce nonce is required, bubble up; otherwise log and continue
        if getattr(settings, 'ENFORCE_TX_NONCE', False):
            raise
        else:
            print(f"[WARN] Provided txid failed validation but ENFORCE_TX_NONCE is false; continuing: {tx_to_validate}")

    # If strict mode is enabled, require a txid-based nonce; otherwise we'd fall back to a random nonce
    if getattr(settings, 'ENFORCE_TX_NONCE', False) and not algo_tx:
        detail = f"Algorand transaction is required for registration and was not created: {reg_error if 'reg_error' in locals() else 'unknown error'}"
        raise HTTPException(status_code=502, detail=detail)

    # --- Save registration data ---
    from pathlib import Path
    import json
    DATA_PATH = Path(__file__).resolve().parents[1] / "data"
    DATA_PATH.mkdir(parents=True, exist_ok=True)
    MEDIA_FILE = DATA_PATH / "registered_media.json"

    # Fetch KYC info for wallet address
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
        # If an Algorand app is configured, check whether this media_key (sha256(H)) is already
        # registered on-chain. If so and the caller did not set allow_duplicate, reject to enforce
        # first-to-register semantics.
        try:
            app_id_str = getattr(settings, 'proofchain_app_id', None)
            if app_id_str:
                try:
                    from ..algorand_app_utils import get_algod_client
                    client = get_algod_client()
                    app_id = int(app_id_str)
                    # attempt to read the media box; some SDKs accept raw bytes for box name
                    try:
                        box_resp = client.application_box_by_name(app_id, K_bytes)
                    except Exception:
                        # try base64 name fallback like earlier helper
                        import base64 as _base64
                        try:
                            box_resp = client.application_box_by_name(app_id, _base64.b64encode(K_bytes).decode('utf-8'))
                        except Exception:
                            box_resp = None

                    if box_resp:
                        # If a box exists, decode into text if possible
                        owner_info = None
                        try:
                            if isinstance(box_resp, dict):
                                val = box_resp.get('value') or box_resp.get('box') or box_resp.get('bytes') or box_resp.get('data')
                            else:
                                val = box_resp
                            import base64 as _base64
                            if isinstance(val, str):
                                try:
                                    b = _base64.b64decode(val)
                                    owner_info = b.decode('utf-8', errors='replace')
                                except Exception:
                                    owner_info = val
                            elif isinstance(val, (bytes, bytearray)):
                                owner_info = bytes(val).hex()
                            else:
                                owner_info = str(val)
                        except Exception:
                            owner_info = str(box_resp)

                        # If the payload explicitly allows duplicates, continue; otherwise reject
                        allow_dup = bool(reg_data.get('allow_duplicate', False))
                        if not allow_dup:
                            raise HTTPException(status_code=409, detail={"error": "content_already_registered", "owner": owner_info})
                except Exception:
                    # ignore on-chain check failures here (best-effort); later code may act on missing algod
                    pass
        except Exception:
            # ignore any outer exceptions here (best-effort)
            pass
        # Prefer txid as nonce to guarantee uniqueness across submissions.
        # If txid is present, use its UTF-8 bytes (the contract will use the provided nonce bytes).
        # If not and an on-chain app is configured, derive nonce bytes the same way the contract
        # will when it falls back: Concat(Txn.sender(), Itob(Global.round())). This means we must
        # use the 32 raw address bytes (decoded via algosdk) + big-endian round bytes so server and
        # contract compute the same reg_key.
        try:
            if algo_tx:
                nonce_bytes = str(algo_tx).encode('utf-8')
            else:
                # If an Algorand app is configured try to obtain the current round and use raw address bytes
                app_id_str = getattr(settings, 'proofchain_app_id', None)
                if app_id_str:
                    try:
                        from ..algorand_app_utils import get_algod_client
                        from algosdk import encoding as _encoding
                        client = get_algod_client()
                        status = client.status()
                        current_round = status.get('last-round') or status.get('lastRound') or 0
                        sender_addr = reg_data.get('signer_address') or ''
                        try:
                            sender_raw = _encoding.decode_address(sender_addr)
                        except Exception:
                            sender_raw = sender_addr.encode('utf-8')
                        nonce_bytes = sender_raw + int(current_round).to_bytes(8, 'big')
                    except Exception:
                        # If algod not available, fall back to signer:timestamp random fallback
                        nonce_src = f"{reg_data.get('signer_address', '')}:{time.time_ns()}:{secrets.token_hex(4)}"
                        nonce_bytes = nonce_src.encode('utf-8')
                else:
                    # No on-chain app configured: use signer:timestamp random fallback
                    nonce_src = f"{reg_data.get('signer_address', '')}:{time.time_ns()}:{secrets.token_hex(4)}"
                    nonce_bytes = nonce_src.encode('utf-8')
            reg_key_bytes = hashlib.sha256(K_bytes + nonce_bytes).digest()
        except Exception as e:
            print(f"[WARN] Failed to construct nonce bytes for reg_key derivation: {e}")
            # fallback: use a random nonce to ensure uniqueness but warn
            nonce_bytes = f"{reg_data.get('signer_address','')}:{time.time_ns()}:{secrets.token_hex(8)}".encode('utf-8')
            reg_key_bytes = hashlib.sha256(K_bytes + nonce_bytes).digest()
        reg_key_hex = reg_key_bytes.hex()
        reg_data["content_key"] = content_key_hex
        reg_data["unique_reg_key"] = reg_key_hex
    except Exception as e:
        print(f"[WARN] Failed to compute content/registration keys: {e}")

    # Attempt to fetch the registered file (if file_url or ipfs_cid provided) and compute an
    # embedding + embedding_sha256 for anchoring. This is optional and best-effort: failures
    # are non-fatal but logged. Embedding computation prefers ONNX runtime if available (see
    # light_detectors.get_embedding_from_bytes) and may require ML deps.
    try:
        reg_file_bytes = None
        if file_url:
            try:
                r = requests.get(file_url, timeout=30)
                if r.status_code == 200:
                    reg_file_bytes = r.content
            except Exception:
                reg_file_bytes = None
        if not reg_file_bytes and ipfs_cid:
            try:
                gateway_domain = getattr(settings, 'PINATA_GATEWAY_DOMAIN', None)
                if gateway_domain:
                    if str(gateway_domain).startswith('http://') or str(gateway_domain).startswith('https://'):
                        base = str(gateway_domain).rstrip('/')
                    else:
                        base = f"https://{str(gateway_domain).rstrip('/')}"
                    reg_url = f"{base}/ipfs/{ipfs_cid}"
                else:
                    reg_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_cid}"
                r = requests.get(reg_url, timeout=30)
                if r.status_code == 200:
                    reg_file_bytes = r.content
            except Exception:
                reg_file_bytes = None

        if reg_file_bytes:
            try:
                emb = get_embedding_from_bytes(reg_file_bytes)
                # store embedding as list of floats and compute SHA-256 of float32 little-endian bytes
                import numpy as _np
                emb_arr = _np.asarray(emb, dtype=_np.float32)
                emb_bytes = emb_arr.tobytes()
                emb_hash = hashlib.sha256(emb_bytes).hexdigest()
                reg_data['embedding'] = [float(x) for x in emb_arr.tolist()]
                reg_data['embedding_sha256'] = emb_hash
            except Exception as e:
                print(f"[WARN] Failed to compute or store embedding at registration time: {e}")
    except Exception as e:
        print(f"[WARN] Unexpected failure while fetching/embedding registered file: {e}")

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
    MEDIA_FILE.write_text(json.dumps(media, indent=2))
    # --- Prepare unsigned application call for on-chain registration ---
    unsigned_app_txn = None
    unsigned_app_txn_b64 = None
    media_key_hex = None
    reg_key_hex = None
    try:
        from ..algorand_app_utils import build_register_app_call, build_register_atomic_group
        # app id from settings
        app_id_str = getattr(settings, 'proofchain_app_id', None)
        if app_id_str:
            app_id = int(app_id_str)
            sender_addr = getattr(payload, 'signer_address', None)
            sha256_hex = getattr(payload, 'sha256_hash', None)
            cid = ipfs_cid or reg_data.get('ipfs_cid') or ''
            if sender_addr and sha256_hex and cid:
                # If caller requested atomic registration, prepare a grouped payment+app txn
                if getattr(payload, 'use_atomic_registration', False) and (not algo_tx):
                    # Use server's deployer as payment receiver (server will receive the payment)
                    payment_receiver = getattr(settings, 'DEPLOYER_ADDRESS', None) or getattr(settings, 'LUTE_ADDRESS', None)
                    # default amount in microalgos (client pays small fee/amount); adjust as needed
                    payment_amount = int(getattr(settings, 'REGISTRATION_PAYMENT', 1000))
                    try:
                        pay_txn_dict, pay_txn_b64, app_txn_dict, app_txn_b64, media_key, reg_key = build_register_atomic_group(
                            sender=sender_addr,
                            app_id=app_id,
                            sha256_hex=sha256_hex,
                            cid=cid,
                            payment_receiver=payment_receiver or sender_addr,
                            payment_amount=payment_amount,
                            embedding_sha256_hex=reg_data.get('embedding_sha256'),
                        )
                        unsigned_app_txn = app_txn_dict
                        unsigned_app_txn_b64 = app_txn_b64
                        unsigned_payment_txn = pay_txn_dict
                        unsigned_payment_txn_b64 = pay_txn_b64
                        media_key_hex = media_key.hex()
                        reg_key_hex = reg_key.hex()
                    except Exception as e:
                        print(f"[WARN] Failed to prepare atomic unsigned group: {e}")
                else:
                    # fall back to single-app call builder; pass provided algo_tx as nonce when present
                    nonce = algo_tx or None
                    txn_dict, txn_b64, media_key, reg_key = build_register_app_call(
                        sender=sender_addr,
                        app_id=app_id,
                        sha256_hex=sha256_hex,
                        cid=cid,
                        nonce_str=nonce,
                        embedding_sha256_hex=reg_data.get('embedding_sha256'),
                    )
                    unsigned_app_txn = txn_dict
                    unsigned_app_txn_b64 = txn_b64
                    media_key_hex = media_key.hex()
                    reg_key_hex = reg_key.hex()
    except Exception as e:
        print(f"[WARN] Failed to prepare unsigned app call: {e}")

    response = {"status": "verified_locally", "payload": reg_data}
    # Expose the unique registration key (sha256(K||nonce)) as the canonical registration identifier
    if reg_key_hex:
        response["registration_hash"] = reg_key_hex
    if content_key_hex:
        response["content_key"] = content_key_hex
    if unsigned_app_txn:
        response["unsigned_app_call"] = {
            "txn": unsigned_app_txn,
            "txn_b64": unsigned_app_txn_b64,
            "media_key": media_key_hex,
            "reg_key": reg_key_hex,
        }
        # If we prepared an atomic payment txn, include it too so the client can sign both
        if 'unsigned_payment_txn' in locals():
            response['unsigned_payment_txn'] = {
                'txn': unsigned_payment_txn,
                'txn_b64': unsigned_payment_txn_b64,
            }
    return response


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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CID status check failed: {e}")


@router.get("/onchain_registration/{reg_key_hex}")
def onchain_registration(reg_key_hex: str, media_key_hex: str | None = None):
    """Fetch the on-chain box values for a registration key (and optional media key).

    Returns the box contents (owner address or stored CID bytes) when available.
    """
    try:
        from ..algorand_app_utils import get_algod_client
        client = get_algod_client()
        app_id_str = getattr(settings, 'proofchain_app_id', None)
        if not app_id_str:
            raise HTTPException(status_code=400, detail="proofchain_app_id not configured")
        app_id = int(app_id_str)

        def _fetch_box(key_hex: str):
            try:
                k = bytes.fromhex(key_hex)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Invalid hex for box name: {key_hex}")
            # Algod SDK exposes application_box_by_name(app_id, box_name) in modern versions.
            try:
                resp = client.application_box_by_name(app_id, k)
            except Exception as e:
                # Fallback: some SDK versions expect base64-encoded name
                try:
                    import base64 as _base64
                    resp = client.application_box_by_name(app_id, _base64.b64encode(k).decode('utf-8'))
                except Exception as e2:
                    raise HTTPException(status_code=501, detail=f"Algod client does not support box read or call failed: {e} | {e2}")

            # resp may be bytes, dict with 'value', or dict with 'box' keys depending on SDK
            val = None
            if isinstance(resp, dict):
                val = resp.get('value') or resp.get('box') or resp.get('bytes') or resp.get('data')
            else:
                val = resp

            # If the value is base64, try to decode; otherwise return raw as hex
            try:
                import base64 as _base64
                if isinstance(val, str):
                    try:
                        b = _base64.b64decode(val)
                        return {'raw': b.hex(), 'as_text': b.decode('utf-8', errors='replace')}
                    except Exception:
                        return {'raw': val}
                elif isinstance(val, (bytes, bytearray)):
                    return {'raw': bytes(val).hex(), 'as_text': bytes(val).decode('utf-8', errors='replace')}
                else:
                    return {'raw': val}
            except Exception:
                return {'raw': val}

        out = {}
        out['reg_key'] = reg_key_hex
        try:
            out['reg_box'] = _fetch_box(reg_key_hex)
        except HTTPException as he:
            out['reg_box_error'] = str(he.detail)

        if media_key_hex:
            try:
                out['media_key'] = media_key_hex
                out['media_box'] = _fetch_box(media_key_hex)
            except HTTPException as he:
                out['media_box_error'] = str(he.detail)

        return out
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"onchain_registration error: {e}")


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
def compare_media(suspect: UploadFile = File(None), ipfs_cid: str | None = None, registered_sha256: str | None = None, reg_key_hex: str | None = None, registered_embedding_hash: str | None = None):
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

    # Allow lookup by registration key (unique per submission) as primary identifier.
    # If `reg_key_hex` provided, try to find a local record with matching `unique_reg_key`.
    # If not found locally, try to fetch on-chain box to recover either an embedding hash or CID.
    # Otherwise, fall back to ipfs_cid or registered_sha256 lookup.
    # Determine registered file bytes by CID, sha256 search, or reg_key lookup
    from pathlib import Path
    DATA_PATH = Path(__file__).resolve().parents[1] / "data"
    MEDIA_FILE = DATA_PATH / "registered_media.json"

    reg_bytes = None
    reg_path_hint = None
    rec = None

    # If caller provided reg_key_hex, try to resolve it first
    if reg_key_hex:
        # Try to find a local record with this unique_reg_key
        if MEDIA_FILE.exists():
            try:
                media = json.loads(MEDIA_FILE.read_text())
                # Normalize reg_key_hex (no 0x prefix, lowercase)
                rk = reg_key_hex[2:] if reg_key_hex.startswith('0x') else reg_key_hex
                rk = rk.lower()
                rec = next((m for m in media if (m.get('unique_reg_key') or '').lower() == rk), None)
                if rec:
                    # If record has file_url or ipfs_cid, prefer that for fetching
                    if rec.get('file_url'):
                        reg_url = rec.get('file_url')
                    elif rec.get('ipfs_cid'):
                        reg_url = f"https://gateway.pinata.cloud/ipfs/{rec.get('ipfs_cid')}"
                    else:
                        reg_url = None
                else:
                    # Not found locally: try to read on-chain registration box to recover info
                    try:
                        oc = onchain_registration(reg_key_hex)
                        reg_box = oc.get('reg_box')
                        media_box = oc.get('media_box')
                        # reg_box may contain embedding hash as text
                        if reg_box and isinstance(reg_box, dict):
                            maybe_text = reg_box.get('as_text')
                            if maybe_text:
                                import re as _re
                                if _re.fullmatch(r"[0-9a-fA-F]{64}", maybe_text.strip()):
                                    registered_embedding_hash = maybe_text.strip()
                        # media_box may contain the CID or owner info; try to parse CID
                        if media_box and isinstance(media_box, dict):
                            mtext = media_box.get('as_text')
                            if mtext and ('Qm' in mtext or 'bafy' in mtext):
                                # assume this is an ipfs cid
                                reg_url = f"https://gateway.pinata.cloud/ipfs/{mtext.strip()}"
                            else:
                                reg_url = None
                        else:
                            reg_url = None
                    except HTTPException:
                        reg_url = None
                # If we have a reg_url from local or on-chain, fetch below
                if rec and rec.get('file_url'):
                    reg_url = rec.get('file_url')
            except Exception:
                rec = None

    if ipfs_cid:
        # find first matching record with this cid (if any) and try to fetch its file_url
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

    # If the caller provided an on-chain registration key but we still don't have registered bytes
    # or embedding hash, attempt to fetch on-chain registration info (best-effort). If the caller
    # explicitly wanted on-chain verification, onchain_registration will raise and we'll bubble that.
    if reg_key_hex and not registered_embedding_hash and not reg_bytes:
        try:
            registered_embedding_hash, maybe_reg_url = _resolve_onchain_anchor(reg_key_hex)
            if maybe_reg_url:
                reg_url = maybe_reg_url
        except HTTPException as he:
            # Fail closed if caller explicitly asked to check on-chain anchor
            raise HTTPException(status_code=502, detail=f"Failed to fetch on-chain registration: {he.detail}")

    else:
        # If none of the expected identifiers were provided and we couldn't resolve reg_key_hex,
        # signal a bad request.
        raise HTTPException(status_code=400, detail="Provide either ipfs_cid, registered_sha256, or reg_key_hex")

    # Fast-path: if registered record has a precomputed embedding, use it (no re-download or heavy compare)
    try:
        if rec and rec.get('embedding'):
            try:
                reg_emb = np.array(rec.get('embedding'), dtype=float)
                # If caller supplied a registered_embedding_hash, verify it matches stored embedding
                if registered_embedding_hash:
                    try:
                        import numpy as _np
                        emb_bytes = _np.asarray(rec.get('embedding'), dtype=_np.float32).tobytes()
                        emb_hash = hashlib.sha256(emb_bytes).hexdigest()
                    except Exception:
                        raise HTTPException(status_code=500, detail="Failed to compute stored embedding hash")
                    if emb_hash.lower() != registered_embedding_hash.lower():
                        # Anchor mismatch: fail with conflict so client knows anchor differs
                        raise HTTPException(status_code=409, detail="Stored embedding hash does not match provided on-chain anchor")
                sus_emb = get_embedding_from_bytes(suspect_bytes)
                sim = float(cosine_sim(reg_emb, sus_emb))
                # Default threshold; this can be tuned or passed as a query param
                thresh = 0.8
                decision = 'authentic' if sim >= thresh else 'altered'
                return {
                    'fast_path': True,
                    'similarity': sim,
                    'threshold': thresh,
                    'decision': decision,
                    'registered_source': reg_path_hint,
                }
            except Exception:
                # Fall back to full compare if embedding path fails
                pass

        # Compute using light_detectors (full, detailed comparison)
        result = compute_tamper_score_from_bytes(reg_bytes, suspect_bytes)
        result['registered_source'] = reg_path_hint
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {e}")


@router.get("/siamese_status")
def siamese_status():
    """Return availability info for Siamese inference backends (ONNX runtime, TensorFlow) and whether weights/models are present."""
    try:
        import importlib
        import os as _os
        # Check ONNX model file
        onnx_path = _os.path.join(_os.path.dirname(__file__), '..', 'models', 'siamese.onnx')
        onnx_model_present = _os.path.exists(onnx_path)
        onnx_runtime_available = False
        try:
            import onnxruntime as _ort
            onnx_runtime_available = True
        except Exception:
            onnx_runtime_available = False

        # Check TF availability and weights
        tf_available = False
        weights_present = False
        try:
            import tensorflow as _tf
            tf_available = True
        except Exception:
            tf_available = False

        weights_path = _os.path.join(_os.path.dirname(__file__), '..', 'models', 'siamese_weights.h5')
        weights_present = _os.path.exists(weights_path)

        return {
            'onnx_model_present': bool(onnx_model_present),
            'onnx_runtime_available': bool(onnx_runtime_available),
            'tf_available': bool(tf_available),
            'weights_present': bool(weights_present),
            'weights_path': weights_path if weights_present else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"siamese_status error: {e}")


@router.get('/registered_embedding')
def registered_embedding(sha256_hash: str | None = None, cid: str | None = None):
    """Return a persisted embedding (if any) for the given registered asset.

    This lets verification logic compare against the embedding stored in the
    registry (off-chain) without downloading the full image.
    """
    try:
        from pathlib import Path
        DATA_PATH = Path(__file__).resolve().parents[1] / 'data'
        MEDIA_FILE = DATA_PATH / 'registered_media.json'
        if not MEDIA_FILE.exists():
            raise HTTPException(status_code=404, detail='No registered_media.json found')
        media = json.loads(MEDIA_FILE.read_text())
        rec = None
        if cid:
            rec = next((m for m in media if m.get('ipfs_cid') == cid), None)
        elif sha256_hash:
            key = sha256_hash[2:] if sha256_hash.startswith('0x') else sha256_hash
            rec = next((m for m in media if (m.get('sha256_hash') or '').replace('0x','').lower() == key.lower()), None)
        else:
            raise HTTPException(status_code=400, detail='Provide sha256_hash or cid')

        if not rec:
            raise HTTPException(status_code=404, detail='Registered asset not found')
        emb = rec.get('embedding')
        if not emb:
            return {'available': False, 'embedding': None}
        # Compute SHA-256 of the embedding bytes (float32 little-endian) for anchoring
        try:
            import numpy as _np
            emb_arr = _np.asarray(emb, dtype=_np.float32)
            emb_bytes = emb_arr.tobytes()
            emb_hash = hashlib.sha256(emb_bytes).hexdigest()
        except Exception:
            emb_hash = None
        return {'available': True, 'embedding': emb, 'embedding_sha256': emb_hash, 'signer_address': rec.get('signer_address')}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'registered_embedding error: {e}')
    


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
def siamese_check(suspect: UploadFile = File(None), ipfs_cid: str | None = None, registered_sha256: str | None = None, weights_path: str | None = None, threshold: float = 0.5, registered_embedding_hash: str | None = None, reg_key_hex: str | None = None):
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
        # If reg_key_hex provided, try to resolve it first (local DB or on-chain)
        if reg_key_hex:
            if MEDIA_FILE.exists():
                try:
                    media = json.loads(MEDIA_FILE.read_text())
                    rk = reg_key_hex[2:] if reg_key_hex.startswith('0x') else reg_key_hex
                    rk = rk.lower()
                    rec = next((m for m in media if (m.get('unique_reg_key') or '').lower() == rk), None)
                    if rec and rec.get('file_url'):
                        reg_url = rec.get('file_url')
                    elif rec and rec.get('ipfs_cid'):
                        reg_url = f"https://gateway.pinata.cloud/ipfs/{rec.get('ipfs_cid')}"
                except Exception:
                    rec = None
            if not rec:
                # attempt on-chain fetch to recover embedding hash or cid
                try:
                    oc = onchain_registration(reg_key_hex)
                    reg_box = oc.get('reg_box')
                    media_box = oc.get('media_box')
                    if reg_box and isinstance(reg_box, dict):
                        maybe_text = reg_box.get('as_text')
                        if maybe_text:
                            import re as _re
                            if _re.fullmatch(r"[0-9a-fA-F]{64}", maybe_text.strip()):
                                registered_embedding_hash = maybe_text.strip()
                    if media_box and isinstance(media_box, dict):
                        mtext = media_box.get('as_text')
                        if mtext and ('Qm' in mtext or 'bafy' in mtext):
                            reg_url = f"https://gateway.pinata.cloud/ipfs/{mtext.strip()}"
                except HTTPException as he:
                    raise HTTPException(status_code=502, detail=f"Failed to fetch on-chain registration: {he.detail}")

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
            raise HTTPException(status_code=400, detail="Provide either ipfs_cid, registered_sha256, or reg_key_hex")

        # If the caller provided an on-chain registration key, try to fetch an on-chain anchor
        if reg_key_hex and not registered_embedding_hash:
            try:
                registered_embedding_hash, maybe_reg_url = _resolve_onchain_anchor(reg_key_hex)
                if maybe_reg_url:
                    reg_url = maybe_reg_url
            except HTTPException as he:
                raise HTTPException(status_code=502, detail=f"Failed to fetch on-chain registration: {he.detail}")

        # Fast path: if registered record has a precomputed embedding, use it (no file download or TF required)
        try:
            if MEDIA_FILE.exists() and (ipfs_cid or registered_sha256):
                # try to find record we already extracted above (rec may be None if earlier path failed)
                if not rec:
                    try:
                        media = json.loads(MEDIA_FILE.read_text())
                        if ipfs_cid:
                            rec = next((m for m in media if m.get('ipfs_cid') == ipfs_cid), None)
                        else:
                            key = registered_sha256[2:] if registered_sha256.startswith('0x') else registered_sha256
                            rec = next((m for m in media if (m.get('sha256_hash') or '').replace('0x','').lower() == key.lower()), None)
                    except Exception:
                        rec = None

            if rec and rec.get('embedding'):
                try:
                    reg_emb = np.array(rec.get('embedding'), dtype=float)
                    # If caller supplied a registered_embedding_hash, verify it matches stored embedding
                    if registered_embedding_hash:
                        try:
                            import numpy as _np
                            emb_bytes = _np.asarray(rec.get('embedding'), dtype=_np.float32).tobytes()
                            emb_hash = hashlib.sha256(emb_bytes).hexdigest()
                        except Exception:
                            raise HTTPException(status_code=500, detail="Failed to compute stored embedding hash")
                        if emb_hash.lower() != registered_embedding_hash.lower():
                            raise HTTPException(status_code=409, detail="Stored embedding hash does not match provided on-chain anchor")

                    sus_emb = get_embedding_from_bytes(suspect_bytes)
                    sim = float(cosine_sim(reg_emb, sus_emb))
                    decision = 'authentic' if sim >= float(threshold) else 'altered'
                    return {"available": True, "method": "embedding_fast", "similarity": sim, "threshold": float(threshold), "decision": decision, "registered_source": rec.get('file_url') or rec.get('ipfs_cid'), "embedding_hash_verified": bool(registered_embedding_hash is None or emb_hash.lower() == registered_embedding_hash.lower())}
                except HTTPException:
                    raise
                except Exception:
                    # fall through to siamese/bytes-based path below
                    pass

            # If caller provided a registered_embedding_hash but we don't have a stored embedding,
            # attempt to compute the registered embedding from the fetched bytes and verify the hash.
            if registered_embedding_hash and (not rec or not rec.get('embedding')):
                # We must have reg_bytes to compute
                if not reg_bytes:
                    raise HTTPException(status_code=400, detail="No stored embedding and registered file not available to verify provided embedding hash")
                try:
                    # compute embedding for registered bytes
                    reg_emb_candidate = get_embedding_from_bytes(reg_bytes)
                    import numpy as _np
                    emb_bytes = _np.asarray(reg_emb_candidate, dtype=_np.float32).tobytes()
                    emb_hash_candidate = hashlib.sha256(emb_bytes).hexdigest()
                    if emb_hash_candidate.lower() != registered_embedding_hash.lower():
                        raise HTTPException(status_code=409, detail="Computed embedding from registered file does not match provided on-chain anchor")
                    # if it matches, set rec so later logic can reuse
                    rec = rec or {}
                    rec['embedding'] = reg_emb_candidate.tolist()
                except Exception as e:
                    # Failed to compute embedding from the registered file
                    raise HTTPException(status_code=500, detail=f"Failed to compute registered embedding: {e}")

            # Try to import siamese helper and load weights lazily
            try:
                from .. import siamese_model
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

            # Run prediction on raw bytes (registered file bytes vs suspect bytes)
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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Siamese check error: {e}")
