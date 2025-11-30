# ProofChain: Decentralized KYC, Media Registration & Attestation

## Overview
ProofChain is a decentralized platform for KYC (Know Your Customer) verification, media registration, and attestation. Leveraging Algorand blockchain, IPFS (via Pinata), and the Lute Wallet, it provides a secure, transparent, and tamper-proof way to register, verify, and track digital assets and user identities.

ProofChain also acts as a blockchain-based AI content provenance and deepfake verification system, enabling creators and users to verify media authenticity, detect misinformation, and ensure trust in digital content.

Usage

-Register as a user, complete KYC, and upload media.

-Admins can approve/reject KYC and view all registrations.

-All media uploads are pinned to IPFS and registered on Algorand.

-Download and verify media via explorer and IPFS links.

Vision:

A transparent digital media ecosystem where every piece of content — real or synthetic — carries a verifiable fingerprint of its origin, creator, and authenticity. This ensures deepfake detection and misinformation verification are automatic and trustless.

Goal

Create a reliable digital content ecosystem where images, videos, or audio can be verified as authentic or AI-generated using blockchain-backed proofs, perceptual hashing, and verified creator identities.

When media is uploaded or created, its unique hash, metadata, and creator’s verified signature are recorded on the Algorand blockchain, allowing anyone to verify authenticity and integrity via the web dashboard or browser extension.

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

- ## Setup & Installation

### Backend (FastAPI)

1. Create a virtual environment and install dependencies:

   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Configure environment variables:

   `DEPLOYER_MNEMONIC` – Algorand deployer account mnemonic
   `ALGOD_ADDRESS`, `ALGOD_TOKEN` – Algorand / PureStake endpoint
   `PINATA_API_KEY`, `PINATA_API_SECRET` – Pinata IPFS credentials
   Optional: SMTP + AI keys as described in backend/README_PROOFCHAIN.md

3. Run the API:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend (React + Vite)
1. Install dependencies:
   ```bash
   cd DeepFake
   npm install
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```
   Ensure the frontend points to the backend at http://127.0.0.1:8000 for API calls.

### Admin Dashboard
1. Navigate to the Admin Directory:
   ```bash
   cd admin
   ```

2. Install Dependencies:
   ```bash
   npm install
   ```

3. Start the Admin Dashboard:
   ```bash
   npm run dev
   ```

### Short summary: 

-Hashing: SHA-256 (exact) + pHash (perceptual)

-Storage: IPFS (Pinata integration)

-Backend: FastAPI (Python) with endpoints to register and verify media

-Frontend: React (Vite) with Lute Wallet integration

-Contracts: PyTeal smart contract for Algorand (backend/contracts)

-Identity: Lute Wallet for on-chain signing & DID-like identities

-Decentralized Deepfake & Misinformation Verification System

## Key Technologies and Roles

- Blockchain Layer: Algorand — immutable, fast, low-cost, energy-efficient store for content proofs (SHA-256 & perceptual hashes, timestamps, and creator addresses).
- Smart Contracts: PyTeal — stateful contract to map content hashes to metadata and creator addresses (using Algorand boxes).
- Identity Layer: Lute Wallet — handles secure creator authentication and on-chain signing (DID-like identities / Algorand addresses).
- Storage Layer: Pinata IPFS — decentralized storage of original media and signed metadata JSON (returns CID used in registration).
- Hashing: SHA-256 + pHash — cryptographic uniqueness (SHA-256) + perceptual resilience to re-encoding (pHash).
- Frontend: React (Vite) — upload, verification UI, and Lute SDK integration.
- Backend: FastAPI (Python) — file uploads, compute hashes, pin to Pinata, and relay metadata to Algorand.
- Browser Extension: Manifest v3 (React) — verify media in-page by computing local hashes and querying the chain/indexer.
- AI Watermarking: SynthID / DeepMark — model-level watermarking for AI-generated content.
- Metadata Standard: Signed JSON (creator DID, timestamp, CID) signed with the creator's Lute/Algorand key.
- Incentive Layer: Algorand Standard Asset (ASA) or reputation system to reward/penalize creators.

