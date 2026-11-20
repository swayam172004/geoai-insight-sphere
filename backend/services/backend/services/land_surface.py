"""
Independent land-surface analysis service.

This module is designed to operate independently of Google Earth Engine.
Satellite data provider integration will be added separately.
"""

from math import radians, cos


def validate_coordinates(latitude: float, longitude: float) -> None:
    """Validate geographical coordinates."""

    if not -90 <= latitude <= 90:
        raise ValueError("Latitude must be between -90 and 90.")

    if not -180 <= longitude <= 180:
        raise ValueError("Longitude must be between -180 and 180.")


def calculate_bounding_box(
    latitude: float,
    longitude: float,
    radius_meters: float = 1000,
) -> dict:
    """Calculate a bounding box around a point using a radius in meters."""

    validate_coordinates(latitude, longitude)

    if radius_meters <= 0:
        raise ValueError("Radius must be greater than zero.")

    lat_offset = radius_meters / 111320

    lon_divisor = 111320 * cos(radians(latitude))

    if abs(lon_divisor) < 1e-10:
        raise ValueError("Cannot calculate longitude offset near the poles.")

    lon_offset = radius_meters / lon_divisor

    return {
        "min_latitude": latitude - lat_offset,
        "max_latitude": latitude + lat_offset,
        "min_longitude": longitude - lon_offset,
        "max_longitude": longitude + lon_offset,
    }


def prepare_land_surface_request(
    latitude: float,
    longitude: float,
    radius_meters: float = 1000,
) -> dict:
    """Prepare a validated land-surface analysis request."""

    validate_coordinates(latitude, longitude)

    bounds = calculate_bounding_box(
        latitude,
        longitude,
        radius_meters,
    )

    return {
        "latitude": latitude,
        "longitude": longitude,
        "radius_meters": radius_meters,
        "bounding_box": bounds,
        "provider": "ESA WorldCover",
        "status": "request_prepared",
    }
"""
Independent land-surface analysis service.
This module is designed to operate without Google Earth Engine.
"""

from math import radians, sin, cos, sqrt, atan2


# ESA WorldCover class definitions
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
    """Validate geographic coordinates."""

    if not -90 <= latitude <= 90:
        raise ValueError("Latitude must be between -90 and 90.")

    if not -180 <= longitude <= 180:
        raise ValueError("Longitude must be between -180 and 180.")

    return True


def validate_radius(radius_meters: int):
    """Validate the requested analysis radius."""

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
    """Prepare a validated land-surface analysis request."""

    validate_coordinates(latitude, longitude)
    validate_radius(radius_meters)

    return {
        "latitude": latitude,
        "longitude": longitude,
        "radius_meters": radius_meters,
        "land_cover_classes": LAND_COVER_CLASSES,
    }
