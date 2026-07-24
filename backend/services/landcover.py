import ee
import logging
from services.earth_engine import get_point
from utils.constants import ESA_WORLDCOVER_LABELS

logger = logging.getLogger("geoai")

def fetch_landcover(lat: float, lon: float) -> dict:
    try:
        point = get_point(lat, lon)
        worldcover = ee.ImageCollection("ESA/WorldCover/v200").first().select("Map")
        
        sampled = worldcover.reduceRegion(
            reducer=ee.Reducer.first(),
            geometry=point,
            scale=10
        ).getInfo()

        if not sampled or 'Map' not in sampled or sampled['Map'] is None:
            return {"success": False, "label_id": 0, "label_name": "Unknown"}

        label_id = int(sampled['Map'])
        label_name = ESA_WORLDCOVER_LABELS.get(label_id, "Unknown")
        return {"success": True, "label_id": label_id, "label_name": label_name}
    except Exception as e:
        logger.error(f"LandCover service error at ({lat}, {lon}): {e}")
        raise e