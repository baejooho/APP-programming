# Created: 2026-03-17
"""
Handwritten Digit Recognizer — Web Version
Flask backend: loads the pre-trained sklearn model and serves predictions via REST API.
"""

import os
import base64
import io

import numpy as np
from PIL import Image, ImageOps
import joblib
from flask import Flask, render_template, request, jsonify

# ──────────────────────────────────────────────
# Constants (must match the training pipeline)
# ──────────────────────────────────────────────
MNIST_SIZE = 28
MNIST_BOX  = 20

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), '..', 'desktop_version', 'digit_model.pkl'
)

app   = Flask(__name__)
model = None


# ──────────────────────────────────────────────
# Model loading
# ──────────────────────────────────────────────
def load_model():
    global model
    print(f"Loading model from '{MODEL_PATH}' ...")
    model = joblib.load(MODEL_PATH)
    print("Model loaded.")


# ──────────────────────────────────────────────
# Image preprocessing (same pipeline as desktop)
# ──────────────────────────────────────────────
def _center_by_mass(arr: np.ndarray, target: int = MNIST_SIZE) -> np.ndarray:
    canvas = np.zeros((target, target), dtype='float32')
    total  = arr.sum()
    if total == 0:
        return canvas

    rows = np.arange(arr.shape[0])
    cols = np.arange(arr.shape[1])
    cy   = int(np.round((rows[:, None] * arr).sum() / total))
    cx   = int(np.round((cols[None, :] * arr).sum() / total))

    dy = target // 2 - cy
    dx = target // 2 - cx

    src_r0 = max(0, -dy);  src_r1 = min(arr.shape[0], target - dy)
    src_c0 = max(0, -dx);  src_c1 = min(arr.shape[1], target - dx)
    dst_r0 = max(0,  dy);  dst_r1 = dst_r0 + (src_r1 - src_r0)
    dst_c0 = max(0,  dx);  dst_c1 = dst_c0 + (src_c1 - src_c0)
    canvas[dst_r0:dst_r1, dst_c0:dst_c1] = arr[src_r0:src_r1, src_c0:src_c1]
    return canvas


def preprocess_image(pil_image: Image.Image):
    gray     = pil_image.convert('L')
    inverted = ImageOps.invert(gray)

    bbox = inverted.getbbox()
    if bbox is None:
        return None

    cropped = inverted.crop(bbox)
    w, h    = cropped.size
    scale   = MNIST_BOX / max(w, h)
    new_w   = max(1, int(round(w * scale)))
    new_h   = max(1, int(round(h * scale)))
    fitted  = cropped.resize((new_w, new_h), Image.LANCZOS)

    arr      = np.array(fitted, dtype='float32')
    centered = _center_by_mass(arr, target=MNIST_SIZE)
    return centered.reshape(1, -1)


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    data       = request.get_json()
    image_b64  = data['image'].split(',')[1]          # strip "data:image/png;base64,"
    pil_image  = Image.open(io.BytesIO(base64.b64decode(image_b64)))

    features = preprocess_image(pil_image)
    if features is None or features.sum() == 0:
        return jsonify({'error': 'empty'})

    digit      = int(model.predict(features)[0])
    proba      = model.predict_proba(features)[0].tolist()
    confidence = round(proba[digit] * 100, 1)

    return jsonify({'digit': digit, 'confidence': confidence, 'probabilities': proba})


# ──────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────
if __name__ == '__main__':
    load_model()
    app.run(debug=True, port=5000)
