import logging
from datetime import datetime, timedelta, timezone

import ee

from services.earth_engine import get_point
from utils.constants import classify_ndvi, classify_ndwi, classify_ndbi
from utils.helper import safe_round

logger = logging.getLogger("geoai")

COMPOSITE_DAYS = 180


def _get_s2_composite(point: ee.Geometry.Point) -> ee.Image:
    """Median of recent low-cloud Sentinel-2 scenes.

    A median composite avoids the old '.first()' problem, where the newest scene
    could be masked at the point and silently produce 0.0.
    """
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=COMPOSITE_DAYS)
    return (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(point)
        .filterDate(start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
        .median()
    )


def _sample_indices(lat: float, lon: float) -> dict:
    """NDVI, NDWI and NDBI from ONE Earth Engine round trip. Values may be None."""
    point = get_point(lat, lon)
    s2 = _get_s2_composite(point)
    indices = ee.Image.cat([
        s2.normalizedDifference(["B8", "B4"]).rename("NDVI"),
        s2.normalizedDifference(["B3", "B8"]).rename("NDWI"),
        s2.normalizedDifference(["B11", "B8"]).rename("NDBI"),
    ])
    return indices.reduceRegion(
        reducer=ee.Reducer.first(), geometry=point, scale=10
    ).getInfo() or {}


def fetch_indices(lat: float, lon: float) -> dict:
    """All three indices at once (used by /api/analyze)."""
    try:
        s = _sample_indices(lat, lon)
        ndvi, ndwi, ndbi = s.get("NDVI"), s.get("NDWI"), s.get("NDBI")
        ok = None not in (ndvi, ndwi, ndbi)
        ndvi, ndwi, ndbi = (safe_round(v, 4) for v in (ndvi, ndwi, ndbi))
        return {
            "success": ok,
            "ndvi_mean": ndvi,
            "ndwi_mean": ndwi,
            "ndbi_mean": ndbi,
            "health_category": classify_ndvi(ndvi) if ok else "Unknown",
            "water_category": classify_ndwi(ndwi) if ok else "Unknown",
            "urban_category": classify_ndbi(ndbi) if ok else "Unknown",
        }
    except Exception as e:
        logger.error(f"Indices service error at ({lat}, {lon}): {e}")
        raise


def _single(lat: float, lon: float, key: str, out_key: str, cat_key: str, classify) -> dict:
    try:
        val = _sample_indices(lat, lon).get(key)
        if val is None:
            return {"success": False, out_key: 0.0, cat_key: "Unknown"}
        val = safe_round(val, precision=4)
        return {"success": True, out_key: val, cat_key: classify(val)}
    except Exception as e:
        logger.error(f"{key} service error at ({lat}, {lon}): {e}")
        raise


def fetch_ndvi(lat: float, lon: float) -> dict:
    return _single(lat, lon, "NDVI", "ndvi_mean", "health_category", classify_ndvi)


def fetch_ndwi(lat: float, lon: float) -> dict:
    return _single(lat, lon, "NDWI", "ndwi_mean", "water_category", classify_ndwi)


def fetch_ndbi(lat: float, lon: float) -> dict:
    return _single(lat, lon, "NDBI", "ndbi_mean", "urban_category", classify_ndbi)
