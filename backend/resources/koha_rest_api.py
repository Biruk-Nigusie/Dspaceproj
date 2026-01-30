import requests
import json
import os
from django.conf import settings

class KohaRestAPI:
    def __init__(self):
        self.base_url = "http://127.0.0.1:8085/api/v1"
        self.client_id = os.getenv('KOHA_CLIENT_ID', '0d7136be-4bee-4086-b36a-22f1d89600a0')
        self.client_secret = os.getenv('KOHA_CLIENT_SECRET', 'd022ced0-f36f-41bd-8f47-a9a367c451ca')
        self.token = None
    
    def authenticate(self):
        """Get OAuth2 token"""
        try:
            response = requests.post(f"{self.base_url}/oauth/token", 
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                })
            
            if response.status_code == 200:
                self.token = response.json().get('access_token')
                return True
            return False
        except:
            return False
    
    def _get_headers(self, content_type="application/json"):
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": content_type,
            "Accept": "application/json"
        }
    
    def search_biblios(self, query, limit=20):
        """Get all bibliographic records"""
        if not self.token and not self.authenticate():
            return []
        
        try:
            params = {"_per_page": limit}
            response = requests.get(f"{self.base_url}/biblios", 
                                  headers=self._get_headers(),
                                  params=params)
            
            if response.status_code == 200:
                return response.json()
            return []
        except:
            return []
    
    def get_biblio(self, biblio_id):
        """Get specific bibliographic record"""
        if not self.token and not self.authenticate():
            return None
        
        try:
            response = requests.get(f"{self.base_url}/biblios/{biblio_id}", 
                                  headers=self._get_headers())
            
            if response.status_code == 200:
                return response.json()
            return None
        except:
            return None
    
    def create_biblio(self, metadata):
        """Create new bibliographic record"""
        if not self.token and not self.authenticate():
            return None
        
        try:
            # Convert metadata to MARC format
            marc_record = self._convert_to_marc(metadata)
            
            response = requests.post(f"{self.base_url}/biblios", 
                                   headers=self._get_headers("application/marc-in-json"),
                                   json=marc_record)
            
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"Create biblio error: {e}")
            return None
    
    def add_item(self, biblio_id, item_data):
        """Add item to bibliographic record"""
        if not self.token and not self.authenticate():
            return None
        
        try:
            response = requests.post(f"{self.base_url}/biblios/{biblio_id}/items", 
                                   headers=self._get_headers(),
                                   json=item_data)
            
            if response.status_code == 201:
                return response.json()
            return None
        except:
            return None
    
    def _convert_to_marc(self, metadata):
        """Convert metadata to MARC format with all fields"""
        fields = []
        
        # Title (245)
        if metadata.get('title'):
            fields.append({
                "245": {
                    "subfields": [{"a": metadata['title']}],
                    "ind1": "0", "ind2": "0"
                }
            })
        
        # Author (100)
        if metadata.get('authors'):
            fields.append({
                "100": {
                    "subfields": [{"a": metadata['authors']}],
                    "ind1": "1", "ind2": " "
                }
            })
        
        # Publisher (260)
        subfields_260 = []
        if metadata.get('publisher'):
            subfields_260.append({"b": metadata['publisher']})
        if metadata.get('year'):
            subfields_260.append({"c": str(metadata['year'])})
        if subfields_260:
            fields.append({
                "260": {
                    "subfields": subfields_260,
                    "ind1": " ", "ind2": " "
                }
            })
        
        # Series (490)
        if metadata.get('series'):
            fields.append({
                "490": {
                    "subfields": [{"a": metadata['series']}],
                    "ind1": "0", "ind2": " "
                }
            })
        
        # Abstract/Description (520)
        if metadata.get('description'):
            fields.append({
                "520": {
                    "subfields": [{"a": metadata['description']}],
                    "ind1": " ", "ind2": " "
                }
            })
        
        # Subject (650)
        if metadata.get('subject'):
            subjects = [s.strip() for s in metadata['subject'].split(',') if s.strip()]
            for subject in subjects:
                fields.append({
                    "650": {
                        "subfields": [{"a": subject}],
                        "ind1": " ", "ind2": "0"
                    }
                })
        
        # Language (041)
        if metadata.get('language') and metadata['language'] != 'en':
            fields.append({
                "041": {
                    "subfields": [{"a": metadata['language']}],
                    "ind1": "0", "ind2": " "
                }
            })
        
        # ISSN (022)
        if metadata.get('issn'):
            fields.append({
                "022": {
                    "subfields": [{"a": metadata['issn']}],
                    "ind1": " ", "ind2": " "
                }
            })
        
        # Citation (524)
        if metadata.get('citation'):
            fields.append({
                "524": {
                    "subfields": [{"a": metadata['citation']}],
                    "ind1": " ", "ind2": " "
                }
            })
        
        # Sponsors (536)
        if metadata.get('sponsors'):
            fields.append({
                "536": {
                    "subfields": [{"a": metadata['sponsors']}],
                    "ind1": " ", "ind2": " "
                }
            })
        
        # Resource type (655)
        if metadata.get('resource_type'):
            fields.append({
                "655": {
                    "subfields": [{"a": metadata['resource_type']}],
                    "ind1": " ", "ind2": "7"
                }
            })
        
        # Notes (500)
        notes = 'Imported from DSpace'
        if metadata.get('dspace_url'):
            notes += f" - Digital version: {metadata['dspace_url']}"
        
        fields.append({
            "500": {
                "subfields": [{"a": notes}],
                "ind1": " ", "ind2": " "
            }
        })
        
        return {"fields": fields}