import ee
import logging
from config import GEE_PROJECT_ID

logger = logging.getLogger("geoai")
_ee_initialized = False

def init_earth_engine() -> None:
    """Initializes Google Earth Engine with optional project ID from configuration."""
    global _ee_initialized
    if not _ee_initialized:
        try:
            if GEE_PROJECT_ID:
                ee.Initialize(project=GEE_PROJECT_ID)
                logger.info(f"Initialized GEE with project: {GEE_PROJECT_ID}")
            else:
                ee.Initialize()
                logger.info("Initialized GEE with default environment credentials.")
            _ee_initialized = True
        except Exception as e:
            logger.error(f"Failed to initialize Earth Engine: {e}")
            raise RuntimeError(f"Earth Engine Authentication Error: {str(e)}") from e

def get_point(lat: float, lon: float) -> ee.Geometry.Point:
    """Ensures GEE is initialized and returns an ee.Geometry.Point object."""
    init_earth_engine()
    return ee.Geometry.Point([lon, lat])