import requests
import json
from django.conf import settings
from urllib.parse import quote

class KohaCatalogAPI:
    def __init__(self):
        self.base_url = getattr(settings, 'KOHA_API_URL', 'http://127.0.0.1:8085')
        self.session = requests.Session()
    
    def search_catalog(self, query="", limit=20, filters=None):
        """Search Koha catalog using OPAC search"""
        try:
            # Use OPAC search endpoint
            search_url = f"{self.base_url}/cgi-bin/koha/opac-search.pl"
            
            params = {
                'idx': 'kw',  # keyword search
                'q': query or '*',
                'sort_by': 'relevance',
                'count': limit,
                'format': 'json'  # Try JSON format first
            }
            
            # Add filters if provided
            if filters:
                if filters.get('type'):
                    params['limit'] = f"itype:{filters['type']}"
                if filters.get('year'):
                    params['limit-yr'] = filters['year']
            
            response = self.session.get(search_url, params=params, timeout=10)
            
            if response.status_code == 200:
                # Try to parse as JSON first
                try:
                    data = response.json()
                    return self._parse_json_results(data)
                except:
                    # Fallback to HTML parsing
                    return self._parse_html_results(response.text, query, limit)
            
            return []
            
        except Exception as e:
            print(f"Koha search error: {e}")
            return []
    
    def get_all_items(self, limit=100):
        """Get all items from Koha catalog"""
        return self.search_catalog("*", limit)
    
    def get_item_details(self, biblio_id):
        """Get detailed information about a specific item"""
        try:
            detail_url = f"{self.base_url}/cgi-bin/koha/opac-detail.pl"
            params = {'biblionumber': biblio_id}
            
            response = self.session.get(detail_url, params=params, timeout=10)
            
            if response.status_code == 200:
                return self._parse_item_detail(response.text, biblio_id)
            
            return None
            
        except Exception as e:
            print(f"Koha item detail error: {e}")
            return None
    
    def _parse_json_results(self, data):
        """Parse JSON results from Koha"""
        items = []
        
        # Handle different JSON structures
        records = data.get('records', [])
        if not records and 'results' in data:
            records = data['results']
        
        for record in records:
            item = {
                'id': f"koha_{record.get('biblionumber', '')}",
                'title': record.get('title', 'Unknown Title'),
                'authors': record.get('author', ''),
                'publisher': record.get('publisher', ''),
                'year': record.get('copyrightdate', ''),
                'isbn': record.get('isbn', ''),
                'issn': record.get('issn', ''),
                'subjects': record.get('subject', ''),
                'description': record.get('notes', ''),
                'source': 'koha',
                'source_name': 'Library Catalog',
                'external_id': record.get('biblionumber', ''),
                'resource_type': record.get('itemtype', 'Book'),
                'availability': 'Available',
                'is_cataloged': True,
                'koha_id': record.get('biblionumber', ''),
                'url': f"{self.base_url}/cgi-bin/koha/opac-detail.pl?biblionumber={record.get('biblionumber', '')}",
                'loan_url': f"{self.base_url}/cgi-bin/koha/opac-search.pl?idx=kw&q={quote(record.get('title', ''))}"
            }
            items.append(item)
        
        return items
    
    def _parse_html_results(self, html_content, query, limit):
        """Parse HTML results from Koha OPAC"""
        items = []
        
        # Simple HTML parsing - in production, use BeautifulSoup
        try:
            import re
            
            # Extract biblionumber patterns
            biblio_pattern = r'biblionumber=(\d+)'
            biblios = re.findall(biblio_pattern, html_content)
            
            # Extract titles
            title_pattern = r'<a[^>]*href="[^"]*biblionumber=\d+[^"]*"[^>]*>([^<]+)</a>'
            titles = re.findall(title_pattern, html_content)
            
            # Create items from extracted data
            for i, (biblio_id, title) in enumerate(zip(biblios[:limit], titles[:limit])):
                item = {
                    'id': f"koha_{biblio_id}",
                    'title': title.strip(),
                    'authors': '',
                    'publisher': '',
                    'year': '',
                    'isbn': '',
                    'issn': '',
                    'subjects': '',
                    'description': '',
                    'source': 'koha',
                    'source_name': 'Library Catalog',
                    'external_id': biblio_id,
                    'resource_type': 'Book',
                    'availability': 'Available',
                    'is_cataloged': True,
                    'koha_id': biblio_id,
                    'url': f"{self.base_url}/cgi-bin/koha/opac-detail.pl?biblionumber={biblio_id}",
                    'loan_url': f"{self.base_url}/cgi-bin/koha/opac-search.pl?idx=kw&q={quote(title)}"
                }
                items.append(item)
            
        except Exception as e:
            print(f"HTML parsing error: {e}")
        
        return items
    
    def _parse_item_detail(self, html_content, biblio_id):
        """Parse detailed item information from HTML"""
        try:
            import re
            
            # Extract various metadata fields
            detail = {
                'biblionumber': biblio_id,
                'title': '',
                'author': '',
                'publisher': '',
                'year': '',
                'isbn': '',
                'subjects': '',
                'description': '',
                'items_count': 0
            }
            
            # Extract title
            title_match = re.search(r'<title>([^<]+)</title>', html_content)
            if title_match:
                detail['title'] = title_match.group(1).replace(' › Koha', '').strip()
            
            # Extract other fields using common patterns
            # This is a simplified parser - in production, use proper HTML parsing
            
            return detail
            
        except Exception as e:
            print(f"Detail parsing error: {e}")
            return None
    
    def get_collections_metadata(self):
        """Get metadata about different item types/collections in Koha"""
        # This would typically query Koha's item types and authorized values
        return {
            'item_types': [
                {'code': 'BK', 'name': 'Books', 'description': 'Books and monographs'},
                {'code': 'SR', 'name': 'Serials', 'description': 'Journals and periodicals'},
                {'code': 'MM', 'name': 'Multimedia', 'description': 'Audio/Video materials'},
                {'code': 'AR', 'name': 'Archives', 'description': 'Archival materials'},
                {'code': 'MF', 'name': 'Microfilm', 'description': 'Microfilm materials'}
            ],
            'metadata_fields': [
                'title', 'author', 'publisher', 'year', 'isbn', 'issn', 
                'subjects', 'description', 'itemtype', 'callnumber'
            ]
        }