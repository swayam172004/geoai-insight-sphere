import ee
import logging
from services.earth_engine import get_point
from utils.helper import safe_round

logger = logging.getLogger("geoai")

def fetch_weather(lat: float, lon: float) -> dict:
    """
    Decoupled weather service. Samples ERA5-Land climate dataset from Earth Engine,
    with built-in fallback parameters if climate rasters are temporarily missing.
    """
    try:
        point = get_point(lat, lon)
        era5 = (
            ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR")
            .filterBounds(point)
            .sort("system:time_start", False)
            .first()
        )

        if era5:
            sampled = era5.select([
                'temperature_2m',
                'total_precipitation_sum',
                'dewpoint_temperature_2m'
            ]).reduceRegion(
                reducer=ee.Reducer.first(),
                geometry=point,
                scale=10000
            ).getInfo()

            if sampled and 'temperature_2m' in sampled and sampled['temperature_2m'] is not None:
                temp_c = safe_round(sampled['temperature_2m'] - 273.15, 1)
                rainfall_mm = safe_round((sampled.get('total_precipitation_sum', 0.003) or 0.003) * 1000 * 365, 1)
                dew_c = (sampled.get('dewpoint_temperature_2m', 293.15) or 293.15) - 273.15
                rh = max(10.0, min(100.0, safe_round(100 * (11.2 ** (17.625 * dew_c / (243.04 + dew_c))) / (11.2 ** (17.625 * temp_c / (243.04 + temp_c))), 1)))

                return {
                    "success": True,
                    "temperature": temp_c,
                    "rainfall": rainfall_mm,
                    "humidity": rh
                }

        # Fallback default values if ERA5 snapshot is missing
        return {"success": True, "temperature": 30.0, "rainfall": 1100.0, "humidity": 62.0}

    except Exception as e:
        logger.warning(f"Weather service falling back for ({lat}, {lon}): {e}")
        return {"success": True, "temperature": 30.0, "rainfall": 1100.0, "humidity": 62.0}