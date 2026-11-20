
"""
Independent land-surface analysis service.
This module is designed to operate without Google Earth Engine.
"""

LAND_COVER_CLASSES = {
    10: "Tree Cover",
    20: "Shrubland",
    30: "Grassland",
    40: "Cropland",
    50: "Built-up",
    60: "Bare / Sparse Vegetation",
    70: "Snow and Ice",
    80: "Water",
    90: "Herbaceous Wetland",
    95: "Mangroves",
    100: "Moss and Lichen",
}

DEFAULT_RADIUS_METERS = 1000
MAX_RADIUS_METERS = 10000


def validate_coordinates(latitude: float, longitude: float):
    if not -90 <= latitude <= 90:
        raise ValueError("Latitude must be between -90 and 90.")

    if not -180 <= longitude <= 180:
        raise ValueError("Longitude must be between -180 and 180.")

    return True


def validate_radius(radius_meters: int):
    if not isinstance(radius_meters, (int, float)):
        raise ValueError("Radius must be numeric.")

    if radius_meters <= 0:
        raise ValueError("Radius must be greater than zero.")

    if radius_meters > MAX_RADIUS_METERS:
        raise ValueError("Maximum analysis radius is 10 km.")

    return True


def create_analysis_request(
    latitude: float,
    longitude: float,
    radius_meters: int = DEFAULT_RADIUS_METERS,
):
    validate_coordinates(latitude, longitude)
    validate_radius(radius_meters)

    return {
        "latitude": latitude,
        "longitude": longitude,
        "radius_meters": radius_meters,
        "land_cover_classes": LAND_COVER_CLASSES,
    }
