from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.land_surface import (
    analyze_land_surface,
    analyze_land_surface_geometry,
)
router = APIRouter(prefix="/land-surface", tags=["Land Surface Analysis"])


class LandSurfaceRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radius_meters: int = Field(default=1000, ge=1, le=10000)


@router.post("/analyze")
async def analyze_land_surface_route(request: LandSurfaceRequest):
    try:
        result = analyze_land_surface(
            request.geometry
        )
        return {"status": "success", "data": result}

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
