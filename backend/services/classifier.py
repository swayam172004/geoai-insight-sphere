"""AI land-cover classifier: Sentinel-2 patch from Earth Engine -> ONNX model -> class.

The patch recipe (bands, year, cloud filter, 65 x 65 window, reflectance / 10000) must be
EXACTLY the one used to build the training data (02_export_patches.py). It is read from
landcover_meta.json, which 05_export_onnx.py writes next to the model.
"""
import json
import logging
import os
import threading
from functools import lru_cache
from pathlib import Path

import ee
import numpy as np

from services.earth_engine import get_point

logger = logging.getLogger("geoai")

MODEL_DIR = Path(os.getenv("LANDCOVER_MODEL_DIR", Path(__file__).resolve().parent.parent / "ml"))
MODEL_PATH = MODEL_DIR / "landcover.onnx"
META_PATH = MODEL_DIR / "landcover_meta.json"


class ModelNotAvailable(RuntimeError):
    """The .onnx / meta files are not deployed (or onnxruntime is missing)."""


class NoImageryError(RuntimeError):
    """Earth Engine returned no usable Sentinel-2 patch for this point."""


_lock = threading.Lock()
_session = None
_meta = None


def _load():
    """Load the model once, on first use, so the rest of the API starts even without it."""
    global _session, _meta
    if _session is not None:
        return _session, _meta
    with _lock:
        if _session is None:
            if not MODEL_PATH.exists() or not META_PATH.exists():
                raise ModelNotAvailable(
                    f"Model files not found in {MODEL_DIR}. Run 05_export_onnx.py and copy "
                    "landcover.onnx and landcover_meta.json into backend/ml/."
                )
            try:
                import onnxruntime as ort
            except ImportError as e:
                raise ModelNotAvailable("onnxruntime is not installed on the server.") from e
            meta = json.loads(META_PATH.read_text(encoding="utf-8"))
            session = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])
            _meta = meta            # set meta first: readers check _session
            _session = session
            logger.info("Land-cover model loaded (%s bands)", len(meta["bands"]))
    return _session, _meta


def fetch_patch(lat: float, lon: float, meta: dict) -> np.ndarray:
    """Same recipe as training. Returns an array of shape (bands, size, size)."""
    bands, size, comp = meta["bands"], meta["patch_pixels"], meta["composite"]
    point = get_point(lat, lon)

    s2 = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterDate(comp["start"], comp["end"])
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", comp["max_cloud_percent"]))
        .select(bands)
        .median()
        .divide(10000)
    )
    kernel = ee.Kernel.square(radius=size // 2, units="pixels")
    sampled = s2.neighborhoodToArray(kernel).sampleRegions(
        collection=ee.FeatureCollection([ee.Feature(point)]), scale=10, tileScale=4
    )
    info = sampled.first().getInfo()
    if not info or not info.get("properties"):
        raise NoImageryError("No Sentinel-2 imagery is available at this location.")

    props = info["properties"]
    try:
        patch = np.stack([np.asarray(props[b], dtype=np.float32) for b in bands])
    except KeyError as e:
        raise NoImageryError(f"Sentinel-2 band {e} is missing at this location.") from e
    if patch.shape != (len(bands), size, size):
        raise NoImageryError(f"Unexpected patch shape {patch.shape}; expected {(len(bands), size, size)}.")
    return patch


def predict_from_patch(patch: np.ndarray) -> dict:
    """Normalise with the TRAINING statistics, run the model, return class + probabilities."""
    session, meta = _load()
    mean = np.asarray(meta["mean"], dtype=np.float32).reshape(-1, 1, 1)
    std = np.asarray(meta["std"], dtype=np.float32).reshape(-1, 1, 1)
    x = ((patch.astype(np.float32) - mean) / std)[None].astype(np.float32)

    logits = session.run(None, {session.get_inputs()[0].name: x})[0][0]
    e = np.exp(logits - logits.max())
    probs = e / e.sum()

    best = int(probs.argmax())
    names = meta["classes"]
    comp = meta["composite"]
    return {
        "class_id": best,
        "class_name": names[best],
        "confidence": round(float(probs[best]), 4),
        "probabilities": {n: round(float(p), 4) for n, p in zip(names, probs)},
        "model_info": {
            "bands": meta["bands"],
            "patch_pixels": meta["patch_pixels"],
            "composite": f"{comp['start']} to {comp['end']}",
        },
    }


@lru_cache(maxsize=256)
def _classify_cached(lat: float, lon: float) -> dict:
    _, meta = _load()                      # raises ModelNotAvailable early (cheap)
    return predict_from_patch(fetch_patch(lat, lon, meta))


def classify(lat: float, lon: float) -> dict:
    # Rounded to ~11 m so repeated clicks on the same spot are answered from the cache.
    return dict(_classify_cached(round(lat, 4), round(lon, 4)))
