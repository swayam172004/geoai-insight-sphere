"""
Step 5: convert the trained PyTorch model into a small, server-friendly ONNX file.

Setup (once):   pip install onnx onnxruntime
Run:            python 05_export_onnx.py        (next to landcover_resnet18.pt)

Creates:  landcover.onnx          the model
          landcover_meta.json     class names, band order, normalisation, patch recipe
Then copy BOTH files into your web-app repo at  backend/ml/
"""
import json
import os

import numpy as np
import onnxruntime as ort
import torch
import torch.nn as nn
import torchvision

CHECKPOINT = "landcover_resnet18.pt"
PATCH = 65                                   # must match 02_export_patches.py
BAND_NAMES = {
    4: ["B4", "B3", "B2", "B8"],
    6: ["B4", "B3", "B2", "B8", "B11", "B12"],
}
COMPOSITE = {"start": "2021-01-01", "end": "2022-01-01", "max_cloud_percent": 30}   # must match 02_export_patches.py

try:
    ckpt = torch.load(CHECKPOINT, map_location="cpu", weights_only=False)
except TypeError:                            # older PyTorch without the weights_only option
    ckpt = torch.load(CHECKPOINT, map_location="cpu")

state = ckpt["model"]
n_bands = int(state["conv1.weight"].shape[1])
classes = list(ckpt["classes"])
if n_bands not in BAND_NAMES:
    raise SystemExit(f"Unexpected number of bands: {n_bands}")
print(f"model: {n_bands} bands, {len(classes)} classes")

# Rebuild the exact architecture used in 04_train.py, then load the trained weights.
model = torchvision.models.resnet18(weights=None)
model.conv1 = nn.Conv2d(n_bands, 64, kernel_size=7, stride=2, padding=3, bias=False)
model.fc = nn.Linear(model.fc.in_features, len(classes))
model.load_state_dict(state)
model.eval()

mean = np.asarray(ckpt["mean"], dtype=np.float64).reshape(-1)
std = np.asarray(ckpt["std"], dtype=np.float64).reshape(-1)
assert len(mean) == n_bands and len(std) == n_bands, "mean/std do not match the number of bands"

# ---------------- export ----------------
dummy = torch.zeros(1, n_bands, PATCH, PATCH)
kwargs = dict(
    input_names=["patch"],
    output_names=["logits"],
    dynamic_axes={"patch": {0: "batch"}, "logits": {0: "batch"}},
    opset_version=17,
)
try:
    torch.onnx.export(model, dummy, "landcover.onnx", dynamo=False, **kwargs)   # classic exporter
except TypeError:                            # older PyTorch has no 'dynamo' option
    torch.onnx.export(model, dummy, "landcover.onnx", **kwargs)

meta = {
    "classes": classes,
    "bands": BAND_NAMES[n_bands],
    "patch_pixels": PATCH,
    "mean": mean.tolist(),
    "std": std.tolist(),
    "composite": COMPOSITE,
}
with open("landcover_meta.json", "w", encoding="utf-8") as f:
    json.dump(meta, f, indent=2)

# ---------------- check: ONNX must give the same answers as PyTorch ----------------
x = torch.randn(4, n_bands, PATCH, PATCH)
with torch.no_grad():
    expected = model(x).numpy()
session = ort.InferenceSession("landcover.onnx", providers=["CPUExecutionProvider"])
got = session.run(None, {"patch": x.numpy()})[0]
np.testing.assert_allclose(got, expected, rtol=1e-3, atol=1e-3)

size_mb = os.path.getsize("landcover.onnx") / 1e6
print(f"\nOK: ONNX output matches PyTorch.  landcover.onnx = {size_mb:.0f} MB")
print("Copy landcover.onnx and landcover_meta.json into  backend/ml/  of your web-app repo.")