## Project Structure
```plaintext
DeepFake/
├── admin/
│   ├── admin.json
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── AppLayout.tsx
│       ├── Header.tsx
│       ├── KycAdmin.tsx
│       ├── main.tsx
│       ├── Settings.tsx
│       ├── Sidebar.tsx
│       ├── Users.tsx
│       └── usersData.ts
├── backend/
│   ├── README_PROOFCHAIN.md
│   ├── README.md
│   ├── requirements.txt
│   └── app/
│       ├── config.py
│       ├── lute_client.py
│       ├── main.py
│       ├── schemas.py
│       ├── utils_email.py
│       ├── __pycache__/
│       ├── data/
│       │   └── kyc.json
│       └── routes/
│           ├── auth.py
│           ├── media.py
│           ├── registrations.py
│           └── __pycache__/
├── contracts/
│   ├── deploy.py
│   ├── proofchain_pyteal.py
│   ├── ProofChain.sol
│   └── __pycache__/
├── data/
│   └── kyc.json
├── metadata/
│   └── schema.json
├── public/
│   └── robots.txt
├── scripts/
│   └── compile_deploy_pyteal.py
├── src/
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── utils.ts
│   ├── vite-env.d.ts
│   ├── api/
│   │   ├── base44Client.ts
│   │   └── storageClient.ts
│   ├── components/
│   │   ├── About.tsx
│   │   ├── ConnectedHeader.tsx
│   │   ├── DashboardCTA.tsx
│   │   ├── DashboardHero.tsx
│   │   ├── DashboardHowItWorks.tsx
│   │   ├── DashboardStandards.tsx
│   │   ├── DashboardStats.tsx
│   │   ├── DashboardTrustProfile.tsx
│   │   ├── Features.tsx
│   │   ├── Footer.tsx
│   │   ├── GetStarted.tsx
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── KycRegistration.tsx
│   │   ├── LuteIcon.tsx
│   │   └── dashboard/
│   │       ├── FeatureCard.tsx
│   │       └── StatsCard.tsx
│   │   └── ui/
│   │       └── ... (UI components)
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   └── useWallet.tsx
│   ├── lib/
│   │   ├── utils.ts
│   │   └── walletUtils.ts
│   └── pages/
│       ├── Admin.tsx
│       ├── Dashboard.tsx
│       ├── DeveloperDocs.tsx
│       ├── FAQ.tsx
│       ├── Home.tsx
│       ├── Index.tsx
│       ├── Layout.jsx
│       ├── MyDashboard.tsx
│       ├── NotFound.tsx
│       ├── RegisterMedia.tsx
│       ├── TrustGraph.tsx
│       └── VerifyMedia.tsx
├── .vscode/
│   └── settings.json
├── bun.lockb
├── components.json
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```
Core Problems Solved

1. AI Deepfakes: synthetic media that appears real but is false.
2. Misinformation: manipulated or re-encoded media spread on social platforms.
3. Lack of Provenance: no reliable record of who created or altered media.
4. Trust Issues: viewers cannot verify authenticity at scale.

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
Backend: FastAPI computes hashes, pins metadata to IPFS, and registers on-chain.

Smart Contracts: PyTeal app stores owner address, CID, timestamp, and revoked flag using Algorand boxes.

Frontend: React + Vite handles uploads, verification, and Lute Wallet integration.

Deployment & Prototype Plan (Phases)

1. Contract Deployment — compile & deploy PyTeal smart contract to Algorand TestNet using pyteal, algosdk, and PureStake.
2. Backend Setup — configure Pinata API keys and PureStake endpoints; create FastAPI server and .env configuration.
3. Frontend Integration — connect Lute Wallet, build upload and verification UI with React (Vite).
4. Browser Extension — implement in Manifest v3; provide in-page verification UI querying Algorand indexer.
5. Testing — upload & verify test media; run SHA/pHash diff tests and edge-case checks.
6. Mainnet Launch — connect to Algorand MainNet; add ASA-based reputation/incentives and finalize docs.

Algorand Smart Contract (PyTeal)

The contracts/proofchain_pyteal.py file contains a stateful PyTeal app that uses Algorand boxes keyed by the SHA-256 content hash. It supports register and revoke operations where the box stores owner address, a revoked flag, timestamp, and the metadata CID.

To compile and deploy to TestNet, set the following environment variables and run the deploy script:

Required env vars:
- Pinata API

-Algorand (PureStake endpoint & deployer mnemonic)

-AI integration keys

-SMTP (optional for notifications)

- DEPLOYER_MNEMONIC (deployer account mnemonic)

Then run:

```powershell
python scripts\compile_deploy_pyteal.py
```

The script compiles the PyTeal into TEAL, deploys the application, and writes the deployed app id to deployed_app.txt.

Smart contracts deployed Link: https://lora.algokit.io/testnet/application/749309990

Backend app-call helper
Use backend/algorand_app_utils.py to prepare unsigned application-call transactions (client signs) and submit signed app-call txns. The backend endpoint will return the unsigned app-call JSON for client-side signing.

PPT : https://docs.google.com/presentation/d/1GezNeJRjyPQkZp4Oi4cJe4HUCXP1umcn/edit?usp=drive_link&ouid=116725791494411323852&rtpof=true&sd=true

