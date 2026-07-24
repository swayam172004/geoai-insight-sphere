# ESA WorldCover v200 Label Mapping
ESA_WORLDCOVER_LABELS: dict[int, str] = {
    10: "Tree Cover",
    20: "Shrubland",
    30: "Grassland",
    40: "Cropland",
    50: "Built-up",
    60: "Bare Vegetation",
    70: "Snow and Ice",
    80: "Water",
    90: "Herbaceous Wetland",
    95: "Mangroves",
    100: "Moss and Lichen"
}

def classify_ndvi(val: float) -> str:
    if val < 0.1:
        return "Very Poor"
    elif val < 0.3:
        return "Poor"
    elif val < 0.5:
        return "Moderate"
    elif val < 0.7:
        return "Healthy"
    else:
        return "Dense Vegetation"

def classify_ndwi(val: float) -> str:
    if val < -0.1:
        return "Dry"
    elif val <= 0.2:
        return "Moderate"
    else:
        return "Water Rich"

def classify_ndbi(val: float) -> str:
    if val < -0.1:
        return "Non Urban"
    elif val <= 0.1:
        return "Semi Urban"
    else:
        return "Urban"

def classify_elevation(val: float) -> str:
    if val < 200:
        return "Plain"
    elif val < 600:
        return "Plateau"
    elif val < 1500:
        return "Hill"
    else:
        return "Mountain"

def classify_slope(val: float) -> str:
    if val < 3:
        return "Flat"
    elif val < 10:
        return "Gentle"
    elif val < 25:
        return "Moderate"
    else:
        return "Steep"