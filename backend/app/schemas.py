from pydantic import BaseModel, Field
from typing import Optional


class GenerateRequest(BaseModel):
    prompt: str
    width: Optional[int] = 1024
    height: Optional[int] = 1024
    model: Optional[str] = None


class UploadResponse(BaseModel):
    file_url: str
    ipfs_cid: Optional[str] = None


class RegisterRequest(BaseModel):
    file_url: str
    file_name: str
    file_type: Optional[str]
    sha256_hash: str
    perceptual_hash: Optional[str]
    ipfs_cid: Optional[str]
    ai_model: Optional[str]
    generation_time: Optional[str]
    notes: Optional[str]
    algo_tx: Optional[str]
    algo_explorer_url: Optional[str]
    status: Optional[str] = Field(default="verified")
    metadata_signature: Optional[str] = None
    signer_address: str
    allow_duplicate: Optional[bool] = False
    # When true, server will prepare an unsigned atomic group: [payment_txn, app_call]
    # The payment txn's txid will be used as the nonce inside the app call so client can
    # sign both txns atomically and guarantee the on-chain reg_key uses the payment txid.
    use_atomic_registration: Optional[bool] = False


class VerifySignatureRequest(BaseModel):
    message: str
    signature: str


class DeriveKeysRequest(BaseModel):
    """Request to derive content_key and unique_reg_key on the backend.

    - sha256_hash: hex string of H = sha256(file_bytes)
    - nonce: optional nonce; when provided use as txid/unique seed; if omitted, server will fallback
    - signer_address: optional address used in fallback mode
    """
    sha256_hash: str
    nonce: Optional[str] = None
    signer_address: Optional[str] = None


class KYCStartRequest(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    country: Optional[str] = None
    dob: Optional[str] = None
    wallet_address: str


class KYCRecord(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    country: Optional[str] = None
    dob: Optional[str] = None
    status: str = "pending"
    email_code: Optional[str] = None
    otp_code: Optional[str] = None


class EmailVerifyRequest(BaseModel):
    kyc_id: str
    code: str


class OtpRequest(BaseModel):
    kyc_id: str


class OtpVerifyRequest(BaseModel):
    kyc_id: str
    otp: str

