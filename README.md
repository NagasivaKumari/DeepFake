# ProofChain: Decentralized KYC, Media Registration & Attestation

## Overview
ProofChain is a decentralized platform for KYC (Know Your Customer) verification, media registration, and attestation, leveraging Algorand blockchain, IPFS (via Pinata), and the Lute wallet. It provides a secure, transparent, and tamper-proof way to register, verify, and track digital assets and user identities.

## Features
- **KYC Registration & Approval**: Users register and submit KYC data, which is reviewed and approved/rejected by admins.
- **Media Upload & Registration**: Users upload media files, which are pinned to IPFS via Pinata and registered on Algorand.
- **Blockchain Attestation**: Media and KYC events are recorded on Algorand, with explorer links for transparency.
- **Lute Wallet Integration**: Users sign and verify transactions using the Lute wallet.
- **Admin Dashboard**: Admins can view, approve, or reject KYC requests and manage registered media.
- **AI Image Generation**: Integrates with Pollinations.ai for open-source image generation.
- **Modern React Frontend**: Built with React, Vite, Tailwind CSS, and Radix UI.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Radix UI, TanStack Query
- **Backend**: FastAPI (Python), Pydantic, Uvicorn
- **Blockchain**: Algorand (via Algorand SDK)
- **Wallet**: Lute Wallet
- **Storage**: IPFS (via Pinata)
- **AI Generation**: Pollinations.ai
## Project Structure
```
base44-fetch-mirror/
## Setup & Installation
1. **Clone the repository**
	```bash
