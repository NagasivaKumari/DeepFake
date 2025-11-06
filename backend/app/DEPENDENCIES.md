Runtime dependencies and install steps

Minimal (ONNX-first, lightweight server):
- onnxruntime
- Pillow
- imagehash
- opencv-python-headless
- numpy
- scipy
- requests

Install (PowerShell):
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install onnxruntime Pillow imagehash opencv-python-headless numpy scipy requests
```

If you need PyTorch-based embeddings and local MobileNetV2 via torch (fallback):
```powershell
pip install torch torchvision
```

If you plan to run Keras/TensorFlow Siamese inference on server (heavy):
```powershell
pip install tensorflow
```

For training/export in Colab (recommended):
```bash
pip install tensorflow tfds tf2onnx onnx onnxruntime
```

Notes:
- Prefer ONNX for production inference to avoid the heavyweight TF install.
- On Windows, installing PyTorch should be done following official instructions to pick the correct CUDA/CPU wheel: https://pytorch.org/get-started/locally/
- For CPU-only servers, install CPU wheels (torch with cpu only) to avoid CUDA dependencies.
