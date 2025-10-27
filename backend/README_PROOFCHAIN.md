ProofChain — Algorand · Lute Wallet · Pinata Prototype

This backend contains the server-side pieces for the "Algorand-lute-pinata-prototype" — a content provenance and verification prototype that records cryptographic hashes, pins signed metadata to IPFS via Pinata, and prepares Algorand transactions for creators to sign with Lute.

Short summary
- Hashing: SHA-256 (exact) + pHash (perceptual)
- Storage: IPFS (Pinata integration)
- Backend: FastAPI (Python) with endpoints to register and verify media
- Smart contracts: PyTeal examples are in `../contracts`

Design goals
- Keep private keys off the server when possible. Recommended flow: Backend pins media and returns an unsigned Algorand app-call or payment txn; the client (Lute wallet) signs it and submits.
- Store signed metadata JSON on IPFS and reference the CID in on-chain proofs.
- Use Algorand boxes (stateful PyTeal contract) to map SHA-256 hashes to metadata CIDs and creator addresses.

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

Security & production notes
- Store secrets in a secret manager (Vault, Azure Key Vault, etc.) in production. Avoid committing mnemonics or API keys to source control.
- Validate inputs and enforce allowlists for content registration.
- Add authentication, logging, monitoring, and rate-limiting for public endpoints.

Next steps and TODO
- Add a lightweight indexer to speed up lookups / UI queries (optional).
- Integrate Lute SDK when a Python package is available; for now signature verification uses raw Ed25519 checks on canonical metadata JSON.
- Add end-to-end smoke tests (Pinata pinning + unsigned txn flow + client signing).

If you want me to rework any endpoints, wire the frontend to these new endpoints, or run a smoke test with your Pinata / Algod tokens, tell me and I'll proceed.
