import os
from dotenv import load_dotenv

# Load environment variables from the .env file
here = os.path.dirname(__file__)
dotenv_path = os.path.join(here, ".env")
# Fallback to parent directory if .env not in uploader folder
if not os.path.exists(dotenv_path):
    dotenv_path = os.path.join(here, "..", ".env")
load_dotenv(dotenv_path)

# DSpace Server Configuration
DSPACE_URL = os.getenv("DSPACE_URL", "https://your-dspace-server.org")
DSPACE_EMAIL = os.getenv("DSPACE_EMAIL")  # Use email instead of username
DSPACE_PASSWORD = os.getenv("DSPACE_PASSWORD")

# Admin credentials for bulk approval
DSPACE_ADMIN_EMAIL = os.getenv("DSPACE_ADMIN_EMAIL")
DSPACE_ADMIN_PASSWORD = os.getenv("DSPACE_ADMIN_PASSWORD")

# Collection UUID - we'll find this in the next step
COLLECTION_UUID = os.getenv("COLLECTION_UUID", "")

# API Endpoints
API_BASE = f"{DSPACE_URL}/server/api"
LOGIN_URL = f"{API_BASE}/authn/login"
COLLECTIONS_URL = f"{API_BASE}/core/collections"
WORKSPACE_ITEMS_URL = f"{API_BASE}/submission/workspaceitems"


# Verify all required configurations are set
def validate_config():
    missing = []
    if not DSPACE_URL or DSPACE_URL == "https://your-dspace-server.org":
        missing.append("DSPACE_URL")
    if not DSPACE_EMAIL:
        missing.append("DSPACE_EMAIL")
    if not DSPACE_PASSWORD:
        missing.append("DSPACE_PASSWORD")

    if missing:
        raise ValueError(f"Missing required configuration: {', '.join(missing)}")

    return True
