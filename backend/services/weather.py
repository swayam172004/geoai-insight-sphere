import logging
import math

import ee

from services.earth_engine import get_point
from utils.helper import safe_round

logger = logging.getLogger("geoai")

# Returned only when ERA5-Land cannot be read. success=False tells callers it is NOT real data.
_FALLBACK = {"success": False, "estimated": True, "temperature": 30.0, "rainfall": 1100.0, "humidity": 62.0}


def relative_humidity(temp_c: float, dew_c: float) -> float:
    """Magnus formula. RH = 100 * exp(a*Td/(b+Td)) / exp(a*T/(b+T))."""
    a, b = 17.625, 243.04
    rh = 100.0 * math.exp(a * dew_c / (b + dew_c) - a * temp_c / (b + temp_c))
    return max(0.0, min(100.0, rh))


def fetch_weather(lat: float, lon: float) -> dict:
    """Latest temperature/humidity and the last 12 months of rainfall from ERA5-Land."""
    try:
        point = get_point(lat, lon)
        daily = ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR")

        latest = ee.Image(daily.sort("system:time_start", False).first())
        end = ee.Date(latest.get("system:time_start"))
        rain_12m = (
            daily.filterDate(end.advance(-1, "year"), end)
            .select("total_precipitation_sum")
            .sum()
            .rename("rain_12m")
        )
        image = latest.select(["temperature_2m", "dewpoint_temperature_2m"]).addBands(rain_12m)

        sampled = image.reduceRegion(
            reducer=ee.Reducer.first(), geometry=point, scale=11132
        ).getInfo() or {}

        t_k, d_k, rain_m = (
            sampled.get("temperature_2m"),
            sampled.get("dewpoint_temperature_2m"),
            sampled.get("rain_12m"),
        )
        if t_k is None or d_k is None:
            return dict(_FALLBACK)

        temp_c = t_k - 273.15
        dew_c = d_k - 273.15
        return {
            "success": True,
            "temperature": safe_round(temp_c, 1),
            "humidity": safe_round(relative_humidity(temp_c, dew_c), 1),
            "rainfall": safe_round((rain_m or 0.0) * 1000.0, 1),  # mm over the last 12 months
        }
    except Exception as e:
        logger.warning(f"Weather service falling back for ({lat}, {lon}): {e}")
        return dict(_FALLBACK)
