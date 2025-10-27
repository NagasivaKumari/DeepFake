import sys
print("[STARTUP] settings.PINATA_API_KEY:", getattr(settings, 'PINATA_API_KEY', None), file=sys.stderr)
print("[STARTUP] settings.PINATA_API_SECRET:", getattr(settings, 'PINATA_API_SECRET', None), file=sys.stderr)
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi import Depends
import requests
from ..config import settings
from ..schemas import GenerateRequest, UploadResponse, RegisterRequest, VerifySignatureRequest
from typing import Dict

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

# Try to import Lute SDK verification helper; if not available, fall back to eth-account recovery
try:
    from .lute_client import lute_client
    LUTE_AVAILABLE = True
except Exception:
    lute_client = None
    LUTE_AVAILABLE = False

try:
    from eth_account.messages import encode_defunct
    from eth_account import Account
    ETH_ACCOUNT_AVAILABLE = True
except Exception:
    encode_defunct = None
    Account = None
    ETH_ACCOUNT_AVAILABLE = False

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
        explorer_url = f"https://testnet.algoexplorer.io/tx/{txid}"
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
    print("[UPLOAD] settings.PINATA_API_KEY:", settings.PINATA_API_KEY, file=sys.stderr)
    print("[UPLOAD] settings.PINATA_API_SECRET:", settings.PINATA_API_SECRET, file=sys.stderr)
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
    files = {"file": (file.filename, file.file, file.content_type)}
    headers = {
        "pinata_api_key": settings.PINATA_API_KEY,
        "pinata_secret_api_key": settings.PINATA_API_SECRET,
    }
    print(f"[DEBUG] Sending file '{file.filename}' to Pinata...")
    print(f"[DEBUG] Pinata headers: {headers}")
    try:
        resp = requests.post(pinata_url, files=files, headers=headers, timeout=120)
        print(f"[DEBUG] Pinata response status: {resp.status_code}")
        print(f"[DEBUG] Pinata response text: {resp.text}")
    except Exception as e:
        print(f"[ERROR] Pinata upload request failed: {e}")
        raise HTTPException(status_code=502, detail=f"Pinata upload request failed: {e}")

    if resp.status_code >= 400:
        print(f"[ERROR] Pinata upload error: {resp.status_code} {resp.text}")
        raise HTTPException(status_code=502, detail=f"Pinata upload error: {resp.status_code} {resp.text}")

    try:
        data = resp.json()
        print(f"[DEBUG] Pinata response JSON: {data}")
    except Exception as e:
        print(f"[ERROR] Pinata response not JSON: {resp.text}")
        raise HTTPException(status_code=502, detail=f"Pinata response not JSON: {resp.text}")

    ipfs_hash = data.get("IpfsHash")
    file_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}" if ipfs_hash else None
    if not ipfs_hash:
        print(f"[ERROR] Pinata response missing IpfsHash: {data}")
        raise HTTPException(status_code=502, detail=f"Pinata response missing IpfsHash: {data}")
    print(f"[DEBUG] Pinata upload successful. IPFS CID: {ipfs_hash}")
    return {"file_url": file_url, "ipfs_cid": ipfs_hash}


@router.post("/register")
def register_media(payload: RegisterRequest):
    """Register media metadata with the on-chain registry (Algorand) or store locally.

    This endpoint verifies the creator signature and returns a verified payload. The caller
    typically uses the returned data to prepare an Algorand transaction (unsigned) that the
    client signs with Lute and submits to Algorand.
    """
    # Verify signature first (EIP-191 / personal_sign style)
    # Verify signature using Lute SDK if available; otherwise fall back to eth-account
    if LUTE_AVAILABLE:
        try:
            ok = lute_client.verify_signature(payload.signer_address, payload.metadata_signature, payload.sha256_hash)
            if not ok:
                raise HTTPException(status_code=403, detail="Lute signature verification failed")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Lute verification error: {e}")
    elif ETH_ACCOUNT_AVAILABLE:
        try:
            message = payload.sha256_hash
            encoded = encode_defunct(text=message)
            recovered = Account.recover_message(encoded, signature=payload.metadata_signature)
            if recovered.lower() != payload.signer_address.lower():
                raise HTTPException(status_code=403, detail="Signature does not match signer address")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Signature verification failed: {str(e)}")
    else:
        raise HTTPException(status_code=500, detail="No signature verification method available (install Lute SDK or eth-account)")

    # For on-chain registration we will create an Algorand transaction note or forward to registry as configured.
    # The registration endpoint returns success: for now echo the payload (backend will not forward to external registry)
    # Persist the registration to file for GET /api/registrations
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
            kyc_records = json.loads(KYC_FILE.read_text())
            for kyc in kyc_records:
                if kyc.get("wallet_address", "").lower() == payload.signer_address.lower():
                    kyc_email = kyc.get("email")
                    kyc_phone = kyc.get("phone")
                    break
        except Exception:
            pass


    # Ensure ipfs_cid and file_url are present in registration
    # If not present in payload, try to fetch from last upload
    ipfs_cid = payload.ipfs_cid if hasattr(payload, 'ipfs_cid') and payload.ipfs_cid else None
    file_url = payload.file_url if hasattr(payload, 'file_url') and payload.file_url else None
    # If missing, try to fetch from previous uploads (not implemented here)

    # Algorand transaction logic (finalized)
    algo_tx = None
    try:
        # If transaction is already sent via Lute wallet, get txid from payload or environment
        if hasattr(payload, 'algo_tx') and payload.algo_tx:
            algo_tx = payload.algo_tx
        # Optionally, extract from Lute SDK response if available
        # If you have a transaction response object, set algo_tx = response['txid']
    except Exception as e:
        print(f"Algorand transaction error: {e}")
        algo_tx = None

    # Add explorer link to registration data
    explorer_url = f"https://testnet.algoexplorer.io/tx/{algo_tx}" if algo_tx else None

    reg_data = payload.dict()
    reg_data["email"] = kyc_email
    reg_data["phone"] = kyc_phone
    reg_data["ipfs_cid"] = ipfs_cid
    reg_data["file_url"] = file_url
    reg_data["algo_tx"] = algo_tx
    reg_data["algo_explorer_url"] = explorer_url

    reg_data = payload.dict()
    reg_data["email"] = kyc_email
    reg_data["phone"] = kyc_phone
    reg_data["ipfs_cid"] = ipfs_cid
    reg_data["file_url"] = file_url
    reg_data["algo_tx"] = algo_tx
    reg_data["algo_explorer_url"] = explorer_url

    try:
        if MEDIA_FILE.exists():
            media = json.loads(MEDIA_FILE.read_text())
        else:
            media = []
    except Exception:
        media = []
    media.append(reg_data)
    MEDIA_FILE.write_text(json.dumps(media, indent=2))
    return {"status": "verified_locally", "payload": reg_data}


@router.post("/verify")
def verify_signature(payload: VerifySignatureRequest) -> Dict[str, str]:
    """Verify a signature and return the recovered address (EVM-style signatures).

    This is useful for verifying that the client signed the payload before the backend performs an action.
    """
    # Try Lute verification first
    if LUTE_AVAILABLE:
        try:
            result = lute_client.verify_signature_payload(payload.signature, payload.message)
            return {"address": result}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Lute verification failed: {e}")

    if ETH_ACCOUNT_AVAILABLE:
        try:
            encoded = encode_defunct(text=payload.message)
            recovered = Account.recover_message(encoded, signature=payload.signature)
            return {"address": recovered}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Signature verification failed: {str(e)}")

    raise HTTPException(status_code=500, detail="No verification method available")
