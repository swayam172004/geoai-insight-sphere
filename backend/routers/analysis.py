from fastapi import APIRouter, HTTPException, status
from models.request_models import CoordinateRequest
from models.response_models import AnalysisResponse
from services.landcover import fetch_landcover
from services.vegetation import fetch_ndvi, fetch_ndwi, fetch_ndbi
from services.terrain import fetch_elevation, fetch_slope
from services.weather import fetch_weather

router = APIRouter(tags=["Composite Intelligence"])

def generate_natural_summary(
    land_cover: str,
    ndvi_health: str,
    slope_category: str,
    terrain_type: str,
    elevation: float
) -> str:
    """Deterministic, rule-based natural language summary generator."""
    slope_desc = "flat" if slope_category == "Flat" else f"mostly {slope_category.lower()}"
    return (
        f"This location is primarily {land_cover.lower()} with {ndvi_health.lower()} vegetation. "
        f"The terrain is {slope_desc} and suitable for regional land management. "
        f"Current environmental conditions indicate baseline flood risk and stable vegetation health."
    )

@router.post("/analyze", response_model=AnalysisResponse)
def analyze_composite(request: CoordinateRequest):
    try:
        lat, lon = request.latitude, request.longitude

        # Execute modular services
        lc = fetch_landcover(lat, lon)
        ndvi_res = fetch_ndvi(lat, lon)
        ndwi_res = fetch_ndwi(lat, lon)
        ndbi_res = fetch_ndbi(lat, lon)
        elev_res = fetch_elevation(lat, lon)
        slope_res = fetch_slope(lat, lon)
        weather_res = fetch_weather(lat, lon)

        summary = generate_natural_summary(
            land_cover=lc.get("label_name", "Cropland"),
            ndvi_health=ndvi_res.get("health_category", "Healthy"),
            slope_category=slope_res.get("slope_category", "Flat"),
            terrain_type=elev_res.get("terrain_type", "Plateau"),
            elevation=elev_res.get("elevation", 0.0)
        )

        return AnalysisResponse(
            land_cover=lc.get("label_name", "Unknown"),
            label_id=lc.get("label_id", 0),
            ndvi=ndvi_res.get("ndvi_mean", 0.0),
            ndwi=ndwi_res.get("ndwi_mean", 0.0),
            ndbi=ndbi_res.get("ndbi_mean", 0.0),
            elevation=elev_res.get("elevation", 0.0),
            slope=slope_res.get("slope_degree", 0.0),
            temperature=weather_res.get("temperature", 0.0),
            humidity=weather_res.get("humidity", 0.0),
            rainfall=weather_res.get("rainfall", 0.0),
            summary=summary
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error": f"Composite analysis failed: {str(e)}"}
        )