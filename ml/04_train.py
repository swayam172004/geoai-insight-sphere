"""
Step 4 (v2): train a land-cover classifier on dataset.npz (made by 03_prepare_dataset.py).

Setup (once):   pip install torch torchvision numpy
Run:            python 04_train.py

 * Test set = whole regions the model never sees (honest "new part of the world" accuracy).
 * 10% of the training patches are used as a validation set to pick the best epoch,
   so the test set is only used once, at the end.
 * Works with any number of bands (6 now: R, G, B, NIR, SWIR1, SWIR2).
"""
import copy
import time

import numpy as np
import torch
import torch.nn as nn
import torchvision
from torch.utils.data import DataLoader, TensorDataset

CLASS_NAMES = ["tree", "shrub/grass", "cropland", "built-up",
               "bare", "snow/ice", "water", "wetland"]
TEST_REGIONS = {"oceania", "middle_east"}     # held out completely
EPOCHS = 20
BATCH_SIZE = 64
LEARNING_RATE = 1e-3
VAL_FRACTION = 0.10
SEED = 42

torch.manual_seed(SEED)
rng = np.random.default_rng(SEED)

# ---------------- data (kept as float16 in memory, converted per batch) ----------------
d = np.load("dataset.npz")
X, y, region = d["X"], d["y"].astype(np.int64), d["region"]      # X: (N, bands, H, W) float16
n_bands = X.shape[1]

is_test = np.isin(region, list(TEST_REGIONS))
if is_test.sum() == 0 or (~is_test).sum() == 0:
    raise SystemExit(f"TEST_REGIONS {TEST_REGIONS} do not split the data. Regions present: {sorted(set(region))}")

train_all = np.flatnonzero(~is_test)
rng.shuffle(train_all)
n_val = int(len(train_all) * VAL_FRACTION)
val_idx, train_idx, test_idx = train_all[:n_val], train_all[n_val:], np.flatnonzero(is_test)

Xtr, ytr = X[train_idx], y[train_idx]
Xva, yva = X[val_idx], y[val_idx]
Xte, yte = X[test_idx], y[test_idx]
del X, d
print(f"bands: {n_bands}   train: {len(ytr)}   validation: {len(yva)}   "
      f"test (unseen regions {sorted(TEST_REGIONS)}): {len(yte)}")


def band_stats(arr, chunk=1000):
    """Per-band mean/std computed in chunks (training data only)."""
    s, ss, count = np.zeros(n_bands), np.zeros(n_bands), 0
    for i in range(0, len(arr), chunk):
        a = arr[i:i + chunk].astype(np.float64)
        s += a.sum(axis=(0, 2, 3))
        ss += (a ** 2).sum(axis=(0, 2, 3))
        count += a.shape[0] * a.shape[2] * a.shape[3]
    mean = s / count
    std = np.sqrt(np.maximum(ss / count - mean ** 2, 1e-12))
    return mean.astype(np.float32), (std + 1e-6).astype(np.float32)


mean, std = band_stats(Xtr)

device = "cuda" if torch.cuda.is_available() else "cpu"
print("device:", device)
mean_t = torch.tensor(mean).view(1, -1, 1, 1).to(device)
std_t = torch.tensor(std).view(1, -1, 1, 1).to(device)


def prep(xb):
    """float16 batch -> normalised float32 on the right device."""
    return (xb.to(device).float() - mean_t) / std_t


train_loader = DataLoader(TensorDataset(torch.from_numpy(Xtr), torch.from_numpy(ytr)),
                          batch_size=BATCH_SIZE, shuffle=True)

# ---------------- model: ResNet-18 adapted to N input bands ----------------
try:
    model = torchvision.models.resnet18(weights="IMAGENET1K_V1")
except Exception as e:                                    # e.g. no internet for the download
    print("Could not download pretrained weights, training from scratch:", e)
    model = torchvision.models.resnet18(weights=None)

old = model.conv1.weight.data                             # (64, 3, 7, 7); channel order R, G, B
extra = n_bands - 3
new_w = torch.cat([old, old.mean(dim=1, keepdim=True).repeat(1, extra, 1, 1)], dim=1) * (3.0 / n_bands)
model.conv1 = nn.Conv2d(n_bands, 64, kernel_size=7, stride=2, padding=3, bias=False)
model.conv1.weight.data = new_w                           # extra bands start as the RGB average
model.fc = nn.Linear(model.fc.in_features, len(CLASS_NAMES))
model.to(device)

optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE)
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)
loss_fn = nn.CrossEntropyLoss()


def augment(xb):
    """Satellite patches have no 'up': random flips and 90-degree turns are free extra data."""
    if rng.random() < 0.5:
        xb = torch.flip(xb, dims=[3])
    if rng.random() < 0.5:
        xb = torch.flip(xb, dims=[2])
    return torch.rot90(xb, k=int(rng.integers(4)), dims=[2, 3])


def predict(x_np):
    model.eval()
    out = []
    with torch.no_grad():
        for i in range(0, len(x_np), 256):
            xb = torch.from_numpy(x_np[i:i + 256])
            out.append(model(prep(xb)).argmax(1).cpu().numpy())
    return np.concatenate(out)


# ---------------- training ----------------
best_val, best_state = -1.0, None
for epoch in range(1, EPOCHS + 1):
    t0 = time.time()
    model.train()
    total_loss = 0.0
    for xb, yb in train_loader:
        xb, yb = augment(prep(xb)), yb.to(device)
        optimizer.zero_grad()
        loss = loss_fn(model(xb), yb)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * len(yb)
    scheduler.step()
    val_acc = (predict(Xva) == yva).mean()
    if val_acc > best_val:
        best_val, best_state = val_acc, copy.deepcopy(model.state_dict())
    print(f"epoch {epoch:2d}/{EPOCHS}   train loss {total_loss / len(ytr):.3f}   "
          f"val accuracy {val_acc:.3f}   ({time.time() - t0:.0f}s)")

# ---------------- final report on the unseen regions (best epoch by validation) ----------------
model.load_state_dict(best_state)
pred = predict(Xte)
print(f"\nBest validation accuracy {best_val:.3f}  ->  TEST accuracy on unseen regions: {(pred == yte).mean():.3f}")

n = len(CLASS_NAMES)
cm = np.zeros((n, n), dtype=int)
np.add.at(cm, (yte, pred), 1)                             # rows = true class, columns = predicted

print("\nPer-class results on the unseen regions:")
print(f"{'class':12s} {'patches':>8s} {'recall':>8s} {'precision':>10s}")
for c, name in enumerate(CLASS_NAMES):
    support = cm[c].sum()
    recall = cm[c, c] / max(support, 1)
    precision = cm[c, c] / max(cm[:, c].sum(), 1)
    print(f"{name:12s} {support:8d} {recall:8.2f} {precision:10.2f}")

print("\nConfusion matrix (rows = true, columns = predicted):")
print("             " + " ".join(f"{i:4d}" for i in range(n)))
for c in range(n):
    print(f"{c} {CLASS_NAMES[c]:10s} " + " ".join(f"{v:4d}" for v in cm[c]))

torch.save({"model": best_state, "mean": mean, "std": std, "classes": CLASS_NAMES, "bands": n_bands},
           "landcover_resnet18.pt")
print("\nSaved landcover_resnet18.pt")
