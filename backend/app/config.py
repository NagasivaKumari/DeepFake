import os
from pathlib import Path

# Support pydantic v2 (BaseSettings moved to pydantic-settings),
# pydantic v1 (BaseSettings in pydantic) and a lightweight fallback
# when neither package is available in the environment (useful for
# lightweight dev setups or constrained CI images).
try:
    # pydantic v2 split: BaseSettings lives in pydantic-settings package
    from pydantic_settings import BaseSettings  # type: ignore
except Exception:
    try:
        # pydantic v1 compatibility: try to import BaseSettings from pydantic
        import pydantic as _pydantic  # type: ignore
        BaseSettings = getattr(_pydantic, "BaseSettings")
    except Exception:
        # Fallback minimal BaseSettings replacement: reads environment
        # variables and optionally an env_file specified on the inner
        # Config.env_file attribute. This does not implement full
        # pydantic parsing/validation but is sufficient for basic env
        # driven configuration during lightweight development runs.
        class BaseSettings:  # minimal replacement
            class Config:
                env_file = None

            def __init__(self, **kwargs):
                # Load env_file if present and file exists
                env_file = getattr(self.Config, "env_file", None)
                if env_file:
                    try:
                        env_path = Path(env_file)
                        if env_path.exists():
                            for ln in env_path.read_text(encoding="utf-8").splitlines():
                                ln = ln.strip()
                                if not ln or ln.startswith("#") or "=" not in ln:
                                    continue
                                k, v = ln.split("=", 1)
                                k = k.strip()
                                v = v.strip().strip('"').strip("'")
                                # only set if not already in environment
                                if k not in os.environ:
                                    os.environ[k] = v
                    except Exception:
                        # ignore env file read errors in fallback
                        pass

                # Set attributes from annotations or class defaults
                annotations = getattr(self.__class__, "__annotations__", {})
                for name in annotations:
                    # value priority: kwargs > ENV > class default
                    if name in kwargs:
                        val = kwargs[name]
                    else:
                        val = os.getenv(name)
                        if val is None:
                            val = getattr(self.__class__, name, None)
                    # basic type coercion for common types
                    ann = annotations.get(name)
                    if isinstance(val, str) and ann is not None:
                        try:
                            if ann == int:
                                val = int(val)
                            elif ann == bool:
                                val = val.lower() in ("1", "true", "yes", "on")
                        except Exception:
                            pass
                    setattr(self, name, val)

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
