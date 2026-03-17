"""
Handwritten Digit Recognizer
- Trains an MLP classifier on the MNIST dataset (scikit-learn)
- Provides a tkinter canvas for drawing digits with the mouse
- Preprocesses the drawn image to match MNIST format and predicts the digit
"""

import os
import ssl
import tkinter as tk
from tkinter import ttk, messagebox

import numpy as np
from PIL import Image, ImageDraw, ImageOps
import joblib
from sklearn.neural_network import MLPClassifier
from sklearn.datasets import fetch_openml
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

# Bypass SSL certificate verification (needed on some Windows environments)
ssl._create_default_https_context = ssl._create_unverified_context

# ──────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────
MODEL_PATH = "digit_model.pkl"
CANVAS_SIZE  = 280       # Drawing canvas pixel size (10x MNIST)
MNIST_SIZE   = 28        # MNIST image size
MNIST_BOX    = 20        # Digit is fitted into this box before centering (MNIST standard)
BRUSH_RADIUS = 7         # Drawing brush radius — thicker strokes match MNIST better


# ──────────────────────────────────────────────
# Model: train or load
# ──────────────────────────────────────────────
def train_model() -> Pipeline:
    """Fetch MNIST, train an MLP pipeline, and save it to disk."""
    print("Fetching MNIST dataset (this may take a moment)...")
    mnist = fetch_openml("mnist_784", version=1, as_frame=False, parser="liac-arff")
    X, y = mnist.data.astype("float32"), mnist.target.astype("int")

    # Use 60 000 training samples (full training split)
    X_train, y_train = X[:60000], y[:60000]

    print("Training MLP classifier...")
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("mlp", MLPClassifier(
            hidden_layer_sizes=(256, 128),
            activation="relu",
            max_iter=30,
            random_state=42,
            verbose=True,
        )),
    ])
    pipeline.fit(X_train, y_train)

    joblib.dump(pipeline, MODEL_PATH)
    print(f"Model saved to '{MODEL_PATH}'.")
    return pipeline


def load_or_train_model() -> Pipeline:
    """Load saved model from disk, or train a new one if not found."""
    if os.path.exists(MODEL_PATH):
        print(f"Loading saved model from '{MODEL_PATH}'...")
        return joblib.load(MODEL_PATH)
    return train_model()


# ──────────────────────────────────────────────
# Image preprocessing
# ──────────────────────────────────────────────
def _center_by_mass(arr: np.ndarray, target: int = MNIST_SIZE) -> np.ndarray:
    """
    Shift the digit so its pixel-weighted center of mass lands at the
    center of a (target × target) canvas — the same centering MNIST uses.
    """
    canvas = np.zeros((target, target), dtype="float32")

    total = arr.sum()
    if total == 0:
        return canvas

    # Weighted center of mass (row = y, col = x)
    rows = np.arange(arr.shape[0])
    cols = np.arange(arr.shape[1])
    cy = int(np.round((rows[:, None] * arr).sum() / total))
    cx = int(np.round((cols[None, :] * arr).sum() / total))

    # Offset needed to move the center of mass to the image center
    dy = target // 2 - cy
    dx = target // 2 - cx

    # Paste the shifted digit onto the target canvas
    src_r0 = max(0, -dy);  src_r1 = min(arr.shape[0], target - dy)
    src_c0 = max(0, -dx);  src_c1 = min(arr.shape[1], target - dx)
    dst_r0 = max(0,  dy);  dst_r1 = dst_r0 + (src_r1 - src_r0)
    dst_c0 = max(0,  dx);  dst_c1 = dst_c0 + (src_c1 - src_c0)
    canvas[dst_r0:dst_r1, dst_c0:dst_c1] = arr[src_r0:src_r1, src_c0:src_c1]
    return canvas


def preprocess_canvas(pil_image: Image.Image) -> np.ndarray:
    """
    Convert the canvas PIL image into a 784-dim feature vector that
    matches the MNIST preprocessing pipeline:
      1. Grayscale + invert  (white digit on black background)
      2. Crop to bounding box
      3. Fit into MNIST_BOX × MNIST_BOX (20×20) preserving aspect ratio
      4. Center of mass alignment inside 28×28 canvas
    """
    # Step 1 — grayscale and invert colors to match MNIST
    gray     = pil_image.convert("L")
    inverted = ImageOps.invert(gray)

    # Step 2 — crop tightly to the drawn content
    bbox = inverted.getbbox()
    if bbox is None:
        return np.zeros((1, MNIST_SIZE * MNIST_SIZE), dtype="float32")
    cropped = inverted.crop(bbox)

    # Step 3 — scale to fit inside a MNIST_BOX×MNIST_BOX box (keep aspect ratio)
    w, h  = cropped.size
    scale = MNIST_BOX / max(w, h)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    fitted = cropped.resize((new_w, new_h), Image.LANCZOS)

    # Step 4 — center by mass in a 28×28 canvas
    arr = np.array(fitted, dtype="float32")
    centered = _center_by_mass(arr, target=MNIST_SIZE)

    return centered.reshape(1, -1)


