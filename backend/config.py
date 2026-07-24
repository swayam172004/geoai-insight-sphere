import os
from dotenv import load_dotenv

load_dotenv()

# Replace 'your-actual-project-id' with your Google Cloud Project ID
GEE_PROJECT_ID: str = os.getenv("GEE_PROJECT_ID", "ee-swayamsikharwar")
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", 8000))