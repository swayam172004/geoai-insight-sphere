"""
Step 3: read the TFRecord files exported by Earth Engine and build ONE file, dataset.npz.

Setup (once):   pip install tfrecord numpy
Folder layout:  put the downloaded *.tfrecord files in a folder called  patches
                (next to this script), then run:   python 03_prepare_dataset.py
"""
import glob
import os
import sys
from collections import Counter

import numpy as np
from tfrecord.reader import tfrecord_loader

FOLDER = "patches"
BANDS = ["B4", "B3", "B2", "B8", "B11", "B12"]   # red, green, blue, NIR, SWIR1, SWIR2
CLASS_NAMES = ["tree", "shrub/grass", "cropland", "built-up",
               "bare", "snow/ice", "water", "wetland"]

files = sorted(glob.glob(os.path.join(FOLDER, "*.tfrecord*")))
if not files:
    sys.exit(f"No .tfrecord files found in the folder '{FOLDER}'. Check the folder name and location.")
print(f"Found {len(files)} file(s)")


def to_text(v):
    """Strings come back from the reader as bytes / uint8 arrays."""
    if isinstance(v, bytes):
        return v.decode()
    return np.asarray(v).astype(np.uint8).tobytes().decode()


X, y, region = [], [], []
shown_keys = False
for f in files:
    compression = "gzip" if f.endswith(".gz") else None
    n_before = len(y)
    for rec in tfrecord_loader(f, None, compression_type=compression):
        if not shown_keys:
            print("Fields in the first record:", {k: np.asarray(v).shape for k, v in rec.items()})
            shown_keys = True
        bands = [np.asarray(rec[b], dtype=np.float32).ravel() for b in BANDS]
        side = int(round(len(bands[0]) ** 0.5))
        if side * side != len(bands[0]) or any(len(b) != len(bands[0]) for b in bands):
            continue                                   # malformed record, skip it
        patch = np.stack([b.reshape(side, side) for b in bands])
        if not np.isfinite(patch).all():
            continue
        X.append(patch.astype(np.float16))              # float16 keeps memory use low
        y.append(int(np.asarray(rec["label"]).ravel()[0]))
        region.append(to_text(rec["region"]))
    print(f"  {os.path.basename(f)}: {len(y) - n_before} patches")

if not X:
    sys.exit("No usable patches were read. Send me the 'Fields in the first record' line above.")

sizes = Counter(p.shape for p in X)
if len(sizes) > 1:
    sys.exit(f"Patches have different sizes: {sizes}")

X = np.stack(X)
y = np.array(y, dtype=np.int64)
region = np.array(region)

print(f"\nTotal: {len(y)} patches, shape {X.shape[1:]}")
print("\nPatches per class (should be roughly equal):")
for c, name in enumerate(CLASS_NAMES):
    print(f"  {c} {name:12s} {int((y == c).sum()):6d}")
print("\nPatches per region:")
for r in sorted(set(region)):
    print(f"  {r:14s} {int((region == r).sum()):6d}")

np.savez_compressed("dataset.npz", X=X, y=y, region=region)
print("\nSaved dataset.npz")
