import os
from pydantic import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    AI_API_URL: str | None = None
    AI_API_KEY: str | None = None

    LUTE_SDK_ENDPOINT: str | None = None
    LUTE_SDK_API_KEY: str | None = None
    # Pinata
    PINATA_API_KEY: str | None = None
    PINATA_API_SECRET: str | None = None

    # Algorand
    ALGOD_URL: str | None = None
    ALGOD_ADDRESS: str | None = None
    ALGOD_TOKEN: str | None = None
    ALGOD_HEADER_KV: str | None = None

    LUTE_MNEMONIC: str | None = None

    UVICORN_HOST: str | None = None
    UVICORN_PORT: int | None = None

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        # Always load .env from backend dir, even if run from parent
        env_file = str(Path(__file__).resolve().parent.parent / ".env")
        env_file_encoding = "utf-8"

settings = Settings()

# Debug print to confirm Pinata keys loaded at startup
def _mask_secret(s: str | None) -> str:
    if not s:
        return "<missing>"
    s = str(s)
    if len(s) <= 8:
        return s
    return f"{s[:4]}...{s[-4:]}"

print(f"[CONFIG] PINATA_API_KEY={_mask_secret(settings.PINATA_API_KEY)}")
print(f"[CONFIG] PINATA_API_SECRET={_mask_secret(settings.PINATA_API_SECRET)}")
