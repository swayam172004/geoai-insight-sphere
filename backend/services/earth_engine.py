import ee
import logging
import os
from config import GEE_PROJECT_ID

logger = logging.getLogger("geoai")

_ee_initialized = False


def init_earth_engine() -> None:
    global _ee_initialized

    if _ee_initialized:
        return

    try:
        credentials_path = os.getenv(
            "GOOGLE_APPLICATION_CREDENTIALS",
            "/etc/secrets/gee-service-account.json"
        )

        if not os.path.exists(credentials_path):
            raise RuntimeError(
                f"Earth Engine credentials file not found: {credentials_path}"
            )

        credentials = ee.ServiceAccountCredentials(
            email=None,
            key_file=credentials_path
        )

        if GEE_PROJECT_ID:
            ee.Initialize(
                credentials=credentials,
                project=GEE_PROJECT_ID
            )
        else:
            ee.Initialize(
                credentials=credentials
            )

        _ee_initialized = True

        logger.info(
            "Google Earth Engine initialized successfully"
        )

    except Exception as e:
        logger.exception(
            "Failed to initialize Google Earth Engine"
        )

        raise RuntimeError(
            f"Earth Engine Authentication Error: {str(e)}"
        ) from e


def get_point(lat: float, lon: float) -> ee.Geometry.Point:
    init_earth_engine()
    return ee.Geometry.Point([lon, lat])