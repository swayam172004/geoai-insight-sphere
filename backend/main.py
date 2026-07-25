import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from routers import landcover, vegetation, terrain, weather, analysis

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("geoai")

app = FastAPI(
    title="GeoAI Earth Intelligence Platform API",
    version="1.0.0",
    description="Modular, production-ready FastAPI backend for Google Earth Engine."
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include All Routers
app.include_router(landcover.router, prefix="/api")
app.include_router(vegetation.router, prefix="/api")
app.include_router(terrain.router, prefix="/api")
app.include_router(weather.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "GeoAI Earth Intelligence Platform API",
        "documentation": "/docs"
    }

# Graceful Exception Handlers (Never crash or expose tracebacks)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation failure at {request.url.path}: {exc}")
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "Invalid request parameters. Ensure latitude [-90..90] and longitude [-180..180] are numeric.",
            "details": exc.errors()
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error at {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server processing error. Please check server logs."
        }
    )