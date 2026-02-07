import requests
from .config import DSPACE_API_BASE as DSPACE_API_BASE_URL

class DSpaceHierarchyManager:
    def __init__(self):
        self.base_url = DSPACE_API_BASE_URL
        self.headers = {"Content-Type": "application/json", "Accept": "application/json"}

    def get_hierarchy(self):
        try:
            url = f"{self.base_url}/core/communities/search/top"
            response = requests.get(url, headers=self.headers)
            if response.status_code == 200:
                top = response.json().get('_embedded', {}).get('communities', [])
                return [self._build_node(c) for c in top]
            return []
        except Exception: return []

    def get_count(self, uuid):
        try:
            url = f"{self.base_url}/discover/search/objects"
            params = {'scope': uuid, 'dsoType': 'item', 'size': 0}
            res = requests.get(url, params=params, headers=self.headers)
            if res.status_code == 200:
                data = res.json()
                # totalElements is inside _embedded.searchResult.page
                return data.get('_embedded', {}).get('searchResult', {}).get('page', {}).get('totalElements', 0)
        except: pass
        return 0

    def _build_node(self, community):
        uuid = community.get('uuid')
        count = community.get('archivedItemsCount', -1)
        if count < 0:
            count = self.get_count(uuid)
            
        node = {
            'id': uuid,
            'uuid': uuid, 
            'name': community.get('name'), 
            'type': 'community', 
            'count': count,
            'children': []
        }
        try:
            # Sub-communities
            subs_url = community.get('_links', {}).get('subcommunities', {}).get('href')
            if not subs_url:
                subs_url = f"{self.base_url}/core/communities/{uuid}/subcommunities"
            
            subs_res = requests.get(subs_url, headers=self.headers)
            if subs_res.status_code == 200:
                subs = subs_res.json().get('_embedded', {}).get('subcommunities', [])
                node['children'].extend([self._build_node(s) for s in subs])
            
            # Collections
            colls_url = community.get('_links', {}).get('collections', {}).get('href')
            if not colls_url:
                colls_url = f"{self.base_url}/core/communities/{uuid}/collections"
                
            colls_res = requests.get(colls_url, headers=self.headers)
            if colls_res.status_code == 200:
                colls = colls_res.json().get('_embedded', {}).get('collections', [])
                for c in colls:
                    c_uuid = c.get('uuid')
                    c_count = c.get('archivedItemsCount', -1)
                    if c_count < 0:
                        c_count = self.get_count(c_uuid)
                        
                    node['children'].append({
                        'id': c_uuid,
                        'uuid': c_uuid,
                        'name': c.get('name'), 
                        'type': 'collection',
                        'count': c_count
                    })
        except Exception: pass
        return node