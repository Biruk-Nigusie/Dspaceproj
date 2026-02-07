import os
from dotenv import load_dotenv

# Find .env in current dir or parent dir
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)

# Try loading from .env in dspace_uploader or project root
if os.path.exists(os.path.join(current_dir, ".env")):
    load_dotenv(os.path.join(current_dir, ".env"))
elif os.path.exists(os.path.join(parent_dir, ".env")):
    load_dotenv(os.path.join(parent_dir, ".env"))

# DSpace Configuration
DSPACE_URL = os.getenv('DSPACE_URL', 'http://localhost:8080').rstrip('/')
DSPACE_EMAIL = os.getenv('DSPACE_EMAIL')
DSPACE_PASSWORD = os.getenv('DSPACE_PASSWORD')
DSPACE_ADMIN_EMAIL = os.getenv('DSPACE_ADMIN_EMAIL')
DSPACE_ADMIN_PASSWORD = os.getenv('DSPACE_ADMIN_PASSWORD')
COLLECTION_UUID = os.getenv('COLLECTION_UUID')

# API Endpoints
API_BASE = f"{DSPACE_URL}/server/api"
LOGIN_URL = f"{API_BASE}/authn/login"

# Koha Configuration (if needed by standalone scripts)
KOHA_API_URL = os.getenv('KOHA_API_URL', 'http://127.0.0.1:8085')
KOHA_CLIENT_ID = os.getenv('KOHA_CLIENT_ID')
KOHA_CLIENT_SECRET = os.getenv('KOHA_CLIENT_SECRET')

def validate_config():
    """Verify all required configurations are set."""
    required = ['DSPACE_URL', 'DSPACE_EMAIL', 'DSPACE_PASSWORD', 'COLLECTION_UUID']
    missing = [var for var in required if not os.getenv(var)]
    
    if missing:
        print(f"⚠️ Warning: Missing configuration variables in .env: {', '.join(missing)}")
        return False
    return True