## Media Classification & Verification (Exact vs Derivative)

The backend provides a unified classification endpoint to support the Verify page logic:

Endpoint: `POST /media/classify`

Parameters (query string):
- `ipfs_cid` (optional) – classify an already registered CID instead of uploading a file
- `canonicalize` (bool, default true) – apply non‑destructive watermark inpainting before hashing
- `similarity_threshold` (float, default 0.92) – minimum cosine similarity for derivative classification
- `include_matches` (bool) – return top similar matches list
- `top_k` (int, default 5) – limit of similar matches returned

Multipart Form Fields (when uploading):
- `suspect` – the file (image) to classify

Response Schema:
```jsonc
{
	"status": "exact_registered" | "derivative" | "unregistered",
	"query_sha256": "<hex sha256 of canonical bytes>",
	"canonical_strategy": "inpaint_v1" | "raw" | "raw_no_change" | "error",
	"exact_match": {
		"unique_reg_key": "...",
		"signer_address": "ALGO...",
		"file_url": "https://...",
		"ipfs_cid": "Qm...",
		"sha256_hash": "...",
		"algo_tx": "<txid or null>"
	} | null,
	"best_match": {
		"unique_reg_key": "...",
		"signer_address": "ALGO...",
		"file_url": "https://...",
		"ipfs_cid": "Qm...",
		"similarity": 0.95321
	} | null,
	"similarity_threshold": 0.92,
	"matches": [ { "unique_reg_key": "...", "similarity": 0.95, ... } ] // optional when include_matches=true
}
```

Decision Logic:
1. (Optional) Canonicalize image via watermark inpainting (preserves dimensions).
2. Compute SHA‑256 on canonical bytes. If hash matches any registered `sha256_hash` → `status=exact_registered`.
3. Else compute embedding and cosine similarity against stored embeddings. If any ≥ threshold → `status=derivative` with `best_match`.
4. Else → `status=unregistered`.

Example: Upload classification
```bash
curl -X POST "http://localhost:8000/media/classify?canonicalize=true&include_matches=true" \
	-F "suspect=@cat.png"
```

Example: CID classification
```bash
curl -X POST "http://localhost:8000/media/classify?ipfs_cid=QmExampleCid&canonicalize=true"
```

Frontend Integration:
- The Verify page (`src/pages/VerifyMedia.tsx`) calls this endpoint and renders badges:
	- Exact Registered (green)
	- Derivative / Altered (yellow) with similarity score & original signer
	- Unregistered (red)

Canonical Hash vs Raw Hash:
Currently the system hashes the canonical (potentially cleaned) bytes. If you need both raw and canonical hashes, extend `/media/classify` & registration to store an additional `raw_sha256_hash` field before inpainting.

Adjusting Sensitivity:
- Raise `similarity_threshold` above 0.95 to reduce false derivatives.
- Lower to e.g. 0.88 to capture more distant edits.

Depoly Link: https://deep-fake-six.vercel.app/

Future Enhancements:
- Perceptual hash fallback tier
- Multi‑band watermark detection
- ANN index (FAISS) for scalability
- Provenance chain visualization (graph of near duplicates)

## Enhanced Documentation

### Getting Started

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/NagasivaKumari/base44-fetch-mirror.git
   ```

2. **Navigate to the Project Directory**:
   ```bash
   cd base44-fetch-mirror/DeepFake
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```

### Features Overview

- **Dark Mode Support**: Toggle between light and dark themes.
- **User Activity Tracker**: Monitor user actions in real-time.
- **Customizable Notifications**: Configure email, SMS, and in-app notifications.
- **Advanced Search**: Search users, media, and logs with filters.
- **Error Boundary**: Catch and display errors gracefully.
- **Export Data**: Export user data in CSV or JSON format.
- **Real-Time Analytics**: View live updates on user activity.
- **Multi-Language Support**: Select preferred language for the dashboard.

### Admin Dashboard Setup

1. **Navigate to the Admin Directory**:
   ```bash
   cd admin
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Admin Dashboard**:
   ```bash
   npm run dev
   ```

### Backend Setup

1. **Navigate to the Backend Directory**:
   ```bash
   cd backend
   ```

2. **Install Python Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Backend Server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Deployment

- **Frontend**: Deployed on Vercel.
- **Backend**: Hosted on a cloud server with FastAPI.
- **Smart Contracts**: Deployed on Algorand TestNet.

### Contribution Guidelines

1. Fork the repository.
2. Create a new branch for your feature.
3. Commit your changes with clear messages.
4. Submit a pull request for review.

### License

This project is licensed under the MIT License.
