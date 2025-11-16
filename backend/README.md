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
- POST /media/register - accepts metadata and a signature, verifies signature, then calls the storage/registry API to create the registration
- POST /media/verify - verifies a message signature and returns the recovered address.
- POST /media/upload – Upload a media file, pin it to IPFS via Pinata, and return file_url and ipfs_cid.
-POST /media/register – Register media metadata (hashes, CID, signer, txid) and persist it in the local registry; may also prepare an unsigned app-call txn.
-POST /media/register_debug – Same as /media/register but returns full traceback details on error (for local debugging only).
-GET /media/registrants – List registrants for a given sha256_hash or cid, including txid and explorer URL.
-POST /media/derive_keys – Derive content_key and unique_reg_key from a given sha256_hash and optional nonce/txid.
-POST /media/verify – Verify a signature via Lute and return the recovered address or verification status.
Security notes

- Store API keys and private credentials in a secure store or environment variables — never in client-side code.
- Require wallet signature on the client and verify on the server before accepting registration requests.