2. **Backend**
	- Create and activate a Python virtual environment in `backend/`.
	- Install dependencies:
	 - Copy `.env.example` to `.env` and fill in all required keys (Pinata, Algorand, AI, SMTP, etc).
	 - Start the backend:
		 ```bash
3. **Frontend**
	 - Install dependencies:
		 ```bash
	 - For admin dashboard:
		 ```bash
		 cd admin
## Environment Variables
- See `backend/.env.example` for all required variables (Pinata, Algorand, AI, SMTP, etc).
- Never commit secrets to version control.

## Usage
- Register as a user, complete KYC, and upload media.
- Admins can approve/reject KYC and view all registrations.
- All media uploads are pinned to IPFS and registered on Algorand.
- Download and verify media via explorer and IPFS links.

## License
MIT License


ProofChain — Blockchain-Based AI Content Provenance & Deepfake Verification

ProofChain is a prototype for a tamper-proof content verification system that records cryptographic and perceptual fingerprints of media, stores signed metadata on IPFS, and registers proofs on-chain. This repository contains a scaffold for contracts, backend, frontend, and tooling to get started.

Short summary:
- Hashing: SHA-256 (exact) + pHash (perceptual)
- Storage: IPFS (Pinata integration)
- Backend: FastAPI (Python) with endpoints to register and verify media
- Contracts: Example PyTeal smart contract for Algorand in `backend/contracts`

Decentralized Deepfake & Misinformation Verification System

This repository is the Canvas prototype for the "Algorand-lute-pinata-prototype" project. It contains the intro, design, and next-steps for building a decentralized digital content provenance system that uses Algorand, Lute Wallet, and Pinata/IPFS.

Goal

Create a trustable digital content ecosystem where any image, video, or audio can be verified as authentic or AI-generated using blockchain-backed proofs, perceptual hashing, and verified creator identities.

When media is uploaded or created, its unique hash, metadata, and creator’s verified signature are recorded on the Algorand blockchain. Anyone can later verify authenticity and integrity using the web dashboard or browser extension.

Core Problems Solved

1. AI Deepfakes: synthetic media that appears real but is false.
2. Misinformation: manipulated or re-encoded media spread on social platforms.
3. Lack of Provenance: no reliable record of who created or altered media.
4. Trust Issues: viewers cannot verify authenticity at scale.

Key Technologies and Roles

- Blockchain Layer: Algorand — immutable, fast, low-cost, energy-efficient store for content proofs (SHA-256 & perceptual hashes, timestamps, and creator addresses).
- Smart Contracts: PyTeal — stateful contract to map content hashes to metadata and creator addresses (using Algorand boxes).
- Identity Layer: Lute Wallet — handles secure creator authentication and on-chain signing (DID-like identities / Algorand addresses).
- Storage Layer: Pinata IPFS — decentralized storage of original media and signed metadata JSON (returns CID used in registration).
- Hashing: SHA-256 + pHash — cryptographic uniqueness (SHA-256) + perceptual resilience to re-encoding (pHash).
- Frontend: React (Vite) — upload, verification UI, and Lute SDK integration.
- Backend: FastAPI (Python) — file uploads, compute hashes, pin to Pinata, and relay metadata to Algorand.
- Browser Extension: Manifest v3 (React) — verify media in-page by computing local hashes and querying the chain/indexer.
- Optional AI Watermarking: SynthID / DeepMark — model-level watermarking for AI-generated content.
- Metadata Standard: Signed JSON (creator DID, timestamp, CID) signed with the creator's Lute/Algorand key.
- Incentive Layer (optional): Algorand Standard Asset (ASA) or reputation system to reward/penalize creators.

System Architecture & Flow

Creator → Lute Wallet Auth → Upload Media → Backend
	→ Hash (SHA-256 + pHash) → Pinata IPFS → Smart Contract (Algorand)
	→ Store hash + CID + DID signature

User → Verify Media → Recompute Hash → Query Blockchain + IPFS
	→ View authenticity + provenance status

Security & Authenticity Features

- Lute Wallet Signatures: Creator registrations are signed by the creator's Algorand address.
- Hash Redundancy: Both SHA-256 and perceptual pHash are stored to defend against re-encoding attacks.
- Immutable Records: Algorand ensures registered proofs cannot be altered.
- Metadata Provenance: Each upload includes a signed JSON metadata record pinned to IPFS.
- Future: ZK-proof extensions for privacy-preserving verification.

Deployment & Prototype Plan (Phases)

1. Contract Deployment — compile & deploy PyTeal smart contract to Algorand TestNet using pyteal, algosdk, and PureStake.
2. Backend Setup — configure Pinata API keys and PureStake endpoints; create FastAPI server and .env configuration.
3. Frontend Integration — connect Lute Wallet, build upload and verification UI with React (Vite).
4. Browser Extension — implement in Manifest v3; provide in-page verification UI querying Algorand indexer.
5. Testing — upload & verify test media; run SHA/pHash diff tests and edge-case checks.
6. Mainnet Launch — connect to Algorand MainNet; add ASA-based reputation/incentives and finalize docs.

Vision

A transparent digital media ecosystem where every piece of content — real or synthetic — carries a verifiable fingerprint of its origin, creator, and authenticity, making deepfake misuse and misinformation detection automatic and trustless.

Next Steps

- Expand this Canvas project with a runbook, deployment scripts, and initial smart contract implementation in contracts/.
- Create backend/, frontend/, and extension/ folders and add minimal scaffolds.
- If you want, I can initialize a Git repository and push this scaffold to GitHub next.

Algorand Smart Contract (PyTeal)

The contracts/proofchain_pyteal.py file contains a stateful PyTeal app that uses Algorand boxes keyed by the SHA-256 content hash. It supports register and revoke operations where the box stores owner address, a revoked flag, timestamp, and the metadata CID.

To compile and deploy to TestNet, set the following environment variables and run the deploy script:

Required env vars:
- ALGOD_TOKEN (PureStake API key)
- DEPLOYER_MNEMONIC (deployer account mnemonic)

Then run:

```powershell
python scripts\compile_deploy_pyteal.py
```

The script compiles the PyTeal into TEAL, deploys the application, and writes the deployed app id to deployed_app.txt.

Backend app-call helper

Use backend/algorand_app_utils.py to prepare unsigned application-call transactions (client signs) and submit signed app-call txns. The backend endpoint will return the unsigned app-call JSON for client-side signing.

PPT : https://docs.google.com/presentation/d/1GezNeJRjyPQkZp4Oi4cJe4HUCXP1umcn/edit?usp=drive_link&ouid=116725791494411323852&rtpof=true&sd=true
