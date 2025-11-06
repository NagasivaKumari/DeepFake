Colab training scaffold and instructions

This README explains how to use `colab_siamese_training.py` in Google Colab to train a Siamese network and export weights/ONNX.

Steps
-----
1. Open Google Colab: https://colab.research.google.com
2. Create a new notebook and either copy/paste the contents of `colab_siamese_training.py` into a notebook cell, or upload the file and run it.
3. Install required packages in a Colab cell (run once):

```bash
!pip install -U pip
!pip install tensorflow tfds tf2onnx onnx onnxruntime
```

4. Prepare your dataset. You should create pairs of images (similar/dissimilar) or use a dataset like CelebA split into pairs/triplets. In this scaffold, the dataset loader is a placeholder; replace `dummy_pair_generator` with your real loader.

5. Run the training cell. After training, weights are saved to `/content/siamese_weights.h5` and (optionally) `siamese.onnx`.

6. Download the weights to your local machine or Google Drive (Colab > Files sidebar > right-click > Download). Move the weights into `backend/app/models/siamese_weights.h5` on your server.

ONNX export notes
-----------------
- The scaffold uses `tf2onnx.convert.from_keras(...)` to export the Keras model to ONNX.
- ONNX opset 13 is used in the scaffold; if conversion fails, try a different opset (11/12/13) or test with a smaller model.

Tips
----
- Use GPU runtime in Colab: Runtime > Change runtime type > GPU.
- For faster training, enable mixed precision: `from tensorflow.keras.mixed_precision import experimental as mixed_precision` and set global policy.
- Tune batch size and learning rate for your dataset size and GPU memory.
