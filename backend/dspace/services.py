from .api import DSpaceAPI
from koha.api import KohaRestAPI
from .config import KOHA_API_URL, DSPACE_URL

class KohaService:
    @staticmethod
    def search_resources(query, limit=20):
        koha_api = KohaRestAPI()
        if koha_api.authenticate():
            all_biblios = koha_api.search_biblios('', 50)
            if not query: return all_biblios[:limit]
            
            filtered = []
            for biblio in all_biblios:
                text = f"{biblio.get('title', '')} {biblio.get('author', '')} {biblio.get('notes', '')}".lower()
                if query.lower() in text:
                    filtered.append(biblio)
                if len(filtered) >= limit: break
            return filtered
        return []

class DSpaceService:
    @staticmethod
    def search_resources(query, limit=20):
        dspace_api = DSpaceAPI()
        if dspace_api.authenticate():
            return dspace_api.search_items(query, limit)
        return []

class ResourceService:
    @staticmethod
    def unified_search(query, filters=None, limit=20):
        results = []
        
        # Search Koha
        try:
            koha_results = KohaService.search_resources(query, limit//2)
            for item in koha_results:
                results.append({
                    'id': f"koha_{item.get('biblio_id', '')}",
                    'title': item.get('title', 'No Title'),
                    'authors': item.get('author', ''),
                    'source': 'koha',
                    'source_name': 'Library Catalog',
                    'external_id': str(item.get('biblio_id', '')),
                    'resource_type': 'book',
                    'year': item.get('copyright_date', ''),
                    'description': item.get('abstract', ''),
                    'url': f"{KOHA_API_URL.rstrip('/')}/cgi-bin/koha/catalogue/detail.pl?biblionumber={item.get('biblio_id', '')}",
                    'availability': 'Available'
                })
        except Exception: pass
        
        # Search DSpace
        try:
            dspace_results = DSpaceService.search_resources(query, limit//2)
            for item in dspace_results:
                obj = item.get('_embedded', {}).get('indexableObject', {})
                metadata = obj.get('metadata', {})
                
                authors = []
                for field in ['dc.contributor.author', 'dc.creator']:
                    if field in metadata:
                        authors.extend([m.get('value', '') for m in metadata[field]])
                
                year = ''
                for field in ['dc.date.issued', 'dc.date.created']:
                    if field in metadata and metadata[field]:
                        val = metadata[field][0].get('value', '')
                        if val: year = val[:4]
                        break
                
                handle = obj.get('handle', '')
                uuid = obj.get('uuid', '')
                
                results.append({
                    'id': f"dspace_{uuid}",
                    'title': obj.get('name', ''),
                    'authors': ', '.join(authors),
                    'source': 'dspace',
                    'source_name': 'Research Repository',
                    'external_id': handle or uuid,
                    'resource_type': obj.get('type', 'document'),
                    'year': year,
                    'url': f"{DSPACE_URL.rstrip('/')}/handle/{handle}" if handle else f"{DSPACE_URL.rstrip('/')}/items/{uuid}",
                    'availability': 'Open Access'
                })
        except Exception: pass
        
        if filters:
            if filters.get('source'):
                results = [r for r in results if r['source'] == filters['source']]
            if filters.get('type'):
                results = [r for r in results if r['resource_type'] == filters['type']]
            if filters.get('year'):
                results = [r for r in results if str(r.get('year', '')) == str(filters['year'])]
        
        return results[:limit]
    
    @staticmethod
    def upload_to_dspace(file, metadata, collection_uuid):
        dspace_api = DSpaceAPI()
        if not dspace_api.authenticate(): raise Exception("DSpace auth failed")
        
        dc_metadata = {"dc.title": [{"value": metadata['title']}]}
        if metadata.get('resource_type'): dc_metadata["dc.type"] = [{"value": metadata['resource_type']}]
        if metadata.get('authors'):
            authors = [a.strip() for a in metadata['authors'].split(',') if a.strip()]
            dc_metadata["dc.contributor.author"] = [{"value": a} for a in authors]
        if metadata.get('date_year'): dc_metadata["dc.date.issued"] = [{"value": str(metadata['date_year'])}]
        
        workspace_item = dspace_api.create_workspace_item(collection_uuid)
        if not workspace_item: raise Exception("Failed to create workspace item")
        
        workspace_id = workspace_item['id']
        dspace_api.update_metadata(workspace_id, dc_metadata)
        
        file.seek(0)
        bitstream = dspace_api.upload_file_to_workspace(workspace_id, file.read(), file.name)
        if not bitstream: raise Exception("File upload failed")
        
        submitted_item = dspace_api.submit_workspace_item(workspace_id)
        if not submitted_item: raise Exception("Submission failed")
        
        item_uuid = str(submitted_item.get('uuid', workspace_id))
        return {
            'uuid': item_uuid,
            'handle': f"123456789/{item_uuid[:8]}",
            'handle_url': f"{DSPACE_URL.rstrip('/')}/handle/123456789/{item_uuid[:8]}",
            'download_url': f"{DSPACE_URL.rstrip('/')}/server/api/core/bitstreams/{bitstream.get('uuid', '')}/content"
        }
    
    @staticmethod
    def catalog_in_koha(metadata, dspace_url):
        koha_rest_api = KohaRestAPI()
        if not koha_rest_api.authenticate(): raise Exception("Koha auth failed")
        
        koha_metadata = {
            'title': metadata['title'],
            'authors': metadata.get('authors', ''),
            'description': metadata.get('abstract') or metadata.get('description', ''),
            'year': metadata.get('year') or metadata.get('date_year', ''),
            'dspace_url': dspace_url
        }
        
        biblio = koha_rest_api.create_biblio(koha_metadata)
        if not biblio: raise Exception("Koha cataloging failed")
        
        biblio_id = biblio.get('id')
        return {
            'biblio_id': biblio_id,
            'opac_url': f"{KOHA_API_URL.rstrip('/')}/cgi-bin/koha/catalogue/detail.pl?biblionumber={biblio_id}"
        }
