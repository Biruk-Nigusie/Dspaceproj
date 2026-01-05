import requests
import json
from django.conf import settings

class RealVuFindAPI:
    def __init__(self):
        self.base_url = "http://localhost:8090"
        self.solr_url = "http://localhost:8983/solr"
        self.session = requests.Session()
    
    def test_connection(self):
        """Test VuFind connection"""
        try:
            # Test VuFind main page
            response = self.session.get(self.base_url, timeout=5)
            if response.status_code == 200:
                print("✅ VuFind web interface accessible")
                return True
            
            return False
        except Exception as e:
            print(f"VuFind connection error: {e}")
            return False
    
    def search_records(self, query, limit=20):
        """Search VuFind records"""
        try:
            # Try VuFind API first
            api_url = f"{self.base_url}/api/v1/search"
            params = {
                'lookfor': query,
                'limit': limit,
                'type': 'AllFields',
                'format': 'json'
            }
            
            response = self.session.get(api_url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                records = data.get('records', [])
                print(f"✅ VuFind API search found {len(records)} records")
                return records
            
            # Fallback to Solr direct search
            return self._search_solr_direct(query, limit)
            
        except Exception as e:
            print(f"VuFind search error: {e}")
            return self._search_solr_direct(query, limit)
    
    def _search_solr_direct(self, query, limit):
        """Search Solr directly"""
        try:
            # Try biblio core first
            cores = ['biblio', 'authority', 'reserves']
            
            for core in cores:
                solr_url = f"{self.solr_url}/{core}/select"
                params = {
                    'q': f'title:"{query}" OR author:"{query}" OR subject:"{query}"',
                    'rows': limit,
                    'wt': 'json',
                    'fl': 'id,title,author,publishDate,format,summary,isbn,subject'
                }
                
                try:
                    response = self.session.get(solr_url, params=params, timeout=10)
                    
                    if response.status_code == 200:
                        data = response.json()
                        docs = data.get('response', {}).get('docs', [])
                        
                        if docs:
                            records = []
                            for doc in docs:
                                records.append({
                                    'id': doc.get('id', ''),
                                    'title': self._extract_field(doc.get('title')),
                                    'author': self._extract_field(doc.get('author')),
                                    'format': self._extract_field(doc.get('format')),
                                    'publishDate': self._extract_field(doc.get('publishDate')),
                                    'summary': self._extract_field(doc.get('summary')),
                                    'isbn': self._extract_field(doc.get('isbn')),
                                    'subject': self._extract_field(doc.get('subject'))
                                })
                            
                            print(f"✅ Solr {core} search found {len(records)} records")
                            return records
                except:
                    continue
            
            return []
        except Exception as e:
            print(f"Solr search error: {e}")
            return []
    
    def _extract_field(self, field_value):
        """Extract field value from Solr response"""
        if isinstance(field_value, list):
            return field_value[0] if field_value else ''
        return field_value or ''
    
    def get_record_details(self, record_id):
        """Get detailed record information"""
        try:
            url = f"{self.base_url}/Record/{record_id}"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                print(f"✅ VuFind record details retrieved: {record_id}")
                return {
                    'id': record_id,
                    'url': url,
                    'available': True
                }
            
            return None
        except Exception as e:
            print(f"VuFind record details error: {e}")
            return None
    
    def index_record(self, record_data):
        """Index a record in VuFind/Solr"""
        try:
            # This would typically require VuFind's indexing process
            # For now, we'll simulate successful indexing
            solr_url = f"{self.solr_url}/biblio/update"
            
            # Convert record to Solr document format
            solr_doc = {
                'id': record_data.get('id', ''),
                'title': record_data.get('title', ''),
                'author': record_data.get('author', ''),
                'format': record_data.get('format', 'Unknown'),
                'publishDate': record_data.get('year', ''),
                'summary': record_data.get('description', ''),
                'institution': 'Ministry of Innovation & Technology'
            }
            
            # Add document to Solr
            data = {'add': {'doc': solr_doc}}
            headers = {'Content-Type': 'application/json'}
            
            response = self.session.post(solr_url, json=data, headers=headers, timeout=30)
            
            if response.status_code == 200:
                # Commit the changes
                commit_url = f"{self.solr_url}/biblio/update?commit=true"
                commit_response = self.session.post(commit_url, timeout=10)
                
                if commit_response.status_code == 200:
                    print(f"✅ Record indexed in VuFind: {record_data.get('title', '')}")
                    return True
            
            return False
        except Exception as e:
            print(f"VuFind indexing error: {e}")
            return False