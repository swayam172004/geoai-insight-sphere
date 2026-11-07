import logging
import os
import threading

import ee

from config import GEE_PROJECT_ID, GEE_SERVICE_ACCOUNT_JSON, GOOGLE_CREDENTIALS_PATH

logger = logging.getLogger("geoai")

_lock = threading.Lock()
_ee_initialized = False
_last_error: str | None = None


def _load_credentials():
    if GEE_SERVICE_ACCOUNT_JSON:
        return ee.ServiceAccountCredentials(None, key_data=GEE_SERVICE_ACCOUNT_JSON)
    if os.path.exists(GOOGLE_CREDENTIALS_PATH):
        return ee.ServiceAccountCredentials(None, key_file=GOOGLE_CREDENTIALS_PATH)
    raise RuntimeError(
        "No Earth Engine credentials found. Set GEE_SERVICE_ACCOUNT_JSON, or provide "
        f"a key file at {GOOGLE_CREDENTIALS_PATH} (GOOGLE_APPLICATION_CREDENTIALS)."
    )


def init_earth_engine() -> None:
    """Initialise Earth Engine once (thread-safe). Raises RuntimeError on failure."""
    global _ee_initialized, _last_error

    if _ee_initialized:
        return

    with _lock:
        if _ee_initialized:
            return
        try:
            credentials = _load_credentials()
            project = GEE_PROJECT_ID or getattr(credentials, "project_id", None)
            ee.Initialize(credentials=credentials, project=project)
            _ee_initialized = True
            _last_error = None
            logger.info("Google Earth Engine initialized (project=%s)", project)
        except Exception as e:
            _last_error = f"{type(e).__name__}: {e}"
            logger.exception("Failed to initialize Google Earth Engine")
            raise RuntimeError(f"Earth Engine Authentication Error: {e}") from e


def get_status() -> dict:
    return {"initialized": _ee_initialized, "error": _last_error}


def get_point(lat: float, lon: float) -> ee.Geometry.Point:
    init_earth_engine()
    return ee.Geometry.Point([lon, lat])
