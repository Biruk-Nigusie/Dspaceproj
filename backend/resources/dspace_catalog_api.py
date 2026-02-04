import requests
import json
from django.conf import settings

class DSpaceCatalogAPI:
    def __init__(self):
        self.base_url = getattr(settings, 'DSPACE_API_URL', 'http://localhost:8080/server/api')
        self.session = requests.Session()
        self.session.headers.update({'Accept': 'application/json'})
    
    def get_all_collections(self):
        """Get all collections with their metadata"""
        try:
            url = f"{self.base_url}/core/collections"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                collections = data.get('_embedded', {}).get('collections', [])
                
                return [{
                    'uuid': col['uuid'],
                    'name': col['name'],
                    'handle': col['handle'],
                    'type': self._determine_collection_type(col['name'])
                } for col in collections]
            
            return []
            
        except Exception as e:
            print(f"DSpace collections error: {e}")
            return []
    
    def get_items_from_all_collections(self, limit=100):
        """Get items from all collections with comprehensive metadata"""
        try:
            url = f"{self.base_url}/discover/search/objects"
            params = {
                'dsoType': 'item',
                'size': limit,
                'page': 0
            }
            
            response = self.session.get(url, params=params, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                return self._transform_dspace_items(data)
            
            return []
            
        except Exception as e:
            print(f"DSpace items error: {e}")
            return []
    
    def get_items_by_collection(self, collection_uuid, limit=50):
        """Get items from a specific collection"""
        try:
            url = f"{self.base_url}/discover/search/objects"
            params = {
                'dsoType': 'item',
                'scope': collection_uuid,
                'size': limit,
                'page': 0
            }
            
            response = self.session.get(url, params=params, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                return self._transform_dspace_items(data)
            
            return []
            
        except Exception as e:
            print(f"DSpace collection items error: {e}")
            return []
    
    def search_items(self, query, collections=None, limit=50):
        """Search items across collections"""
        try:
            url = f"{self.base_url}/discover/search/objects"
            params = {
                'dsoType': 'item',
                'query': query,
                'size': limit,
                'page': 0
            }
            
            if collections:
                # Handle multiple collections
                if isinstance(collections, list):
                    scope_query = " OR ".join([f"location:{c}" for c in collections])
                    if query:
                        params['query'] = f"({query}) AND ({scope_query})"
                    else:
                        params['query'] = scope_query
                else:
                    params['scope'] = collections
            
            response = self.session.get(url, params=params, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                return self._transform_dspace_items(data)
            
            return []
            
        except Exception as e:
            print(f"DSpace search error: {e}")
            return []
    
    def _transform_dspace_items(self, data):
        """Transform DSpace API response to unified format"""
        items = []
        
        search_result = data.get('_embedded', {}).get('searchResult', {})
        objects = search_result.get('_embedded', {}).get('objects', [])
        
        for obj in objects:
            item_data = obj.get('_embedded', {}).get('indexableObject', {})
            metadata = item_data.get('metadata', {})
            
            # Extract comprehensive metadata
            transformed_item = self._extract_comprehensive_metadata(item_data, metadata)
            items.append(transformed_item)
        
        return items
    
    def _extract_comprehensive_metadata(self, item_data, metadata):
        """Extract comprehensive metadata from DSpace item"""
        def get_metadata_values(field_name):
            vals = metadata.get(field_name, [])
            return [v.get('value', '') for v in vals if v.get('value')]
        
        def get_first_value(field_name):
            values = get_metadata_values(field_name)
            return values[0] if values else ""
        
        # Basic fields
        title = item_data.get('name', '') or get_first_value('dc.title')
        authors = get_metadata_values('dc.contributor.author')
        author_str = ", ".join(authors) if authors else ""
        
        # Date handling
        years = get_metadata_values('dc.date.issued')
        year = years[0][:4] if years and len(years[0]) >= 4 else (years[0] if years else "")
        
        # Determine collection type and set appropriate fields
        collection_type = self._determine_item_type(metadata)
        
        # Common fields
        base_item = {
            'id': f"dspace_{item_data.get('uuid', '')}",
            'title': title,
            'authors': author_str,
            'source': 'dspace',
            'source_name': 'Research Repository',
            'external_id': item_data.get('handle', ''),
            'resource_type': get_first_value('dc.type') or 'item',
            'year': year,
            'description': get_first_value('dc.description.abstract') or get_first_value('dc.description'),
            'url': f"http://localhost:4000/handle/{item_data.get('handle', '')}",
            'preview_url': f"/api/resources/dspace-bitstream/{item_data.get('handle', '')}/",
            'availability': 'Open Access',
            'collection_type': collection_type,
            'metadata': {
                'uuid': item_data.get('uuid', ''),
                'handle': item_data.get('handle', ''),
                'lastModified': item_data.get('lastModified', '')
            }
        }
        
        # Add type-specific fields
        if collection_type == 'archive':
            base_item.update({
                'archivalType': get_first_value('dc.type.archival'),
                'provenance': get_first_value('dc.provenance'),
                'quantity': get_first_value('local.archival.quantity'),
                'security': get_first_value('local.archival.security'),
                'medium': get_first_value('local.archival.medium'),
                'arrangement': get_first_value('local.arrangement.level'),
                'processing': get_first_value('local.archival.processing'),
                'accessionNumber': get_first_value('dc.identifier.accession'),
                'refCode': get_first_value('dc.identifier.refcode'),
                'calendarType': get_first_value('dc.date.calendartype'),
                'temporalCoverage': get_first_value('dc.coverage.temporal')
            })
        elif collection_type == 'printed':
            base_item.update({
                'publisher': get_first_value('dc.publisher'),
                'isbn': get_first_value('dc.identifier.isbn'),
                'extent': get_first_value('dc.format.extent'),
                'language': get_first_value('dc.language.iso'),
                'citation': get_first_value('dc.identifier.citation'),
                'subjects': ", ".join(get_metadata_values('dc.subject'))
            })
        elif collection_type == 'serial':
            base_item.update({
                'publisher': get_first_value('dc.publisher'),
                'issn': get_first_value('dc.identifier.issn'),
                'series': get_first_value('dc.relation.ispartofseries'),
                'language': get_first_value('dc.language.iso'),
                'subjects': ", ".join(get_metadata_values('dc.subject'))
            })
        elif collection_type == 'multimedia':
            base_item.update({
                'extent': get_first_value('dc.format.extent'),
                'medium': get_first_value('dc.format.medium'),
                'language': get_first_value('dc.language.iso'),
                'subjects': ", ".join(get_metadata_values('dc.subject'))
            })
        
        # Add common additional fields
        base_item.update({
            'abstract': get_first_value('dc.description.abstract'),
            'sponsors': get_first_value('dc.description.sponsorship'),
            'rights': get_first_value('dc.rights'),
            'language': base_item.get('language') or get_first_value('dc.language.iso'),
            'subjects': base_item.get('subjects') or ", ".join(get_metadata_values('dc.subject')),
            'altTitle': get_first_value('dc.title.alternative'),
            'reportNo': get_first_value('dc.identifier.other'),
            'uri': get_first_value('dc.identifier.uri')
        })
        
        return base_item
    
    def _determine_item_type(self, metadata):
        """Determine item type based on metadata"""
        dc_type = metadata.get('dc.type', [{}])[0].get('value', '').lower()
        archival_type = metadata.get('dc.type.archival', [{}])[0].get('value', '').lower()
        
        if archival_type or 'archive' in dc_type:
            return 'archive'
        elif 'serial' in dc_type or 'journal' in dc_type or 'periodical' in dc_type:
            return 'serial'
        elif 'multimedia' in dc_type or 'audio' in dc_type or 'video' in dc_type:
            return 'multimedia'
        elif 'book' in dc_type or 'monograph' in dc_type:
            return 'printed'
        else:
            return 'default'
    
    def _determine_collection_type(self, collection_name):
        """Determine collection type from name"""
        name_lower = collection_name.lower()
        
        if 'archive' in name_lower or 'manuscript' in name_lower:
            return 'archive'
        elif 'book' in name_lower or 'monograph' in name_lower:
            return 'printed'
        elif 'serial' in name_lower or 'journal' in name_lower or 'periodical' in name_lower:
            return 'serial'
        elif 'multimedia' in name_lower or 'audio' in name_lower or 'video' in name_lower:
            return 'multimedia'
        else:
            return 'default'
    
    def get_metadata_schema(self):
        """Get available metadata fields for different collection types"""
        return {
            'archive': [
                'title', 'archivalType', 'year', 'provenance', 'quantity', 
                'security', 'medium', 'arrangement', 'processing', 'description'
            ],
            'printed': [
                'title', 'authors', 'publisher', 'year', 'isbn', 'extent', 
                'language', 'subjects', 'description'
            ],
            'serial': [
                'title', 'publisher', 'year', 'issn', 'series', 'language', 
                'subjects', 'description'
            ],
            'multimedia': [
                'title', 'authors', 'year', 'extent', 'medium', 'language', 
                'subjects', 'description'
            ],
            'default': [
                'title', 'authors', 'publisher', 'year', 'resource_type', 
                'language', 'subjects', 'description'
            ]
        }