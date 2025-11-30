from fastapi import APIRouter, HTTPException
from app.utils_email import send_email
from ..schemas import (
    KYCStartRequest,
    KYCRecord,
    EmailVerifyRequest,
    OtpRequest,
    OtpVerifyRequest,
)
from fastapi import Request
from typing import List
import uuid
import json
from pathlib import Path
import random
from cryptography.fernet import Fernet
import os
from fastapi.responses import JSONResponse
from pyotp import TOTP

router = APIRouter(prefix="/api", tags=["auth"])

DATA_PATH = Path(__file__).resolve().parents[1] / "data"
DATA_PATH.mkdir(parents=True, exist_ok=True)
KYC_FILE = DATA_PATH / "kyc.json"

# Load encryption key from environment variable
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    raise RuntimeError("ENCRYPTION_KEY environment variable is not set.")

encryptor = Fernet(ENCRYPTION_KEY)

from fastapi import Query

@router.delete("/admin/kyc/{kyc_id}")
def delete_kyc(kyc_id: str):
    data = load_kyc()
    if kyc_id not in data:
        raise HTTPException(status_code=404, detail="KYC id not found")
    del data[kyc_id]
    save_kyc(data)
    return {"kyc_id": kyc_id, "deleted": True}
from fastapi import APIRouter, HTTPException
from app.utils_email import send_email
from ..schemas import (
    KYCStartRequest,
    KYCRecord,
    EmailVerifyRequest,
    OtpRequest,
    OtpVerifyRequest,
)
from fastapi import Request
from typing import List
import uuid
import json
from pathlib import Path
import random
from cryptography.fernet import Fernet
import os
from fastapi.responses import JSONResponse
from pyotp import TOTP

router = APIRouter(prefix="/api", tags=["auth"])

DATA_PATH = Path(__file__).resolve().parents[1] / "data"
DATA_PATH.mkdir(parents=True, exist_ok=True)
KYC_FILE = DATA_PATH / "kyc.json"

# Load encryption key from environment variable
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    raise RuntimeError("ENCRYPTION_KEY environment variable is not set.")

encryptor = Fernet(ENCRYPTION_KEY)

from fastapi import Query
@router.get("/kyc/status")
def kyc_status(address: str = Query(...)):
    data = load_kyc()
    # Find the first record with a matching address (case-insensitive)
    for rec in data.values():
        if not rec or not isinstance(rec, dict):
            print(f"Skipping invalid KYC record: {type(rec)} {rec}")
            continue
        wallet = rec.get("wallet_address")
        if not wallet or not isinstance(wallet, str):
            continue
        if wallet.lower() == address.lower():
            # Expose useful KYC fields for UI enrichment: email, phone and inferred verification flags.
            status = rec.get("status", "not_started")
            email = rec.get("email")
            phone = rec.get("phone")
            kyc_id = rec.get("id")
            # Infer boolean flags from status or explicit fields if present
            email_verified = bool(rec.get("email_verified") or (status in ("email_verified", "verified", "approved")))
            phone_verified = bool(rec.get("phone_verified") or (status in ("verified", "approved")))
            return {
                "status": status,
                "kyc_id": kyc_id,
                "email": email,
                "phone": phone,
                "email_verified": email_verified,
                "phone_verified": phone_verified,
            }
    return {"status": "not_started"}

def load_kyc():
    if not KYC_FILE.exists():
        return {}
    try:
        encrypted_data = KYC_FILE.read_text()
        decrypted_data = encryptor.decrypt(encrypted_data.encode()).decode()
        return json.loads(decrypted_data)
    except Exception as e:
        print(f"Failed to load KYC data: {e}")
        return {}

def save_kyc(data):
    try:
        json_data = json.dumps(data, indent=2)
        encrypted_data = encryptor.encrypt(json_data.encode()).decode()
        KYC_FILE.write_text(encrypted_data)
    except Exception as e:
        print(f"Failed to save KYC data: {e}")

@router.post("/kyc/start", response_model=KYCRecord)
def start_kyc(payload: KYCStartRequest, request: Request):
    """Start a lightweight KYC flow: store basic user info and return a KYC id."""
    data = load_kyc()
    kyc_id = str(uuid.uuid4())
    # Always require wallet_address
    wallet_address = getattr(payload, 'wallet_address', None)
    if not wallet_address:
        raise HTTPException(status_code=400, detail="Wallet address is required for KYC registration")

    # Block duplicate KYC for same wallet address
    for rec in data.values():
        if rec and isinstance(rec, dict):
            if rec.get("wallet_address", "").lower() == wallet_address.lower():
                raise HTTPException(status_code=400, detail="You have already completed KYC with this wallet address.")

    # Build record from payload; keep values exactly as received
    rec = {
        "id": kyc_id,
        "full_name": payload.full_name,
        "email": payload.email,
        "phone": payload.phone,
        "country": payload.country,
        "dob": payload.dob,
        "status": "email_pending",
        "email_code": None,
        "otp_code": None,
        "wallet_address": wallet_address,
    }
    # Debug: log incoming payload and constructed record for troubleshooting
    try:
        print(f"[KYC] start_kyc payload: {payload.dict()}")
        print(f"[KYC] constructed record (before codes): {{'id': kyc_id, 'full_name': payload.full_name, 'email': payload.email, 'phone': payload.phone, 'wallet_address': wallet_address}}")
    except Exception:
        # Avoid crashing on logging
        pass
    # generate a short email code and store
    code = f"{random.randint(100000,999999)}"
    rec["email_code"] = code
    data[kyc_id] = rec
    save_kyc(data)
    # Send the email with the code
    try:
        send_email(
            to_email=payload.email,
            subject="Your ProofChain KYC Verification Code",
            body=f"Your ProofChain verification code is: {code}"
        )
    except Exception as e:
        print(f"Failed to send email: {e}")
    rec_no_code = rec.copy()
    rec_no_code["email_code"] = None
    return rec_no_code


