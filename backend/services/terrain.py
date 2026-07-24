import ee
import logging
from services.earth_engine import get_point
from utils.constants import classify_elevation, classify_slope
from utils.helper import safe_round

logger = logging.getLogger("geoai")

def fetch_elevation(lat: float, lon: float) -> dict:
    try:
        point = get_point(lat, lon)
        dem = ee.Image("NASA/NASADEM_HGT/001").select("elevation")
        sampled = dem.reduceRegion(reducer=ee.Reducer.first(), geometry=point, scale=30).getInfo()

        val = safe_round(sampled.get('elevation') if sampled else None, precision=2)
        return {"success": True, "elevation": val, "terrain_type": classify_elevation(val)}
    except Exception as e:
        logger.error(f"Elevation service error at ({lat}, {lon}): {e}")
        raise e

def fetch_slope(lat: float, lon: float) -> dict:
    try:
        point = get_point(lat, lon)
        dem = ee.Image("NASA/NASADEM_HGT/001").select("elevation")
        slope_img = ee.Terrain.slope(dem)
        sampled = slope_img.reduceRegion(reducer=ee.Reducer.first(), geometry=point, scale=30).getInfo()

        val = safe_round(sampled.get('slope') if sampled else None, precision=2)
        return {"success": True, "slope_degree": val, "slope_category": classify_slope(val)}
    except Exception as e:
        logger.error(f"Slope service error at ({lat}, {lon}): {e}")
        raise e