from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, HTTPException, status

from models.request_models import CoordinateRequest
from models.response_models import AnalysisResponse
from services.landcover import fetch_landcover
from services.terrain import fetch_elevation, fetch_slope
from services.vegetation import fetch_indices
from services.weather import fetch_weather

router = APIRouter(tags=["Composite Intelligence"])

# The five Earth Engine lookups are independent, so run them at the same time
# (total latency = slowest call instead of the sum of all calls).
_executor = ThreadPoolExecutor(max_workers=8, thread_name_prefix="ee")


def generate_natural_summary(
    land_cover: str,
    ndvi_health: str,
    slope_category: str,
    terrain_type: str,
    elevation: float,
    weather_ok: bool = True,
) -> str:
    """Deterministic, rule-based summary built only from the measured values."""
    slope_desc = {
        "Flat": "flat",
        "Gentle": "gently sloping",
        "Moderate": "moderately sloping",
        "Steep": "steeply sloping",
    }.get(slope_category, slope_category.lower())
    text = (
        f"This location is primarily {land_cover.lower()} with {ndvi_health.lower()} vegetation. "
        f"The terrain is {slope_desc} ({terrain_type.lower()}, about {elevation:.0f} m above sea level)."
    )
    if not weather_ok:
        text += " Climate data was unavailable, so the temperature, humidity and rainfall shown are defaults."
    return text


@router.post("/analyze", response_model=AnalysisResponse)
def analyze_composite(request: CoordinateRequest):
    try:
        lat, lon = request.latitude, request.longitude

        futures = {
            "lc": _executor.submit(fetch_landcover, lat, lon),
            "idx": _executor.submit(fetch_indices, lat, lon),
            "elev": _executor.submit(fetch_elevation, lat, lon),
            "slope": _executor.submit(fetch_slope, lat, lon),
            "weather": _executor.submit(fetch_weather, lat, lon),
        }
        r = {name: f.result() for name, f in futures.items()}  # re-raises any failure
        lc, idx, elev, slope, weather = r["lc"], r["idx"], r["elev"], r["slope"], r["weather"]

        summary = generate_natural_summary(
            land_cover=lc.get("label_name", "Unknown"),
            ndvi_health=idx.get("health_category", "Unknown"),
            slope_category=slope.get("slope_category", "Flat"),
            terrain_type=elev.get("terrain_type", "Plain"),
            elevation=elev.get("elevation", 0.0),
            weather_ok=weather.get("success", False),
        )

        return AnalysisResponse(
            land_cover=lc.get("label_name", "Unknown"),
            label_id=lc.get("label_id", 0),
            ndvi=idx.get("ndvi_mean", 0.0),
            ndwi=idx.get("ndwi_mean", 0.0),
            ndbi=idx.get("ndbi_mean", 0.0),
            elevation=elev.get("elevation", 0.0),
            slope=slope.get("slope_degree", 0.0),
            temperature=weather.get("temperature", 0.0),
            humidity=weather.get("humidity", 0.0),
            rainfall=weather.get("rainfall", 0.0),
            summary=summary,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error": f"Composite analysis failed: {e}"},
        )
