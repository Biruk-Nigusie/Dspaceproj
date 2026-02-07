import requests
import json
import os
from django.conf import settings

from dspace.config import KOHA_BASE_API_URL, KOHA_CLIENT_ID, KOHA_CLIENT_SECRET

class KohaRestAPI:
    def __init__(self):
        self.base_url = KOHA_BASE_API_URL
        self.client_id = KOHA_CLIENT_ID
        self.client_secret = KOHA_CLIENT_SECRET
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
        print(f"🚀 Koha: Attempting to create biblio for: {metadata.get('title')}")
        
        if not self.token:
            print("🔑 Koha: Token missing, authenticating...")
            if not self.authenticate():
                print("❌ Koha: Authentication failed")
                return None
        
        try:
            # Convert metadata to MARC format
            marc_record = self._convert_to_marc(metadata)
            
            headers = self._get_headers("application/marc-in-json")
            print(f"📤 Koha: Sending POST to {self.base_url}/biblios")
            # print(f"DEBUG Headers: {headers}")
            
            response = requests.post(f"{self.base_url}/biblios", 
                                   headers=headers,
                                   json=marc_record,
                                   timeout=10)
            
            print(f"📥 Koha: Status {response.status_code}")
            
            if response.status_code in (200, 201):
                try:
                    res_json = response.json()
                    if not res_json and response.status_code == 201:
                        # Sometimes 201 has no body, but we need biblionumber
                        location = response.headers.get('Location', '')
                        if location:
                            bib_id = location.split('/')[-1]
                            return {"id": int(bib_id)}
                    return res_json
                except Exception as je:
                    print(f"⚠️ Koha: JSON parse error: {je}")
                    # Try to extract ID from Location header
                    location = response.headers.get('Location', '')
                    if location:
                        bib_id = location.split('/')[-1]
                        return {"id": int(bib_id)}
                    return None
            else:
                print(f"❌ Koha: create_biblio failed: {response.status_code} - {response.text}")
                # Log a bit of the payload for debugging (truncated if too long)
                payload_str = json.dumps(marc_record)
                print(f"🔍 Koha: Payload: {payload_str[:500]}...")
                return None
        except Exception as e:
            print(f"❌ Koha: Create biblio exception: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def create_biblio_from_marc(self, marc_record):
        """Create bibliographic record from MARC21 data"""
        if not self.token and not self.authenticate():
            return None
        
        try:
            headers = self._get_headers("application/marc-in-json")
            response = requests.post(f"{self.base_url}/biblios", 
                                   headers=headers,
                                   json=marc_record,
                                   timeout=10)
            
            if response.status_code in (200, 201):
                try:
                    res_json = response.json()
                    if not res_json and response.status_code == 201:
                        # Extract ID from Location header
                        location = response.headers.get('Location', '')
                        if location:
                            bib_id = location.split('/')[-1]
                            return {"id": int(bib_id)}
                    return res_json
                except Exception:
                    # Try to extract ID from Location header
                    location = response.headers.get('Location', '')
                    if location:
                        bib_id = location.split('/')[-1]
                        return {"id": int(bib_id)}
                    return None
            else:
                print(f"❌ Koha: create_biblio_from_marc failed: {response.status_code} - {response.text}")
                try:
                    return response.json()
                except:
                    return None
        except Exception as e:
            print(f"❌ Koha: Create biblio exception: {e}")
            return None
    
    def add_item(self, biblio_id, item_data):
        """Add item to bibliographic record"""
        if not self.token and not self.authenticate():
            return None
        
        try:
            response = requests.post(f"{self.base_url}/biblios/{biblio_id}/items", 
                                   headers=self._get_headers(),
                                   json=item_data)
            
            if response.status_code in (200, 201):
                result = response.json()
                # Ensure we return item_id
                if 'item_id' not in result and 'id' in result:
                    result['item_id'] = result['id']
                return result
            else:
                print(f"❌ Koha add_item failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ Koha add_item exception: {e}")
            return None
    
    def get_biblio_items(self, biblio_id):
        """Get all items for a bibliographic record"""
        if not self.token and not self.authenticate():
            return []
        
        try:
            response = requests.get(f"{self.base_url}/biblios/{biblio_id}/items", 
                                  headers=self._get_headers())
            
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"❌ Koha get_biblio_items exception: {e}")
            return []
    
    def _convert_to_marc(self, metadata):
        """Convert metadata to MARC format with all fields"""
        # Modern Koha REST API expects "leader" and "fields"
        leader = "00000nam a2200000 i 4500"
        fields = []
        
        # Add 008 control field (standard for books/documents)
        # Position 00-05: Date entered on file (YYMMDD)
        # Position 07-10: Date 1 (Year)
        year_str = str(metadata.get('year', '2024'))[:4].zfill(4)
        c008 = f"240101s{year_str}    xx ||||| |||| 000 0 eng d"
        fields.append({"008": c008})
        
        # Title (245)
        if metadata.get('title'):
            fields.append({
                "245": {
                    "subfields": [{"a": metadata['title']}],
                    "ind1": "1", "ind2": "0"
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
        
        # Call number (050)
        if metadata.get('call_number'):
            fields.append({
                "050": {
                    "subfields": [{"a": metadata['call_number']}],
                    "ind1": " ", "ind2": "4"
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
        
        return {"leader": leader, "fields": fields}