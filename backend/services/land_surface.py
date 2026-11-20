"""
Independent land-surface analysis using ESA WorldCover 2021.
"""
import math
import numpy as np
import rasterio
from rasterio.windows import from_bounds
from rasterio.features import geometry_mask
from shapely.geometry import shape

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

BASE_URL = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map"


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


def get_tile_name(latitude, longitude):
    lat_corner = math.floor(latitude / 3) * 3
    lon_corner = math.floor(longitude / 3) * 3

    lat_prefix = "N" if lat_corner >= 0 else "S"
    lon_prefix = "E" if lon_corner >= 0 else "W"

    lat_value = abs(lat_corner)
    lon_value = abs(lon_corner)

    return (
        f"{lat_prefix}{lat_value:02d}"
        f"{lon_prefix}{lon_value:03d}"
    )


def analyze_land_surface(latitude, longitude, radius_meters=1000):
    validate_coordinates(latitude, longitude)
    validate_radius(radius_meters)

    if abs(latitude) >= 85:
        raise ValueError("Analysis is not supported near the poles.")

    tile = get_tile_name(latitude, longitude)

    url = (
        f"{BASE_URL}/ESA_WorldCover_10m_2021_v200_"
        f"{tile}_Map.tif"
    )

    lat_delta = radius_meters / 111320

    lon_delta = radius_meters / (
        111320 * math.cos(math.radians(latitude))
    )

    west = longitude - lon_delta
    east = longitude + lon_delta
    south = latitude - lat_delta
    north = latitude + lat_delta

    with rasterio.open("/vsicurl/" + url) as src:

        window = from_bounds(
            west,
            south,
            east,
            north,
            transform=src.transform,
        )

        window = window.round_offsets().round_lengths()

        data = src.read(1, window=window)

        transform = src.window_transform(window)

    if data.size == 0:
        raise ValueError("No raster pixels found.")

    rows, cols = np.indices(data.shape)

    pixel_lon = transform.c + (cols + 0.5) * transform.a
    pixel_lat = transform.f + (rows + 0.5) * transform.e

    distance_x = (
        (pixel_lon - longitude)
        * 111320
        * math.cos(math.radians(latitude))
    )

    distance_y = (pixel_lat - latitude) * 111320

    inside_circle = (
        distance_x**2 + distance_y**2
        <= radius_meters**2
    )

    values = data[inside_circle]

    values = values[values != 0]

    if values.size == 0:
        raise ValueError("No valid land-cover pixels found.")

    unique_values, counts = np.unique(
        values,
        return_counts=True,
    )

    total_pixels = int(values.size)

    results = []

    for value, count in zip(unique_values, counts):

        class_value = int(value)
        pixel_count = int(count)

        results.append({
            "class_code": class_value,
            "class_name": LAND_COVER_CLASSES.get(
                class_value,
                "Unknown",
            ),
            "pixel_count": pixel_count,
            "area_km2": round(
                pixel_count * 100 / 1_000_000,
                4,
            ),
            "percentage": round(
                pixel_count / total_pixels * 100,
                2,
            ),
        })

    results.sort(
        key=lambda item: item["percentage"],
        reverse=True,
    )

    return {
        "latitude": latitude,
        "longitude": longitude,
        "radius_meters": radius_meters,
        "source": "ESA WorldCover 2021 v200",
        "tile": tile,
        "total_pixels": total_pixels,
        "land_cover": results,
    }
def analyze_land_surface_geometry(geometry):
    """
    Analyze ESA WorldCover pixels inside a GeoJSON Polygon
        or MultiPolygon geometry.
        """
    geom = shape(geometry)
    
    if geom.geom_type not in ("Polygon", "MultiPolygon"):
        raise ValueError("Only Polygon and MultiPolygon geometries are supported.")
    
    if geom.is_empty or not geom.is_valid:
        raise ValueError("Invalid or empty geometry.")
    
    west, south, east, north = geom.bounds
    
    if abs(south) >= 85 or abs(north) >= 85:
            raise ValueError("Analysis is not supported near the poles.")
    
    center_lat = (south + north) / 2
    center_lon = (west + east) / 2
    
    tile = get_tile_name(center_lat, center_lon)
    
    url = (
            f"{BASE_URL}/ESA_WorldCover_10m_2021_v200_"
            f"{tile}_Map.tif"
        )
    
    with rasterio.open("/vsicurl/" + url) as src:
        window = from_bounds(
                west,
                south,
                east,
                north,
                transform=src.transform,
            )
    
        window = window.round_offsets().round_lengths()
    
        data = src.read(1, window=window)
        transform = src.window_transform(window)
    
        inside_geometry = geometry_mask(
                [geom.__geo_interface__],
                out_shape=data.shape,
                transform=transform,
                invert=True,
            )
    
    if data.size == 0:
        raise ValueError("No raster pixels found.")
    
    values = data[inside_geometry]
    values = values[values != 0]
    
    if values.size == 0:
        raise ValueError("No valid land-cover pixels found.")
    
    unique_values, counts = np.unique(
            values,
            return_counts=True,
        )
    
    total_pixels = int(values.size)
    results = []
    
    for value, count in zip(unique_values, counts):
        class_value = int(value)
        pixel_count = int(count)
    
        results.append({
                "class_code": class_value,
                "class_name": LAND_COVER_CLASSES.get(
                    class_value,
                    "Unknown",
                ),
                "pixel_count": pixel_count,
                "area_km2": round(
                    pixel_count * 100 / 1_000_000,
                    4,
                ),
                "percentage": round(
                    pixel_count / total_pixels * 100,
                    2,
                ),
            })
    
    results.sort(
            key=lambda item: item["percentage"],
            reverse=True,
        )
    
    return {
            "geometry_type": geom.geom_type,
            "source": "ESA WorldCover 2021 v200",
            "tile": tile,
            "total_pixels": total_pixels,
            "land_cover": results,
        }
