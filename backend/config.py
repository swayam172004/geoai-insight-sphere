import os

from dotenv import load_dotenv

load_dotenv()

# Google Cloud project that is registered for Earth Engine.
# If empty, the project_id inside the service-account key is used.
GEE_PROJECT_ID: str = os.getenv("GEE_PROJECT_ID", "").strip()

# Credentials: EITHER paste the whole JSON key into this env var (easiest on Render)...
GEE_SERVICE_ACCOUNT_JSON: str = os.getenv("GEE_SERVICE_ACCOUNT_JSON", "").strip()
# ...OR provide a key file (Render "Secret Files" are mounted under /etc/secrets/).
GOOGLE_CREDENTIALS_PATH: str = os.getenv(
    "GOOGLE_APPLICATION_CREDENTIALS", "/etc/secrets/service-account.json"
)

# Comma-separated list of allowed frontend origins, e.g.
# "https://your-app.vercel.app,http://localhost:3000". "*" allows everything.
CORS_ORIGINS: list[str] = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()
]

HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", 8000))
