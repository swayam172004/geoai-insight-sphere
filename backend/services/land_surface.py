"""
Independent land-surface analysis service.
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


def validate_coordinates(latitude, longitude):
    if not -90 <= latitude <= 90:
        raise ValueError("Invalid latitude.")

    if not -180 <= longitude <= 180:
        raise ValueError("Invalid longitude.")

    return True


def validate_radius(radius_meters):
    if not isinstance(radius_meters, (int, float)):
        raise ValueError("Radius must be numeric.")

    if radius_meters <= 0 or radius_meters > MAX_RADIUS_METERS:
        raise ValueError("Radius must be between 1 and 10000 meters.")

    return True


def create_analysis_request(latitude, longitude, radius_meters=DEFAULT_RADIUS_METERS):
    validate_coordinates(latitude, longitude)
    validate_radius(radius_meters)

    return {
        "latitude": latitude,
        "longitude": longitude,
        "radius_meters": radius_meters,
        "land_cover_classes": LAND_COVER_CLASSES,
    }
