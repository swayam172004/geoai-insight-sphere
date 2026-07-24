import ee
import logging
from services.earth_engine import get_point
from utils.constants import classify_ndvi, classify_ndwi, classify_ndbi
from utils.helper import safe_round

logger = logging.getLogger("geoai")

def _get_s2_image(point: ee.Geometry.Point) -> ee.Image | None:
    """Helper to fetch recent cloud-free Sentinel-2 image."""
    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(point)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
        .sort("system:time_start", False)
    )
    return collection.first()

def fetch_ndvi(lat: float, lon: float) -> dict:
    try:
        point = get_point(lat, lon)
        s2_img = _get_s2_image(point)
        if not s2_img:
            return {"success": False, "ndvi_mean": 0.0, "health_category": "Unknown"}

        ndvi_img = s2_img.normalizedDifference(['B8', 'B4']).rename('NDVI')
        sampled = ndvi_img.reduceRegion(reducer=ee.Reducer.first(), geometry=point, scale=10).getInfo()

        val = safe_round(sampled.get('NDVI') if sampled else None, precision=4)
        return {"success": True, "ndvi_mean": val, "health_category": classify_ndvi(val)}
    except Exception as e:
        logger.error(f"NDVI service error at ({lat}, {lon}): {e}")
        raise e

def fetch_ndwi(lat: float, lon: float) -> dict:
    try:
        point = get_point(lat, lon)
        s2_img = _get_s2_image(point)
        if not s2_img:
            return {"success": False, "ndwi_mean": 0.0, "water_category": "Unknown"}

        ndwi_img = s2_img.normalizedDifference(['B3', 'B8']).rename('NDWI')
        sampled = ndwi_img.reduceRegion(reducer=ee.Reducer.first(), geometry=point, scale=10).getInfo()

        val = safe_round(sampled.get('NDWI') if sampled else None, precision=4)
        return {"success": True, "ndwi_mean": val, "water_category": classify_ndwi(val)}
    except Exception as e:
        logger.error(f"NDWI service error at ({lat}, {lon}): {e}")
        raise e

def fetch_ndbi(lat: float, lon: float) -> dict:
    try:
        point = get_point(lat, lon)
        s2_img = _get_s2_image(point)
        if not s2_img:
            return {"success": False, "ndbi_mean": 0.0, "urban_category": "Unknown"}

        ndbi_img = s2_img.normalizedDifference(['B11', 'B8']).rename('NDBI')
        sampled = ndbi_img.reduceRegion(reducer=ee.Reducer.first(), geometry=point, scale=10).getInfo()

        val = safe_round(sampled.get('NDBI') if sampled else None, precision=4)
        return {"success": True, "ndbi_mean": val, "urban_category": classify_ndbi(val)}
    except Exception as e:
        logger.error(f"NDBI service error at ({lat}, {lon}): {e}")
        raise e