@router.post("/kyc/send_email")
def send_email_verification(payload: EmailVerifyRequest):
    data = load_kyc()
    rec = data.get(payload.kyc_id)
    if not rec:
        raise HTTPException(status_code=404, detail="KYC id not found")
    # generate/reset code
    code = f"{random.randint(100000,999999)}"
    rec["email_code"] = code
    rec["status"] = "email_pending"
    data[payload.kyc_id] = rec
    save_kyc(data)
    # Send the email with the code
    try:
        send_email(
            to_email=rec["email"],
            subject="Your ProofChain KYC Verification Code",
            body=f"Your ProofChain verification code is: {code}"
        )
    except Exception as e:
        print(f"Failed to send email: {e}")
    return {"kyc_id": payload.kyc_id, "status": "email_pending"}


@router.post("/kyc/verify_email")
def verify_email(payload: EmailVerifyRequest):
    data = load_kyc()
    rec = data.get(payload.kyc_id)
    if not rec:
        raise HTTPException(status_code=404, detail="KYC id not found")
    if rec.get("email_code") != payload.code:
        raise HTTPException(status_code=400, detail="Invalid code")
    rec["status"] = "email_verified"
    # generate OTP for phone/email confirmation
    otp = f"{random.randint(100000,999999)}"
    rec["otp_code"] = otp
    data[payload.kyc_id] = rec
    save_kyc(data)
    # Return otp in dev response
    return {"kyc_id": payload.kyc_id, "otp": otp}


@router.post("/kyc/send_otp")
def send_otp(payload: OtpRequest):
    data = load_kyc()
    rec = data.get(payload.kyc_id)
    if not rec:
        raise HTTPException(status_code=404, detail="KYC id not found")
    otp = f"{random.randint(100000,999999)}"
    rec["otp_code"] = otp
    rec["status"] = "otp_sent"
    data[payload.kyc_id] = rec
    save_kyc(data)
    return {"kyc_id": payload.kyc_id, "otp": otp}


@router.post("/kyc/verify_otp")
def verify_otp(payload: OtpVerifyRequest):
    data = load_kyc()
    rec = data.get(payload.kyc_id)
    if not rec:
        raise HTTPException(status_code=404, detail="KYC id not found")
    if rec.get("otp_code") != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    rec["status"] = "verified"
    data[payload.kyc_id] = rec
    save_kyc(data)
    return {"kyc_id": payload.kyc_id, "status": "verified"}


@router.get("/admin/kyc", response_model=List[KYCRecord])
def list_kyc():
    data = load_kyc()
    return list(data.values())


@router.post("/admin/kyc/{kyc_id}/approve")
def approve_kyc(kyc_id: str):
    data = load_kyc()
    rec = data.get(kyc_id)
    if not rec:
        raise HTTPException(status_code=404, detail="KYC id not found")
    rec["status"] = "approved"
    data[kyc_id] = rec
    save_kyc(data)
    return {"kyc_id": kyc_id, "status": "approved"}


@router.post("/admin/kyc/{kyc_id}/reject")
def reject_kyc(kyc_id: str):
    data = load_kyc()
    rec = data.get(kyc_id)
    if not rec:
        raise HTTPException(status_code=404, detail="KYC id not found")
    rec["status"] = "rejected"
    data[kyc_id] = rec
    save_kyc(data)
    return {"kyc_id": kyc_id, "status": "rejected"}

# Endpoint to generate QR code for 2FA setup
@router.get("/2fa/generate")
def generate_2fa_qr(user_id: str):
    secret = TOTP.random_base32()
    totp = TOTP(secret)
    otpauth_url = totp.provisioning_uri(name=user_id, issuer_name="DeepFake Admin")
    return JSONResponse(content={"secret": secret, "otpauth_url": otpauth_url})

# Endpoint to verify 2FA code
@router.post("/2fa/verify")
def verify_2fa_code(user_id: str, code: str):
    # Retrieve the secret for the user (this should be stored securely in a database)
    secret = "JBSWY3DPEHPK3PXP"  # Example secret; replace with actual retrieval logic
    totp = TOTP(secret)
    if totp.verify(code):
        return JSONResponse(content={"verified": True})
    else:
        raise HTTPException(status_code=400, detail="Invalid 2FA code")
