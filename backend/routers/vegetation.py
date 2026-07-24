from fastapi import APIRouter, HTTPException, status
from models.request_models import CoordinateRequest
from models.response_models import NDVIResponse, NDWIResponse, NDBIResponse
from services.vegetation import fetch_ndvi, fetch_ndwi, fetch_ndbi

router = APIRouter(tags=["Vegetation & Indices"])

@router.post("/ndvi", response_model=NDVIResponse)
def get_ndvi(request: CoordinateRequest):
    try:
        res = fetch_ndvi(request.latitude, request.longitude)
        return NDVIResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error": f"NDVI calculation failure: {str(e)}"}
        )

@router.post("/ndwi", response_model=NDWIResponse)
def get_ndwi(request: CoordinateRequest):
    try:
        res = fetch_ndwi(request.latitude, request.longitude)
        return NDWIResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error": f"NDWI calculation failure: {str(e)}"}
        )

@router.post("/ndbi", response_model=NDBIResponse)
def get_ndbi(request: CoordinateRequest):
    try:
        res = fetch_ndbi(request.latitude, request.longitude)
        return NDBIResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error": f"NDBI calculation failure: {str(e)}"}
        )