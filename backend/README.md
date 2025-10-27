# Backend - ProofChain (FastAPI)

This backend scaffold provides simple endpoints to:

- Proxy AI generation requests (call your AI generator service)
- Upload generated or user-provided media to the storage provider ( IPFS)
- Register media metadata after wallet signature verification
- Verify signatures

This project intentionally does not include secrets or mock fallbacks. Configure the real service endpoints and API keys via environment variables.

Quick start

1. Create a Python virtual environment and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Create a `.env` file from `.env.example` and fill in real values.

3. Run the server:

```powershell
uvicorn app.main:app --reload --port 8000
```

Endpoints (summary)

- POST /media/generate - forwards a generation request to AI generator (server-side, using API key)
- POST /media/upload - accepts a multipart file and uploads to the storage provider (Base44) and returns a file URL/CID
- POST /media/register - accepts metadata and a signature, verifies signature, then calls the storage/registry API to create the registration
- POST /media/verify - verifies a message signature and returns the recovered address

Security notes

- Store API keys and private credentials in a secure store or environment variables — never in client-side code.
- Require wallet signature on the client and verify on the server before accepting registration requests.
- For production, add authentication, rate limiting, input validation, and logging/monitoring.