# ──────────────────────────────────────────────
# GUI Application
# ──────────────────────────────────────────────
class DigitRecognizerApp:
    def __init__(self, root: tk.Tk, model: Pipeline):
        self.root  = root
        self.model = model

        self.root.title("손글씨 숫자 인식기")
        self.root.resizable(False, False)

        # PIL image used as the off-screen drawing buffer
        self._reset_buffer()

        self._build_ui()
        self._bind_events()

    # ── UI Layout ──────────────────────────────
    def _build_ui(self):
        pad = {"padx": 10, "pady": 6}

        # Title label
        title = tk.Label(
            self.root,
            text="0–9 숫자를 아래에 그려보세요",
            font=("Arial", 14, "bold"),
        )
        title.pack(**pad)

        # Canvas for drawing
        self.canvas = tk.Canvas(
            self.root,
            width=CANVAS_SIZE,
            height=CANVAS_SIZE,
            bg="white",
            cursor="crosshair",
        )
        self.canvas.pack(padx=10)

        # Result label
        self.result_var = tk.StringVar(value="인식 결과: —")
        result_label = tk.Label(
            self.root,
            textvariable=self.result_var,
            font=("Arial", 18, "bold"),
            fg="#1a73e8",
        )
        result_label.pack(**pad)

        # Confidence bar
        conf_frame = tk.Frame(self.root)
        conf_frame.pack(padx=10, pady=(0, 6))
        tk.Label(conf_frame, text="신뢰도:", font=("Arial", 10)).pack(side="left")
        self.conf_var = tk.DoubleVar(value=0)
        self.conf_bar = ttk.Progressbar(
            conf_frame, variable=self.conf_var, length=200, maximum=100
        )
        self.conf_bar.pack(side="left", padx=6)
        self.conf_pct_var = tk.StringVar(value="0%")
        tk.Label(conf_frame, textvariable=self.conf_pct_var, font=("Arial", 10)).pack(side="left")

        # Probability distribution
        self.prob_frame = tk.Frame(self.root)
        self.prob_frame.pack(padx=10, pady=(0, 6))
        self.prob_bars  = []
        self.prob_labels = []
        for i in range(10):
            col_frame = tk.Frame(self.prob_frame)
            col_frame.pack(side="left", padx=2)
            bar = ttk.Progressbar(
                col_frame,
                orient="vertical",
                length=60,
                maximum=100,
            )
            bar.pack()
            lbl = tk.Label(col_frame, text=str(i), font=("Arial", 9))
            lbl.pack()
            self.prob_bars.append(bar)
            self.prob_labels.append(lbl)

        # Buttons
        btn_frame = tk.Frame(self.root)
        btn_frame.pack(pady=8)
        tk.Button(
            btn_frame,
            text="인식",
            font=("Arial", 12, "bold"),
            bg="#1a73e8",
            fg="white",
            width=12,
            command=self.recognize,
        ).pack(side="left", padx=6)
        tk.Button(
            btn_frame,
            text="지우기",
            font=("Arial", 12),
            width=10,
            command=self.clear_canvas,
        ).pack(side="left", padx=6)

    # ── Mouse Events ───────────────────────────
    def _bind_events(self):
        self.canvas.bind("<Button-1>",        self._start_draw)
        self.canvas.bind("<B1-Motion>",       self._draw)
        self.canvas.bind("<ButtonRelease-1>", self._stop_draw)

    def _start_draw(self, event):
        self._last_x = event.x
        self._last_y = event.y
        self._draw(event)

    def _draw(self, event):
        x, y = event.x, event.y
        r = BRUSH_RADIUS
        # Draw on the tkinter canvas
        self.canvas.create_oval(
            x - r, y - r, x + r, y + r,
            fill="black", outline="black",
        )
        if hasattr(self, "_last_x"):
            self.canvas.create_line(
                self._last_x, self._last_y, x, y,
                fill="black", width=r * 2,
                capstyle=tk.ROUND, smooth=True,
            )
        # Mirror drawing onto the PIL buffer
        self._draw_ctx.ellipse([x - r, y - r, x + r, y + r], fill="black")
        if hasattr(self, "_last_x"):
            self._draw_ctx.line(
                [self._last_x, self._last_y, x, y],
                fill="black", width=r * 2,
            )
        self._last_x, self._last_y = x, y

    def _stop_draw(self, event):
        if hasattr(self, "_last_x"):
            del self._last_x, self._last_y

    # ── Core Actions ───────────────────────────
    def recognize(self):
        """Preprocess the canvas image and run the model prediction."""
        features = preprocess_canvas(self._pil_image)

        if features.sum() == 0:
            messagebox.showinfo("입력 없음", "먼저 숫자를 그려주세요.")
            return

        digit      = self.model.predict(features)[0]
        proba      = self.model.predict_proba(features)[0]   # shape (10,)
        confidence = proba[digit] * 100

        self.result_var.set(f"인식 결과:  {digit}")
        self.conf_var.set(confidence)
        self.conf_pct_var.set(f"{confidence:.1f}%")

        # Update per-digit probability bars
        for i, bar in enumerate(self.prob_bars):
            bar["value"] = proba[i] * 100
            # Highlight the predicted digit
            style = "Accent.Horizontal.TProgressbar" if i == digit else "TProgressbar"

    def clear_canvas(self):
        """Clear the canvas and reset all result displays."""
        self.canvas.delete("all")
        self._reset_buffer()
        self.result_var.set("인식 결과: —")
        self.conf_var.set(0)
        self.conf_pct_var.set("0%")
        for bar in self.prob_bars:
            bar["value"] = 0

    def _reset_buffer(self):
        """Create a fresh white PIL image as the drawing buffer."""
        self._pil_image = Image.new("RGB", (CANVAS_SIZE, CANVAS_SIZE), "white")
        self._draw_ctx  = ImageDraw.Draw(self._pil_image)


# ──────────────────────────────────────────────
# Entry Point
# ──────────────────────────────────────────────
if __name__ == "__main__":
    model = load_or_train_model()

    root = tk.Tk()
    app  = DigitRecognizerApp(root, model)
    root.mainloop()
