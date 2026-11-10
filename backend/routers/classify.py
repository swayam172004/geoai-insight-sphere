from fastapi import APIRouter, HTTPException, status

from models.request_models import CoordinateRequest
from models.response_models import ClassificationResponse
from services.classifier import ModelNotAvailable, NoImageryError, classify

router = APIRouter(tags=["AI Classification"])


@router.post("/classify", response_model=ClassificationResponse)
def classify_location(request: CoordinateRequest):
    try:
        return ClassificationResponse(**classify(request.latitude, request.longitude))
    except ModelNotAvailable as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"success": False, "error": str(e)},
        )
    except NoImageryError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "error": str(e)},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error": f"Classification failed: {e}"},
        )
