"""
Colab / training script scaffold for Siamese network (ResNet50 backbone).

Usage in Colab:
- Upload this file to Colab or paste into a notebook cell.
- Mount Google Drive or use `files.upload()` for datasets.
- Adjust DATA_DIR to point to your image folders or use TFDS.
- Run training and export weights to `siamese_weights.h5`.
- Optionally export to ONNX using tf2onnx.

This script is a scaffold and uses tf.data placeholders; replace data loading
with your own pairs/triplets generation for contrastive training.
"""

import os
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, applications

# Hyperparameters
IMG_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 10
EMBED_DIM = 128
MARGIN = 1.0

# Simple contrastive loss (as described earlier)
@tf.function
def contrastive_loss(y_true, y_pred):
    # y_true: 1 for similar, 0 for dissimilar
    square_pred = tf.square(y_pred)
    margin_square = tf.square(tf.maximum(MARGIN - y_pred, 0.0))
    return tf.reduce_mean(y_true * square_pred + (1.0 - y_true) * margin_square)


def build_embedding_model(input_shape=(IMG_SIZE, IMG_SIZE, 3)):
    base_cnn = applications.ResNet50(weights='imagenet', include_top=False, input_shape=input_shape)
    base_cnn.trainable = False
    model = models.Sequential([
        base_cnn,
        layers.GlobalAveragePooling2D(),
        layers.Dense(256, activation='relu'),
        layers.BatchNormalization(),
        layers.Dense(EMBED_DIM, name='embedding')
    ], name='EmbeddingModel')
    return model


def build_siamese(embedding_model):
    a = layers.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
    b = layers.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
    ea = embedding_model(a)
    eb = embedding_model(b)
    # L2 distance
    diff = layers.Lambda(lambda x: tf.sqrt(tf.reduce_sum(tf.square(x[0] - x[1]), axis=1, keepdims=True) + 1e-6))([ea, eb])
    out = layers.Dense(1, activation='sigmoid')(diff)
    model = models.Model(inputs=[a,b], outputs=out, name='Siamese')
    return model


# Example dataset generator: replace with your real data loader
def dummy_pair_generator(num_pairs=1000):
    # yields (imgA, imgB), label where label is 1 for similar, 0 for dissimilar
    for _ in range(num_pairs):
        imgA = np.random.rand(IMG_SIZE, IMG_SIZE, 3).astype(np.float32)
        if np.random.rand() > 0.5:
            # similar: small perturbation
            imgB = imgA + (np.random.randn(*imgA.shape) * 0.01).astype(np.float32)
            label = 1
        else:
            imgB = np.random.rand(IMG_SIZE, IMG_SIZE, 3).astype(np.float32)
            label = 0
        yield (imgA, imgB), label


def tf_dataset_from_generator(batch_size=BATCH_SIZE):
    ds = tf.data.Dataset.from_generator(
        lambda: dummy_pair_generator(2000),
        output_signature=(
            (tf.TensorSpec(shape=(IMG_SIZE, IMG_SIZE, 3), dtype=tf.float32),
             tf.TensorSpec(shape=(IMG_SIZE, IMG_SIZE, 3), dtype=tf.float32)),
            tf.TensorSpec(shape=(), dtype=tf.int32)
        )
    )
    ds = ds.shuffle(1024).batch(batch_size).prefetch(tf.data.AUTOTUNE)
    return ds


def train_main():
    embedding = build_embedding_model()
    siamese = build_siamese(embedding)

    optimizer = tf.keras.optimizers.Adam(learning_rate=1e-4)
    siamese.compile(optimizer=optimizer, loss=contrastive_loss)

    ds = tf_dataset_from_generator()

    # Train (this example uses a dummy dataset; replace with real pairs)
    siamese.fit(ds, epochs=EPOCHS)

    # Save weights (Keras HDF5)
    out_dir = '/content'
    weights_path = os.path.join(out_dir, 'siamese_weights.h5')
    siamese.save_weights(weights_path)
    print('Saved weights to', weights_path)

    # Optional: export to ONNX using tf2onnx
    try:
        import tf2onnx
        import onnx
        spec = (tf.TensorSpec((None, IMG_SIZE, IMG_SIZE, 3), tf.float32, name='input_1'),
                tf.TensorSpec((None, IMG_SIZE, IMG_SIZE, 3), tf.float32, name='input_2'))
        output_path = os.path.join(out_dir, 'siamese.onnx')
        model_proto, _ = tf2onnx.convert.from_keras(siamese, input_signature=spec, output_path=output_path, opset=13)
        print('Exported ONNX to', output_path)
    except Exception as e:
        print('ONNX export failed or tf2onnx not installed:', e)


if __name__ == '__main__':
    train_main()
