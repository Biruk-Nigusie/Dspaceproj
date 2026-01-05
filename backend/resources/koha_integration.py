import requests
import json
from django.conf import settings

class KohaAPI:
    def __init__(self):
        self.base_url = settings.KOHA_API_URL
        self.username = "koha"  # Default Koha user
        self.password = "koha"
        self.token = None
    
    def authenticate(self):
        """Authenticate with Koha API"""
        try:
            auth_url = f"{self.base_url}/api/v1/auth/session"
            auth_data = {
                "username": self.username,
                "password": self.password
            }
            response = requests.post(auth_url, json=auth_data)
            if response.status_code == 201:
                self.token = response.json().get('session_id')
                return True
        except:
            pass
        return False
    
    def create_biblio(self, title, authors, description, year, resource_type, dspace_url):
        """Create bibliographic record in Koha"""
        try:
            url = f"{self.base_url}/api/v1/biblios"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.token}'
            } if self.token else {'Content-Type': 'application/json'}
            
            # Create MARCXML record
            marcxml = self.create_marcxml(title, authors, description, year, resource_type, dspace_url)
            
            data = {
                "marcxml": marcxml,
                "framework": ""
            }
            
            response = requests.post(url, json=data, headers=headers)
            if response.status_code == 201:
                return response.json()
        except Exception as e:
            print(f"Koha create biblio error: {e}")
        return None
    
    def create_marcxml(self, title, authors, description, year, resource_type, dspace_url):
        """Create MARCXML record"""
        marcxml = f'''<?xml version="1.0" encoding="UTF-8"?>
<record xmlns="http://www.loc.gov/MARC21/slim">
    <leader>00000nam a2200000 a 4500</leader>
    <datafield tag="245" ind1="1" ind2="0">
        <subfield code="a">{title}</subfield>
    </datafield>'''
        
        if authors:
            marcxml += f'''
    <datafield tag="100" ind1="1" ind2=" ">
        <subfield code="a">{authors}</subfield>
    </datafield>'''
        
        if year:
            marcxml += f'''
    <datafield tag="260" ind1=" " ind2=" ">
        <subfield code="c">{year}</subfield>
    </datafield>'''
        
        if description:
            marcxml += f'''
    <datafield tag="520" ind1=" " ind2=" ">
        <subfield code="a">{description}</subfield>
    </datafield>'''
        
        if dspace_url:
            marcxml += f'''
    <datafield tag="856" ind1="4" ind2="0">
        <subfield code="u">{dspace_url}</subfield>
        <subfield code="z">Access online resource</subfield>
    </datafield>'''
        
        marcxml += '''
</record>'''
        
        return marcxml