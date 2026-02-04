from .koha_catalog_api import KohaCatalogAPI
from .dspace_catalog_api import DSpaceCatalogAPI
import json

class UnifiedCatalogService:
    def __init__(self):
        self.koha_api = KohaCatalogAPI()
        self.dspace_api = DSpaceCatalogAPI()
    
    def get_all_cataloged_items(self, limit=100, source_filter=None):
        """Get all cataloged items from both Koha and DSpace"""
        all_items = []
        
        # Get items from DSpace
        if not source_filter or source_filter == 'dspace':
            try:
                dspace_items = self.dspace_api.get_items_from_all_collections(limit//2)
                all_items.extend(dspace_items)
                print(f"✅ Fetched {len(dspace_items)} items from DSpace")
            except Exception as e:
                print(f"❌ DSpace fetch error: {e}")
        
        # Get items from Koha
        if not source_filter or source_filter == 'koha':
            try:
                koha_items = self.koha_api.get_all_items(limit//2)
                all_items.extend(koha_items)
                print(f"✅ Fetched {len(koha_items)} items from Koha")
            except Exception as e:
                print(f"❌ Koha fetch error: {e}")
        
        return all_items
    
    def search_unified_catalog(self, query="", filters=None, limit=50):
        """Search across both catalogs with unified results"""
        all_results = []
        
        # Parse filters
        source_filter = filters.get('source') if filters else None
        collection_filter = filters.get('collection') if filters else None
        type_filter = filters.get('type') if filters else None
        
        # Search DSpace
        if not source_filter or source_filter == 'dspace':
            try:
                collections = None
                if collection_filter:
                    collections = [collection_filter] if isinstance(collection_filter, str) else collection_filter
                
                dspace_results = self.dspace_api.search_items(query, collections, limit//2)
                
                # Apply type filter to DSpace results
                if type_filter:
                    dspace_results = [item for item in dspace_results 
                                    if item.get('collection_type') == type_filter or 
                                       item.get('resource_type', '').lower() == type_filter.lower()]
                
                all_results.extend(dspace_results)
                print(f"✅ DSpace search returned {len(dspace_results)} items")
            except Exception as e:
                print(f"❌ DSpace search error: {e}")
        
        # Search Koha
        if not source_filter or source_filter == 'koha':
            try:
                koha_filters = {}
                if type_filter:
                    koha_filters['type'] = type_filter
                
                koha_results = self.koha_api.search_catalog(query, limit//2, koha_filters)
                all_results.extend(koha_results)
                print(f"✅ Koha search returned {len(koha_results)} items")
            except Exception as e:
                print(f"❌ Koha search error: {e}")
        
        return all_results
    
    def get_items_by_collection_type(self, collection_type, limit=50):
        """Get items filtered by collection type"""
        items = []
        
        # Get DSpace items of specific type
        try:
            all_dspace_items = self.dspace_api.get_items_from_all_collections(limit)
            filtered_items = [item for item in all_dspace_items 
                            if item.get('collection_type') == collection_type]
            items.extend(filtered_items)
        except Exception as e:
            print(f"❌ DSpace collection type filter error: {e}")
        
        # Get Koha items (if applicable)
        if collection_type in ['printed', 'serial', 'multimedia']:
            try:
                koha_items = self.koha_api.search_catalog("", limit//2, {'type': collection_type})
                items.extend(koha_items)
            except Exception as e:
                print(f"❌ Koha collection type filter error: {e}")
        
        return items
    
    def get_available_collections(self):
        """Get all available collections from both systems"""
        collections = {
            'dspace': [],
            'koha': [],
            'types': []
        }
        
        # Get DSpace collections
        try:
            dspace_collections = self.dspace_api.get_all_collections()
            collections['dspace'] = dspace_collections
            
            # Extract unique types
            types_set = set()
            for col in dspace_collections:
                if col.get('type'):
                    types_set.add(col['type'])
            collections['types'] = list(types_set)
            
        except Exception as e:
            print(f"❌ DSpace collections error: {e}")
        
        # Get Koha collections metadata
        try:
            koha_metadata = self.koha_api.get_collections_metadata()
            collections['koha'] = koha_metadata.get('item_types', [])
            
            # Add Koha types to the types list
            for item_type in koha_metadata.get('item_types', []):
                type_name = item_type.get('name', '').lower()
                if 'book' in type_name:
                    collections['types'].append('printed')
                elif 'serial' in type_name:
                    collections['types'].append('serial')
                elif 'multimedia' in type_name:
                    collections['types'].append('multimedia')
                elif 'archive' in type_name:
                    collections['types'].append('archive')
            
            collections['types'] = list(set(collections['types']))  # Remove duplicates
            
        except Exception as e:
            print(f"❌ Koha collections error: {e}")
        
        return collections
    
    def get_metadata_schema_for_type(self, collection_type):
        """Get metadata schema for a specific collection type"""
        try:
            dspace_schema = self.dspace_api.get_metadata_schema()
            return dspace_schema.get(collection_type, dspace_schema.get('default', []))
        except Exception as e:
            print(f"❌ Schema error: {e}")
            return ['title', 'authors', 'year', 'description']
    
    def get_item_detail(self, item_id, source):
        """Get detailed information about a specific item"""
        try:
            if source == 'koha':
                # Extract biblio ID from item_id
                biblio_id = item_id.replace('koha_', '')
                return self.koha_api.get_item_details(biblio_id)
            elif source == 'dspace':
                # For DSpace, we already have comprehensive metadata
                # This could be enhanced to fetch additional details if needed
                return {'message': 'DSpace details already included in search results'}
            
        except Exception as e:
            print(f"❌ Item detail error: {e}")
            return None
    
    def get_loan_url(self, item):
        """Generate appropriate loan/borrow URL for an item"""
        if item.get('source') == 'koha':
            # Direct link to Koha OPAC detail page
            biblio_id = item.get('koha_id') or item.get('external_id')
            return f"http://127.0.0.1:8085/cgi-bin/koha/opac-detail.pl?biblionumber={biblio_id}"
        elif item.get('source') == 'dspace':
            # If item is cataloged in Koha, use Koha URL
            if item.get('is_cataloged') and item.get('koha_id'):
                return f"http://127.0.0.1:8085/cgi-bin/koha/opac-detail.pl?biblionumber={item.get('koha_id')}"
            else:
                # Otherwise, use DSpace handle URL
                return f"http://localhost:4000/handle/{item.get('external_id')}"
        
        return item.get('url', '')
    
    def apply_filters(self, items, filters):
        """Apply filters to a list of items"""
        if not filters:
            return items
        
        filtered_items = items
        
        # Apply year filter
        if filters.get('year'):
            year_filter = str(filters['year'])
            filtered_items = [item for item in filtered_items 
                            if str(item.get('year', '')).startswith(year_filter)]
        
        # Apply type filter
        if filters.get('type'):
            type_filter = filters['type'].lower()
            filtered_items = [item for item in filtered_items 
                            if (item.get('collection_type', '').lower() == type_filter or
                                item.get('resource_type', '').lower() == type_filter)]
        
        # Apply author filter
        if filters.get('author'):
            author_filter = filters['author'].lower()
            filtered_items = [item for item in filtered_items 
                            if author_filter in item.get('authors', '').lower()]
        
        # Apply publisher filter
        if filters.get('publisher'):
            publisher_filter = filters['publisher'].lower()
            filtered_items = [item for item in filtered_items 
                            if publisher_filter in item.get('publisher', '').lower()]
        
        return filtered_items