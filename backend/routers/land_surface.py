
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.land_surface import create_analysis_request


router = APIRouter(
    prefix="/land-surface",
    tags=["Land Surface Analysis"],
)


class LandSurfaceRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radius_meters: int = Field(default=1000, ge=1, le=10000)


@router.post("/analyze")
async def analyze_land_surface(request: LandSurfaceRequest):
    try:
        result = create_analysis_request(
            latitude=request.latitude,
            longitude=request.longitude,
            radius_meters=request.radius_meters,
        )

        return {
            "status": "success",
            "message": "Land surface analysis request validated.",
            "data": result,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

