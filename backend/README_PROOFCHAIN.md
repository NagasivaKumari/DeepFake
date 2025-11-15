ProofChain — Algorand · Lute Wallet · Pinata Prototype

This backend contains the server-side pieces for the "Algorand-lute-pinata-prototype" — a content provenance and verification prototype that records cryptographic hashes, pins signed metadata to IPFS via Pinata, and prepares Algorand transactions for creators to sign with Lute.

Short summary
- Hashing: SHA-256 (exact) + pHash (perceptual)
- Storage: IPFS (Pinata integration)
- Backend: FastAPI (Python) with endpoints to register and verify media
- Smart contracts: PyTeal examples are in `../contracts`

Quick start (dev)

1. Create a Python virtual environment and install dependencies

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and fill the values (PINATA, ALGOD, DEPLOYER_MNEMONIC if you will deploy contracts).

3. Run the backend

```powershell
# from repository root
uvicorn backend.app.main:app --host 127.0.0.1 --port 8010 --reload
```

Core endpoints (high-level)

- POST /api/generate_image — proxy to an image-generation model (Replicate, Runway, or local Pillow fallback).
- POST /api/prepare_register_app — pin file to IPFS (Pinata) and return canonical metadata string for the client to sign.
- POST /api/finalize_register_app — accept client-signed metadata, pin metadata JSON, and return an unsigned Algorand app-call txn for the client to sign.
- POST /api/submit_signed_app_tx — accept a base64 signed txn and submit it to Algod.
- POST /api/register — convenience endpoint that pins file+metadata and returns an unsigned txn (used by quick UI flows).
- POST /api/verify — verify a file by recomputing hashes and checking on-chain boxes for a stored proof.

Notes on signing & Lute
- Recommended: Client-side signing (Lute wallet). Backend prepares unsigned txns and returns them to the client.
- Optional: Server-side signing is supported if you set `DEPLOYER_MNEMONIC` or `LUTE_MNEMONIC` in `.env`, but this requires secure key handling in production.

Contracts & deployment
- The `contracts/` folder contains PyTeal source for the ProofChain app which uses boxes keyed by SHA-256.
- Use `deploy.py` to compile and deploy the contract to TestNet. Provide `ALGOD_ADDRESS`, `ALGOD_TOKEN`, and `DEPLOYER_MNEMONIC` in your environment before running.

Next steps and TODO
- Add a lightweight indexer to speed up lookups / UI queries (optional).
- Integrate Lute SDK when a Python package is available; for now signature verification uses raw Ed25519 checks on canonical metadata JSON.
- Add end-to-end smoke tests (Pinata pinning + unsigned txn flow + client signing).
