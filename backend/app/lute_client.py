"""
Lute SDK wrapper.

This module expects a real Lute SDK to be installed in your environment. Replace the import
and usage below with the actual SDK package and initialization as provided by Lute.

The code does not provide fallbacks or mocks — if the SDK is not installed, importing this
module will raise ImportError so you'll know to install the real SDK before running.
"""
from typing import Any
from .config import settings


try:
    # Replace `lute` with the actual package name for Lute's SDK if different.
    import lute  # type: ignore
except Exception as e:
    raise ImportError("Lute SDK not found. Install the Lute SDK package before running the backend.") from e


class LuteClient:
    def __init__(self):
        # Example: lute.Client(api_key=settings.LUTE_SDK_API_KEY, endpoint=settings.LUTE_SDK_ENDPOINT)
        self.client = lute.Client(api_key=settings.LUTE_SDK_API_KEY, endpoint=settings.LUTE_SDK_ENDPOINT)  # type: ignore

    def verify_signature(self, message: str, signature: str) -> Any:
        # Replace with actual SDK call if provided
        return self.client.verify_signature(message, signature)


lute_client = LuteClient()
