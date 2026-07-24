from fastapi import APIRouter, HTTPException, status
from models.request_models import CoordinateRequest
from models.response_models import ElevationResponse, SlopeResponse
from services.terrain import fetch_elevation, fetch_slope

router = APIRouter(tags=["Terrain Analysis"])

@router.post("/elevation", response_model=ElevationResponse)
def get_elevation(request: CoordinateRequest):
    try:
        res = fetch_elevation(request.latitude, request.longitude)
        return ElevationResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error": f"Elevation retrieval failure: {str(e)}"}
        )

@router.post("/slope", response_model=SlopeResponse)
def get_slope(request: CoordinateRequest):
    try:
        res = fetch_slope(request.latitude, request.longitude)
        return SlopeResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error": f"Slope computation failure: {str(e)}"}
        )