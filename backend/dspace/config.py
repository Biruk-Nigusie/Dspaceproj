import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path)

# System URLs
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000')

# DSpace Configuration
DSPACE_URL = os.getenv('DSPACE_URL', 'http://localhost:8080')
DSPACE_EMAIL = os.getenv('DSPACE_EMAIL')
DSPACE_PASSWORD = os.getenv('DSPACE_PASSWORD')
DSPACE_UI_URL = os.getenv('DSPACE_UI_URL', 'http://localhost:4000')
DSPACE_ADMIN_EMAIL = os.getenv('DSPACE_ADMIN_EMAIL')
DSPACE_ADMIN_PASSWORD = os.getenv('DSPACE_ADMIN_PASSWORD')
COLLECTION_UUID = os.getenv('COLLECTION_UUID')

# DSpace API Endpoints
DSPACE_API_BASE = f"{DSPACE_URL}/server/api"
DSPACE_LOGIN_URL = f"{DSPACE_API_BASE}/authn/login"
DSPACE_COLLECTIONS_URL = f"{DSPACE_API_BASE}/core/collections"
DSPACE_WORKSPACE_ITEMS_URL = f"{DSPACE_API_BASE}/submission/workspaceitems"

# Koha Configuration
KOHA_API_URL = os.getenv('KOHA_API_URL', 'http://127.0.0.1:8085')
KOHA_BASE_API_URL = f"{KOHA_API_URL}/api/v1"
KOHA_CLIENT_ID = os.getenv('KOHA_CLIENT_ID')
KOHA_CLIENT_SECRET = os.getenv('KOHA_CLIENT_SECRET')

# Scanner Configuration
SCANNER_HOT_FOLDER = os.getenv('SCANNER_HOT_FOLDER')
ARCHIVE_BASE = os.getenv('ARCHIVE_BASE')
ERROR_FOLDER = os.getenv('ERROR_FOLDER')
SCANNER_LOG_FILE = os.getenv('SCANNER_LOG_FILE')

def validate_config():
    required = [
        'DSPACE_URL', 'DSPACE_EMAIL', 'DSPACE_PASSWORD',
        'KOHA_API_URL', 'KOHA_CLIENT_ID', 'KOHA_CLIENT_SECRET'
    ]
    missing = [var for var in required if not globals().get(var)]
    if missing:
        print(f"⚠️ Warning: Missing configuration variables: {', '.join(missing)}")
        return False
    return True
