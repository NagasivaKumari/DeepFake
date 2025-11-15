import os
from pathlib import Path

# Support both pydantic v2 (BaseSettings moved to pydantic-settings)
# and pydantic v1 where BaseSettings lived in pydantic.
try:
    from pydantic_settings import BaseSettings
except Exception:
    from pydantic import BaseSettings

# pydantic v2 exposes ConfigDict for model configuration; use it when available
try:
    # type: ignore
    from pydantic import ConfigDict  # v2
    HAS_CONFIGDICT = True
except Exception:
    HAS_CONFIGDICT = False

# Path to .env used by Settings
ENV_PATH = str(Path(__file__).resolve().parent.parent / ".env")

# Try to populate os.environ from the .env file early so reloader/child processes
# and different import styles (app.main vs backend.app.main) reliably see the
# same variables. This is a no-op if python-dotenv is not installed.
try:
    # Lazy import to avoid adding a hard dependency; this is optional and won't
    # crash if python-dotenv isn't present.
    from dotenv import load_dotenv
    load_dotenv(ENV_PATH)
except Exception:
    pass

class Settings(BaseSettings):
    AI_API_URL: str | None = None
    AI_API_KEY: str | None = None

    LUTE_SDK_ENDPOINT: str | None = None
    LUTE_SDK_API_KEY: str | None = None
    # Pinata
    PINATA_API_KEY: str | None = None
    PINATA_API_SECRET: str | None = None
    # Optional custom gateway domain (e.g. green-electric-crab-936.mypinata.cloud or https://green-electric-crab-936.mypinata.cloud)
    PINATA_GATEWAY_DOMAIN: str | None = None

    # Algorand
    ALGOD_URL: str | None = None
    ALGOD_ADDRESS: str | None = None
    ALGOD_TOKEN: str | None = None
    ALGOD_HEADER_KV: str | None = None

    LUTE_MNEMONIC: str | None = None
    DEPLOYER_MNEMONIC: str | None = None
    DEPLOYER_ADDRESS: str | None = None

    UVICORN_HOST: str | None = None
    UVICORN_PORT: int | None = None

    HOST: str = "0.0.0.0"
    PORT: int = 8011

    # Added fields to match .env and fix ValidationError
    proofchain_app_id: str | None = None
    replicate_api_token: str | None = None
    replicate_image_model: str | None = None
    replicate_video_model: str | None = None
    gemini_api_key: str | None = None
    smtp_server: str | None = None
    smtp_port: str | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_use_tls: str | None = None

    # Feature flags
    ENFORCE_METADATA_SIGNATURE: bool = False
    # Require a txid-based nonce for registration; when true, backend will error if no Algorand tx is produced
    ENFORCE_TX_NONCE: bool = True
    # Configure settings depending on pydantic version.
    if HAS_CONFIGDICT:
        # pydantic v2
        model_config = ConfigDict(extra="allow", env_file=ENV_PATH, env_file_encoding="utf-8")
    else:
        # pydantic v1
        class Config:
            # Allow extra environment variables so unknown keys don't raise
            extra = "allow"
            # Always load .env from backend dir, even if run from parent
            env_file = ENV_PATH
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
