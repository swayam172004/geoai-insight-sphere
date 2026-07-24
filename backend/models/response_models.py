from pydantic import BaseModel

class LandCoverResponse(BaseModel):
    success: bool
    label_id: int
    label_name: str

class NDVIResponse(BaseModel):
    success: bool
    ndvi_mean: float
    health_category: str

class NDWIResponse(BaseModel):
    success: bool
    ndwi_mean: float
    water_category: str

class NDBIResponse(BaseModel):
    success: bool
    ndbi_mean: float
    urban_category: str

class ElevationResponse(BaseModel):
    success: bool
    elevation: float
    terrain_type: str

class SlopeResponse(BaseModel):
    success: bool
    slope_degree: float
    slope_category: str

class WeatherResponse(BaseModel):
    success: bool
    temperature: float
    rainfall: float
    humidity: float

class AnalysisResponse(BaseModel):
    land_cover: str
    label_id: int
    ndvi: float
    ndwi: float
    ndbi: float
    elevation: float
    slope: float
    temperature: float
    humidity: float
    rainfall: float
    summary: str