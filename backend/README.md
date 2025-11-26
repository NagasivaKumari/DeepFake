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
- POST /media/register – Register media metadata (hashes, CID, signer, txid) and persist it in the local registry; may also prepare an unsigned app-call txn.
- POST /media/register_debug – Same as /media/register but returns full traceback details on error (for local debugging only).
- GET /media/registrants – List registrants for a given sha256_hash or cid, including txid and explorer URL.
- POST /media/derive_keys – Derive content_key and unique_reg_key from a given sha256_hash and optional nonce/txid.
- POST /media/verify – Verify a signature via Lute and return the recovered address or verification status.
- GET /media/tx_status/{txid} – Check if an Algorand transaction exists and whether it is confirmed.
- GET /media/algod_params – Fetch suggested transaction parameters from the configured Algorand node for frontend txn construction.
- POST /media/broadcast_signed_tx – Broadcast a signed payment transaction (base64) to Algorand and return txid + explorer URL.
- POST /media/broadcast_signed_app_tx – Broadcast a signed application call txn and optionally attach the app txid to an existing registration record.
- POST /media/server_pay – Send a 1 ALGO payment from the sender account to the deployer address and return txid + explorer URL.
- GET /media/cid_status/{cid} – Check IPFS availability for a CID via the configured gateway.
- GET /media/deployer_address – Return the backend’s configured deployer/receiver Algorand address.
- POST /media/recompute_reg_key – Recompute and persist unique_reg_key (and optionally algo_tx) for existing records matching a given hash.
- GET /media/trust – Compute a trust score for registrants of a media item based on on-chain presence, KYC, IPFS availability, etc.
- POST /media/compare – Compare a suspect image against a registered asset (by CID or hash) and return a lightweight tamper/duplicate score.
- GET /media/siamese_status – Report availability of Siamese model weights and runtimes.
- POST /media/precompute_embeddings – Compute and store embeddings for all registered media to speed up similarity checks.
- POST /media/siamese_check – Compare a suspect image against a registered asset using the Siamese model and return a similarity score and decision.

Security notes
- Store API keys and private credentials in a secure store or environment variables — never in client-side code.
- Require wallet signature on the client and verify on the server before accepting registration requests.

Notes on signing & Lute

-Client-side signing (Lute wallet). Backend prepares unsigned txns and returns them to the client.
-The contracts/ folder contains PyTeal source for the ProofChain app which uses boxes keyed by SHA-256.
-Use deploy.py to compile and deploy the contract to TestNet. Provide ALGOD_ADDRESS, ALGOD_TOKEN, and DEPLOYER_MNEMONIC in your environment before running.
