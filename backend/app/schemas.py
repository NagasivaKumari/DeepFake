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
    blockchain_tx: Optional[str]
    status: Optional[str] = Field(default="verified")
    metadata_signature: str
    signer_address: str


class VerifySignatureRequest(BaseModel):
    message: str
    signature: str


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

