import requests
import json
import os
from .config import DSPACE_URL, DSPACE_EMAIL, DSPACE_PASSWORD, DSPACE_API_BASE
from .client import DSpaceClient

class DSpaceAPI:
    def __init__(self):
        self.client = DSpaceClient()
        self.base_url = DSPACE_API_BASE
    
    def authenticate(self):
        try:
            if self.client.login(DSPACE_EMAIL, DSPACE_PASSWORD):
                return True
            return False
        except Exception: return False
    
    def get_collections(self):
        try:
            response = self.client.session.get(f"{self.base_url}/core/collections")
            if response.status_code == 200:
                return response.json().get('_embedded', {}).get('collections', [])
            return None
        except Exception: return None
    
    def create_workspace_item(self, collection_uuid):
        try:
            workspace_id = self.client.create_workspace_item(collection_uuid)
            if workspace_id:
                return {'id': workspace_id, 'uuid': workspace_id}
            return None
        except Exception: return None
    
    def upload_file_to_workspace(self, workspace_id, file_data, filename):
        try:
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{filename}") as tmp:
                tmp.write(file_data)
                path = tmp.name
            try:
                if self.client.upload_file_to_workspace(workspace_id, path):
                    import uuid
                    return {'uuid': str(uuid.uuid4()), 'name': filename}
                return None
            finally: os.unlink(path)
        except Exception: return None
    
    def search_items(self, query, limit=20):
        try:
            params = {'query': query or '*', 'size': limit, 'dsoType': 'item'}
            response = self.client.session.get(f"{self.base_url}/discover/search/objects", params=params)
            if response.status_code == 200:
                return response.json().get('_embedded', {}).get('searchResult', {}).get('_embedded', {}).get('objects', [])
            return []
        except Exception: return []
    
    def update_metadata(self, workspace_id, metadata):
        try:
            patches = []
            for field, values in metadata.items():
                patches.append({"op": "add", "path": f"/sections/traditionalpageone/{field}", "value": values})
            return self.client.add_workspace_metadata(workspace_id, patches)
        except Exception: return False

    def update_item_metadata(self, item_uuid, patches):
        try:
            url = f"{self.base_url}/core/items/{item_uuid}"
            headers = self.client._get_csrf_headers({"Content-Type": "application/json-patch+json"})
            response = self.client.session.patch(url, headers=headers, json=patches)
            return response.status_code in (200, 204)
        except Exception: return False
    
    def submit_workspace_item(self, workspace_id):
        try:
            if not self.client.accept_workspace_license(workspace_id): return None
            submitted = self.client.submit_workspace_item(workspace_id)
            if submitted: return submitted if isinstance(submitted, dict) else {'uuid': workspace_id}
            return None
        except Exception: return None
    
    def get_item_bitstreams(self, item_uuid):
        try:
            response = self.client.session.get(f"{self.base_url}/core/items/{item_uuid}/bundles")
            if response.status_code != 200: return []
            bundles = response.json().get('_embedded', {}).get('bundles', [])
            all_bs = []
            for bundle in bundles:
                link = bundle.get('_links', {}).get('bitstreams', {}).get('href')
                if link:
                    bs_resp = self.client.session.get(link)
                    if bs_resp.status_code == 200:
                        all_bs.extend(bs_resp.json().get('_embedded', {}).get('bitstreams', []))
            return all_bs
        except Exception: return []
    
    def get_item_by_handle(self, handle):
        try:
            params = {'query': f'handle:"{handle}"' if '/' in handle else handle, 'dsoType': 'item', 'size': 1}
            response = self.client.session.get(f"{self.base_url}/discover/search/objects", params=params)
            if response.status_code == 200:
                objs = response.json().get('_embedded', {}).get('searchResult', {}).get('_embedded', {}).get('objects', [])
                if objs: return objs[0].get('_embedded', {}).get('indexableObject', {})
            return None
        except Exception: return None

    def get_hierarchy(self):
        try:
            response = self.client.session.get(f"{self.base_url}/core/communities/search/top")
            if response.status_code != 200: return []
            top = response.json().get('_embedded', {}).get('communities', [])
            return [self._build_node(c) for c in top]
        except Exception: return []

    def _build_node(self, community):
        uuid = community.get('uuid')
        name = community.get('metadata', {}).get('dc.title', [{}])[0].get('value', 'Unnamed')
        node = {'id': uuid, 'name': name, 'type': 'community', 'children': []}
        try:
            sub = self.client.session.get(f"{self.base_url}/core/communities/{uuid}/subcommunities")
            if sub.status_code == 200:
                node['children'].extend([self._build_node(s) for s in sub.json().get('_embedded', {}).get('subcommunities', [])])
            coll = self.client.session.get(f"{self.base_url}/core/communities/{uuid}/collections")
            if coll.status_code == 200:
                for c in coll.json().get('_embedded', {}).get('collections', []):
                    node['children'].append({'id': c.get('uuid'), 'name': c.get('name'), 'type': 'collection'})
        except Exception: pass
        return node
