import requests
import json
from django.conf import settings

class DSpaceAPI:
    def __init__(self):
        self.base_url = settings.DSPACE_API_URL
        self.token = None
    
    def authenticate(self):
        """Authenticate with DSpace"""
        try:
            auth_url = f"{self.base_url}/api/authn/login"
            auth_data = {
                "user": "admin@dspace.org",  # Default DSpace admin
                "password": "dspace"
            }
            response = requests.post(auth_url, json=auth_data)
            if response.status_code == 200:
                self.token = response.headers.get('Authorization')
                return True
        except:
            pass
        return False
    
    def get_collections(self):
        """Get available collections"""
        try:
            url = f"{self.base_url}/api/core/collections"
            headers = {'Authorization': self.token} if self.token else {}
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                collections = data.get('_embedded', {}).get('collections', [])
                return collections[0] if collections else None
        except:
            pass
        return None
    
    def create_item(self, collection_uuid, title, authors, description, year, resource_type):
        """Create item in DSpace"""
        try:
            url = f"{self.base_url}/api/core/items"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': self.token
            } if self.token else {'Content-Type': 'application/json'}
            
            metadata = {
                "metadata": {
                    "dc.title": [{"value": title}],
                    "dc.type": [{"value": resource_type}]
                }
            }
            
            if authors:
                metadata["metadata"]["dc.contributor.author"] = [{"value": authors}]
            if description:
                metadata["metadata"]["dc.description.abstract"] = [{"value": description}]
            if year:
                metadata["metadata"]["dc.date.issued"] = [{"value": str(year)}]
            
            # Add collection
            metadata["owningCollection"] = f"/api/core/collections/{collection_uuid}"
            
            response = requests.post(url, json=metadata, headers=headers)
            if response.status_code == 201:
                return response.json()
        except Exception as e:
            print(f"DSpace create item error: {e}")
        return None
    
    def upload_bitstream(self, item_uuid, file_data, filename):
        """Upload file to DSpace item"""
        try:
            url = f"{self.base_url}/api/core/items/{item_uuid}/bitstreams"
            headers = {'Authorization': self.token} if self.token else {}
            
            files = {'file': (filename, file_data, 'application/octet-stream')}
            data = {'name': filename}
            
            response = requests.post(url, files=files, data=data, headers=headers)
            if response.status_code == 201:
                return response.json()
        except Exception as e:
            print(f"DSpace upload bitstream error: {e}")
        return None