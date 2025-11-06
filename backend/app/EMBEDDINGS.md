# Embeddings & Siamese Model — design and operation

This document explains how embeddings (semantic hashes) are produced, stored, and used in the project.

Summary
-------
- Embeddings are fixed-size L2-normalized vectors produced by a MobileNet/ResNet embedding backbone.
- There are three inference options supported:
  1. ONNX MobileNet embedding (preferred for lightweight servers using `onnxruntime`).
  2. Torch MobileNetV2 (lazy-loaded by `light_detectors` when ONNX not present).
  3. TensorFlow/Keras Siamese model (training/weights managed via `siamese_model.py`).

Files of interest
-----------------
- `backend/app/light_detectors.py` — CPU-friendly embedding extraction (ONNX-first) and utilities (pHash, ORB, MobileNetV2 embeddings). Exposes `get_embedding_from_bytes`, `compute_tamper_score_from_bytes`, and `cosine_sim`.
- `backend/app/deepfake_detector.py` — high-level detector wrapper used by trust computation. Falls back to heuristics when no ML model is available.
- `backend/app/siamese_model.py` — TensorFlow/Keras Siamese model builder, loss, preprocessing, weight-loading, and a predict helper. Used by the Siamese inference endpoint.
- `backend/app/routes/media.py` — API endpoints:
  - `POST /media/precompute_embeddings` — compute embeddings for all registered media and persist them into `registered_media.json` under the `embedding` key (list of floats).
  - `POST /media/compare` — existing lightweight ensemble compare endpoint. It now fast-paths to persisted embeddings if present.
  - `POST /media/siamese_check` — runs the Siamese model against a registered asset and returns a similarity score (requires TF weights or ONNX siamese model).
  - `GET /media/siamese_status` — reports whether ONNX/TF runtime and model/weights are present.

Model files location
--------------------
- ONNX embedding model (MobileNetV2 feature extractor):
  `backend/app/models/mobilenetv2.onnx` (optional but recommended for `light_detectors`).
- ONNX siamese model (optional):
  `backend/app/models/siamese.onnx` (if you export your trained siamese to ONNX and want to run it without TensorFlow).
- TensorFlow/Keras Siamese weights (optional):
  `backend/app/models/siamese_weights.h5` (loaded by `/media/siamese_check` if present).

Dependency guidance
-------------------
- Minimal (ONNX-only):
  - `onnxruntime`
  - `Pillow`, `imagehash`, `opencv-python-headless`, `numpy`, `scipy`, `requests`
- Full (Torch fallback & local MobileNet embeddings):
  - `torch`, `torchvision` (CPU wheels recommended)
  - plus the packages above
- TensorFlow (for Keras siamese inference):
  - `tensorflow` (heavy; prefer ONNX export for production if you can)

Install example (PowerShell)
---------------------------
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Or lighter, ONNX-only for embeddings
pip install onnxruntime Pillow imagehash opencv-python-headless numpy scipy requests
```

How registration & verification use embeddings
---------------------------------------------
1. Registration (at image generation time):
   - The server (or an offline process) computes an embedding vector `S_orig` for the original image using the embedding model.
   - Optionally compute a perceptual hash `H_orig` (pHash/dHash) for quick integrity checks.
   - Store `S_orig` in the registration record (persisted in `registered_media.json` via `precompute_embeddings`) and/or store a pointer to it on-chain (recommended to store a hash of the embedding, not the raw vector, if you need on-chain anchoring).

2. Verification (when a user uploads `I_uploaded`):
   - Fast path: if `registered_media.json` already has `embedding`, server computes `S_uploaded` for the uploaded file and computes cosine similarity between `S_orig` and `S_uploaded`.
   - If similarity >= threshold (tunable, default 0.8), mark `authentic`; otherwise `altered`.
   - If no persisted embedding exists, the server falls back to `compute_tamper_score_from_bytes` (pHash + ORB + MobileNet embedding) for a heavier but detailed comparison.

API examples
------------
- Precompute embeddings (server-side, may take time):
  POST http://localhost:8000/media/precompute_embeddings?skip_existing=true

- Fast compare using persisted embeddings (client):
  POST http://localhost:8000/media/compare
  multipart form: suspect file + ipfs_cid=Qm...

- Siamese check (requires weights or ONNX siamese):
  POST http://localhost:8000/media/siamese_check
  multipart form: suspect file + registered_sha256=0x...

- Check runtime status:
  GET http://localhost:8000/media/siamese_status

Storage and scale considerations
-------------------------------
- Currently embeddings are written inline into `backend/app/data/registered_media.json` under `embedding` as a list of floats. This is simple and works for small catalogs.
- For larger datasets, consider storing embeddings separately:
  - `embeddings.npz` (numpy) mapping `unique_reg_key` -> vector, or
  - an append-only `embeddings.jsonl` with newline-delimited vectors, or
  - a small vector DB (Annoy, FAISS, Milvus) for fast nearest-neighbour lookups.

Next steps (recommended)
------------------------
- Export your trained Keras Siamese model to ONNX for lightweight inference with `onnxruntime`.
- Run `POST /media/precompute_embeddings` to compute and persist embeddings for your registered media.
- Tune the similarity threshold (default 0.8) by validating on your dataset.
- Consider moving embeddings out of the JSON registry into an `.npz` file for performance if your registry grows.

Contact
-------
If you want, I can:
- add an endpoint that reads persisted embeddings from an `.npz` and uses it for fast comparisons,
- add a small Colab notebook to train the Siamese network and export to ONNX,
- or add unit tests validating embedding extraction and similarity calculations.
