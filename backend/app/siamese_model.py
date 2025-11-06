"""Siamese network definition and helpers (TensorFlow / Keras).

This module provides:
- contrastive_loss: custom loss for Siamese training
- build_siamese_network: constructs the siamese and embedding models
- load_weights: helper to load pretrained weights into the siamese model
- preprocess_image: load/resize/normalize an image (from bytes or PIL) to model input
- predict_similarity_from_bytes: convenience function to run inference from raw bytes

Use this file in Colab to train, then save weights with model.save_weights(...).
Place the weights file on the server and call `load_weights(path)` to load them.
"""
from __future__ import annotations
import io
import numpy as np
from typing import Tuple
try:
    import tensorflow as tf
    from tensorflow.keras import layers, models, applications
except Exception as e:
    raise RuntimeError(f"TensorFlow is required for siamese_model module: {e}")
from PIL import Image
import os

# ONNX session cache for siamese inference
_onnx_siamese_sess = None
_onnx_siamese_path = os.path.join(os.path.dirname(__file__), 'models', 'siamese.onnx')


def _ensure_onnx_siamese_session():
    global _onnx_siamese_sess
    if _onnx_siamese_sess is not None:
        return _onnx_siamese_sess
    try:
        import onnxruntime as ort
    except Exception:
        return None
    if not os.path.exists(_onnx_siamese_path):
        return None
    try:
        sess = ort.InferenceSession(_onnx_siamese_path, providers=['CPUExecutionProvider'])
        _onnx_siamese_sess = sess
        return sess
    except Exception:
        return None

# Hyperparameters
MARGIN = 1.0


def contrastive_loss(y_true, y_pred):
    """Contrastive loss for Siamese networks.

    y_true: 1 for similar, 0 for dissimilar.
    y_pred: predicted distance (or similarity) between embeddings.
    """
    # y_pred is expected to be a distance-like scalar. If model outputs similarity
    # (sigmoid on distance), adjust accordingly. Here we follow the user's formula.
    square_pred = tf.square(y_pred)
    margin_square = tf.square(tf.maximum(MARGIN - y_pred, 0.0))
    loss = tf.reduce_mean(y_true * square_pred + (1.0 - y_true) * margin_square)
    return loss


def build_siamese_network(input_shape: Tuple[int, int, int] = (224, 224, 3)):
    """Constructs the Siamese model and the embedding backbone.

    Returns: (siamese_model, embedding_model)
    """
    # Shared embedding model using ResNet50 backbone (ImageNet weights)
    base_cnn = applications.ResNet50(weights="imagenet", include_top=False, input_shape=input_shape)
    base_cnn.trainable = False

    embedding_model = models.Sequential([
        base_cnn,
        layers.GlobalAveragePooling2D(),
        layers.Dense(256, activation="relu"),
        layers.BatchNormalization(),
        layers.Dense(128, name="embedding")
    ], name="Embedding_Model")

    input_a = layers.Input(shape=input_shape, name="input_a")
    input_b = layers.Input(shape=input_shape, name="input_b")

    emb_a = embedding_model(input_a)
    emb_b = embedding_model(input_b)

    # L1 distance
    L1_layer = layers.Lambda(lambda tensors: tf.abs(tensors[0] - tensors[1]))
    l1 = L1_layer([emb_a, emb_b])

    # Prediction head: single sigmoid output (similarity)
    out = layers.Dense(1, activation="sigmoid")(l1)

    siamese = models.Model(inputs=[input_a, input_b], outputs=out, name="Siamese")
    return siamese, embedding_model


def load_weights(model: tf.keras.Model, weights_path: str):
    """Load weights into the provided model.

    Raises informative errors when weights can't be loaded.
    """
    try:
        model.load_weights(weights_path)
        return True
    except Exception as e:
        raise RuntimeError(f"Failed to load weights from {weights_path}: {e}")


def preprocess_image_from_bytes(b: bytes, target_size: Tuple[int, int] = (224, 224)) -> np.ndarray:
    """Load image from bytes, resize, and normalize to ImageNet stats.

    Returns a float32 array shaped (H,W,3) scaled as in Keras applications.
    """
    img = Image.open(io.BytesIO(b)).convert("RGB")
    img = img.resize(target_size, resample=Image.BILINEAR)
    arr = np.asarray(img).astype(np.float32)
    # scale to 0..1 then apply imagenet preprocessing
    arr = arr / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    arr = (arr - mean) / std
    return arr


def predict_similarity_from_bytes(model: tf.keras.Model, a_bytes: bytes, b_bytes: bytes) -> float:
    """Convenience wrapper: preprocess two images and return similarity score (0..1).

    This assumes the model outputs a scalar between 0 and 1 (sigmoid).
    """
    # Try ONNX siamese session first (if available)
    sess = _ensure_onnx_siamese_session()
    a = preprocess_image_from_bytes(a_bytes)
    b = preprocess_image_from_bytes(b_bytes)
    xa = np.expand_dims(a, axis=0).astype(np.float32)
    xb = np.expand_dims(b, axis=0).astype(np.float32)
    if sess is not None:
        try:
            inputs = sess.get_inputs()
            if len(inputs) >= 2:
                name0 = inputs[0].name
                name1 = inputs[1].name
                out = sess.run(None, {name0: xa, name1: xb})
            else:
                # Single combined input case (unlikely) - try mapping first two names
                name0 = inputs[0].name
                out = sess.run(None, {name0: np.concatenate([xa, xb], axis=0)})
            # Assume scalar output or shape (1,1)
            o = out[0]
            try:
                return float(o.flatten()[0])
            except Exception:
                return float(o)
        except Exception:
            # Fall back to TF path
            pass

    # Fallback to tensorflow model
    pred = model.predict([xa, xb])
    try:
        return float(pred[0][0])
    except Exception:
        return float(pred)


if __name__ == "__main__":
    # Quick smoke test: build model and show summary
    m, emb = build_siamese_network()
    m.compile(optimizer=tf.keras.optimizers.Adam(1e-4), loss=contrastive_loss)
    m.summary()
