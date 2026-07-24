from fastapi import APIRouter, HTTPException, status
from models.request_models import CoordinateRequest
from models.response_models import WeatherResponse
from services.weather import fetch_weather

router = APIRouter(tags=["Weather & Climate"])

@router.post("/weather", response_model=WeatherResponse)
def get_weather(request: CoordinateRequest):
    try:
        res = fetch_weather(request.latitude, request.longitude)
        return WeatherResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error": f"Weather processing failure: {str(e)}"}
        )