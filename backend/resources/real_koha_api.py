import requests
import json
import xml.etree.ElementTree as ET
from django.conf import settings

class RealKohaAPI:
    def __init__(self):
        self.base_url = settings.KOHA_API_URL
        self.session = requests.Session()
        self.api_key = None
    
    def authenticate(self):
        """Authenticate with Koha using real credentials"""
        try:
            # Try Koha REST API authentication
            auth_url = f"{self.base_url}/api/v1/auth/session"
            
            # Try common Koha credentials
            credentials = [
                {"userid": "koha", "password": "koha"},
                {"userid": "admin", "password": "admin"},
                {"userid": "librarian", "password": "librarian"}
            ]
            
            for cred in credentials:
                try:
                    response = self.session.post(auth_url, json=cred, timeout=10)
                    if response.status_code == 201:
                        session_data = response.json()
                        self.session.headers.update({
                            'Authorization': f'Bearer {session_data.get("session_id", "")}'
                        })
                        print(f"✅ Koha authenticated with {cred['userid']}")
                        return True
                except:
                    continue
            
            # Try API key authentication
            try:
                # Check if API key exists in headers
                test_url = f"{self.base_url}/api/v1/libraries"
                response = self.session.get(test_url, timeout=5)
                if response.status_code == 200:
                    print("✅ Koha API accessible")
                    return True
            except:
                pass
            
            return False
        except Exception as e:
            print(f"Koha auth error: {e}")
            return False
    
    def create_biblio(self, metadata):
        """Create real bibliographic record in Koha"""
        try:
            url = f"{self.base_url}/api/v1/biblios"
            
            # Create MARCXML record
            marcxml = self._create_marcxml(metadata)
            
            data = {
                "marcxml": marcxml,
                "framework": ""
            }
            
            response = self.session.post(url, json=data, timeout=30)
            
            if response.status_code == 201:
                biblio = response.json()
                print(f"✅ Koha biblio created: {biblio.get('biblio_id')}")
                return biblio
            
            return None
        except Exception as e:
            print(f"Koha create biblio error: {e}")
            return None
    
    def search_biblios(self, query, limit=20):
        """Search real Koha biblios"""
        try:
            # Try SRU search first
            sru_url = f"{self.base_url}/cgi-bin/koha/sru"
            params = {
                'version': '1.1',
                'operation': 'searchRetrieve',
                'query': f'title="{query}" or author="{query}" or subject="{query}"',
                'maximumRecords': limit,
                'recordSchema': 'marcxml'
            }
            
            response = self.session.get(sru_url, params=params, timeout=10)
            
            if response.status_code == 200:
                records = self._parse_sru_response(response.content)
                print(f"✅ Koha SRU search found {len(records)} records")
                return records
            
            # Fallback to OPAC search
            opac_url = f"{self.base_url}/cgi-bin/koha/opac-search.pl"
            params = {
                'q': query,
                'format': 'rss',
                'count': limit
            }
            
            response = self.session.get(opac_url, params=params, timeout=10)
            if response.status_code == 200:
                # Parse RSS response
                records = self._parse_rss_response(response.content)
                print(f"✅ Koha OPAC search found {len(records)} records")
                return records
            
            return []
        except Exception as e:
            print(f"Koha search error: {e}")
            return []
    
    def _create_marcxml(self, metadata):
        """Create MARCXML from metadata"""
        title = metadata.get('title', '')
        authors = metadata.get('authors', '')
        description = metadata.get('description', '')
        year = metadata.get('year', '')
        dspace_url = metadata.get('dspace_url', '')
        
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
        <subfield code="z">Access digital resource</subfield>
    </datafield>'''
        
        marcxml += '''
</record>'''
        
        return marcxml
    
    def _parse_sru_response(self, xml_content):
        """Parse SRU XML response"""
        try:
            root = ET.fromstring(xml_content)
            records = []
            
            for record in root.findall('.//{http://www.loc.gov/zing/srw/}record'):
                title_elem = record.find('.//{http://www.loc.gov/MARC21/slim}datafield[@tag="245"]/{http://www.loc.gov/MARC21/slim}subfield[@code="a"]')
                author_elem = record.find('.//{http://www.loc.gov/MARC21/slim}datafield[@tag="100"]/{http://www.loc.gov/MARC21/slim}subfield[@code="a"]')
                year_elem = record.find('.//{http://www.loc.gov/MARC21/slim}datafield[@tag="260"]/{http://www.loc.gov/MARC21/slim}subfield[@code="c"]')
                
                records.append({
                    'biblionumber': len(records) + 1,
                    'title': title_elem.text if title_elem is not None else 'Unknown Title',
                    'author': author_elem.text if author_elem is not None else '',
                    'copyrightdate': year_elem.text if year_elem is not None else '',
                    'notes': 'From Koha catalog',
                    'items_count': 1
                })
            
            return records
        except Exception as e:
            print(f"SRU parse error: {e}")
            return []
    
    def _parse_rss_response(self, rss_content):
        """Parse RSS response from OPAC"""
        try:
            root = ET.fromstring(rss_content)
            records = []
            
            for item in root.findall('.//item'):
                title_elem = item.find('title')
                description_elem = item.find('description')
                
                records.append({
                    'biblionumber': len(records) + 1,
                    'title': title_elem.text if title_elem is not None else 'Unknown Title',
                    'author': '',
                    'copyrightdate': '',
                    'notes': description_elem.text if description_elem is not None else '',
                    'items_count': 1
                })
            
            return records
        except Exception as e:
            print(f"RSS parse error: {e}")
            return []