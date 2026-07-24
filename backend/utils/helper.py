import logging

logger = logging.getLogger("geoai")

def safe_round(value: float | None, precision: int = 2, default: float = 0.0) -> float:
    """Safely round floating point values extracted from GEE."""
    if value is None:
        return default
    try:
        return round(float(value), precision)
    except (ValueError, TypeError):
        return default