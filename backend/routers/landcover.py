from fastapi import APIRouter, HTTPException, status
from models.request_models import CoordinateRequest
from models.response_models import LandCoverResponse
from services.landcover import fetch_landcover

router = APIRouter(tags=["Land Cover"])

@router.post("/landcover", response_model=LandCoverResponse)
def get_landcover(request: CoordinateRequest):
    try:
        res = fetch_landcover(request.latitude, request.longitude)
        return LandCoverResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error": f"Land Cover service failure: {str(e)}"}
        )