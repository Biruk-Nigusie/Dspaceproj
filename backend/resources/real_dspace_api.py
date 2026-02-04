import requests
import json
import os
import sys

# Add dspace_uploader to path
from django.conf import settings
dspace_uploader_path = os.path.join(settings.BASE_DIR, "dspace_uploader")
if dspace_uploader_path not in sys.path:
    sys.path.insert(0, dspace_uploader_path)

from dspace_client import DSpaceClient

class RealDSpaceAPI:
    def __init__(self):
        from config import API_BASE
        self.client = DSpaceClient()
        self.base_url = API_BASE
    
    def authenticate(self):
        """Authenticate with real DSpace"""
        try:
            # Always try to login to ensure we're authenticated
            from config import DSPACE_EMAIL, DSPACE_PASSWORD, DSPACE_URL
            # Print which DSpace URL and user will be used (do not print passwords)
            print(f"🔐 Attempting to authenticate with DSpace at {DSPACE_URL} as {DSPACE_EMAIL}")
            if self.client.login(DSPACE_EMAIL, DSPACE_PASSWORD):
                print("✅ Successfully authenticated with DSpace")
                return True
            else:
                print("❌ DSpace authentication failed")
                return False
        except Exception as e:
            print(f"DSpace authentication error: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def get_collections(self):
        """Get all DSpace collections"""
        try:
            response = self.client.session.get(f"{self.base_url}/core/collections")
            if response.status_code == 200:
                data = response.json()
                collections = data.get('_embedded', {}).get('collections', [])
                print(f"✅ Found {len(collections)} DSpace collections")
                return collections
            else:
                print(f"❌ Failed to get DSpace collections: {response.status_code}")
                return None
        except Exception as e:
            print(f"DSpace collections error: {e}")
            return None
    
    def create_workspace_item(self, collection_uuid):
        """Create workspace item using real client"""
        try:
            workspace_id = self.client.create_workspace_item(collection_uuid)
            if workspace_id:
                # Return a dict similar to what the mock version returned
                workspace_item = {
                    'id': workspace_id,
                    'uuid': workspace_id,  # Using ID as UUID for now
                    '_embedded': {
                        'item': {
                            'uuid': workspace_id
                        }
                    }
                }
                print(f"✅ DSpace workspace item created: {workspace_id}")
                return workspace_item
            else:
                # If creation failed, check if DSpace returned a 403 and try admin fallback
                last_err = getattr(self.client, 'last_error_message', None)
                print(f"❌ Failed to create DSpace workspace item: {last_err}")

                try:
                    from config import DSPACE_ADMIN_EMAIL, DSPACE_ADMIN_PASSWORD
                    if DSPACE_ADMIN_EMAIL and DSPACE_ADMIN_PASSWORD:
                        print("🔁 Attempting admin login to retry workspace creation")
                        if self.client.login(DSPACE_ADMIN_EMAIL, DSPACE_ADMIN_PASSWORD):
                            workspace_id2 = self.client.create_workspace_item(collection_uuid)
                            if workspace_id2:
                                workspace_item = {
                                    'id': workspace_id2,
                                    'uuid': workspace_id2,
                                    '_embedded': {
                                        'item': {
                                            'uuid': workspace_id2
                                        }
                                    }
                                }
                                print(f"✅ DSpace workspace item created with admin account: {workspace_id2}")
                                return workspace_item
                            else:
                                print("❌ Admin retry also failed to create workspace item")
                except Exception as e:
                    print(f"Admin retry error: {e}")

                return None
        except Exception as e:
            print(f"DSpace workspace item error: {e}")
            return None
    
    def upload_file_to_workspace(self, workspace_id, file_data, filename):
        """Upload file to workspace using real client"""
        try:
            import tempfile
            import os
            
            # Create a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{filename}") as temp_file:
                temp_file.write(file_data)
                temp_file_path = temp_file.name
            
            try:
                # Upload using the client
                success = self.client.upload_file_to_workspace(workspace_id, temp_file_path)
                if success:
                    # Return a mock bitstream dict for compatibility
                    import uuid
                    bitstream = {
                        'uuid': str(uuid.uuid4()),
                        'name': filename,
                        'sizeBytes': len(file_data)
                    }
                    print(f"✅ File uploaded to DSpace: {filename} ({len(file_data)} bytes)")
                    return bitstream
                else:
                    print("❌ Failed to upload file to DSpace")
                    return None
            finally:
                # Clean up temp file
                os.unlink(temp_file_path)
        except Exception as e:
            print(f"DSpace file upload error: {e}")
            return None
    
    def search_items(self, query, limit=20):
        """Search DSpace items using discover API - only approved/archived items"""
        try:
            # Use the discover search API which only returns indexed/archived items
            params = {
                'query': query if query else '*',  # Use wildcard for empty query
                'page': 0,
                'size': limit,
                'sort': 'score,DESC',  # Sort by relevance
                'dsoType': 'item'  # Only return items, not collections/communities
            }

            response = self.client.session.get(
                f"{self.base_url}/discover/search/objects",
                params=params,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                search_results = data.get('_embedded', {}).get('searchResult', {}).get('_embedded', {}).get('objects', [])

                # The discover API should only return archived/indexed items by default
                # But let's double-check by filtering for items that have handles
                archived_items = []
                for item in search_results:
                    indexable_obj = item.get('_embedded', {}).get('indexableObject', {})
                    # Only include items that are actually archived (have handles)
                    if (indexable_obj.get('type') == 'item' and
                        indexable_obj.get('handle') and
                        not indexable_obj.get('inArchive') is False):  # inArchive should be true or missing
                        archived_items.append(item)
                        if len(archived_items) >= limit:
                            break

                print(f"✅ DSpace search found {len(archived_items)} approved/archived items for '{query}' (from {len(search_results)} total results)")
                return archived_items
            else:
                print(f"⚠️ DSpace search returned status {response.status_code}")
                return []

        except Exception as e:
            print(f"DSpace search error: {e}")
            return []
    
    def update_metadata(self, workspace_id, metadata):
        """Update metadata using real client - only basic required fields"""
        try:
            # Group values per field into a single 'add' op per field
            # DSpace expects the field path to contain an array of metadata value objects
            # e.g. {"op":"add","path":"/sections/traditionalpageone/dc.title","value":[{"value":"Title"}]}
            metadata_patch = []

            for field, values in (metadata or {}).items():
                cleaned_vals = []
                if not values:
                    continue
                if isinstance(values, list):
                    for v in values:
                        if isinstance(v, dict):
                            val = v.get('value')
                        else:
                            val = v
                        if val is not None:
                            s = str(val).strip()
                            if s:
                                cleaned_vals.append({"value": s})
                else:
                    s = str(values).strip()
                    if s:
                        cleaned_vals.append({"value": s})

                if cleaned_vals:
                    metadata_patch.append({
                        "op": "add",
                        "path": f"/sections/traditionalpageone/{field}",
                        "value": cleaned_vals
                    })

            # Ensure at least type and date are present
            import datetime
            current_year = str(datetime.datetime.now().year)

            field_names = [p['path'].split('/')[-1] for p in metadata_patch]

            if 'dc.type' not in field_names:
                metadata_patch.append({
                    "op": "add",
                    "path": "/sections/traditionalpageone/dc.type",
                    "value": [{"value": "Text"}]
                })

            if 'dc.date.issued' not in field_names:
                metadata_patch.append({
                    "op": "add",
                    "path": "/sections/traditionalpageone/dc.date.issued",
                    "value": [{"value": current_year}]
                })

            print(f"📝 Attempting to update metadata with {len(metadata_patch)} patches")
            for patch in metadata_patch:
                print(f"  - {patch['path']}: {patch['value']}")

            success_count = 0
            for op in metadata_patch:
                try:
                    ok = self.client.add_workspace_metadata(workspace_id, [op])
                    if ok:
                        success_count += 1
                    else:
                        print(f"⚠️ Patch failed for {op['path']}: check DSpace response")
                except Exception as e:
                    print(f"✗ Exception while applying patch {op['path']}: {e}")

            print(f"📝 Metadata patches applied: {success_count}/{len(metadata_patch)}")
            if success_count > 0:
                return True
            print("❌ No metadata patches succeeded")
            return False
        except Exception as e:
            print(f"DSpace metadata update error: {e}")
            import traceback
            traceback.print_exc()
            return False

    def update_item_metadata(self, item_uuid, metadata_patches):
        """
        Update metadata for an archived item using JSON PATCH.
        metadata_patches: list of patch operations, e.g. 
        [{"op": "add", "path": "/metadata/local.koha.id/0", "value": {"value": "123"}}]
        """
        try:
            if not self.client.logged_in:
                if not self.authenticate():
                    return False

            url = f"{self.base_url}/core/items/{item_uuid}"
            headers = self.client._get_csrf_headers({
                "Content-Type": "application/json-patch+json",
                "Accept": "application/json"
            })
            
            # DSpace 7 expects a very specific format for metadata updates via PATCH.
            # Often it's easier to use the /metadata endpoint with POST (replace metadata)
            # or DELETE then POST. But let's try PATCH first.
            
            response = self.client.session.patch(url, headers=headers, json=metadata_patches)
            
            if response.status_code in (200, 204):
                print(f"✅ Metadata updated for item {item_uuid}")
                return True
            else:
                print(f"❌ Failed to update item metadata: {response.status_code} - {response.text}")
                # Fallback: Try POST to /metadata endpoint if PATCH is not supported/configured
                return self._update_item_metadata_post(item_uuid, metadata_patches)
        except Exception as e:
            print(f"DSpace item metadata update error: {e}")
            return False

    def _update_item_metadata_post(self, item_uuid, metadata_patches):
        """Fallback: Update metadata using POST to /metadata endpoint"""
        try:
            # Convert patches to metadata format
            # This is complex because we need the full metadata state to replace it,
            # or use the selective field endpoints if available.
            # For now, let's just log and return false as PATCH is the standard.
            print(f"⚠️ Falling back to POST metadata update is not fully implemented for {item_uuid}")
            return False
        except Exception:
            return False
    
    def submit_workspace_item(self, workspace_id):
        """Submit workspace item using real client"""
        try:
            # First accept the license
            license_accepted = self.client.accept_workspace_license(workspace_id)
            if not license_accepted:
                print("❌ Failed to accept DSpace license")
                return None
            
            # Debug: fetch current workspace state to inspect metadata/bitstreams/license
            try:
                ws_resp = self.client.session.get(f"{self.base_url}/submission/workspaceitems/{workspace_id}")
                if ws_resp.status_code == 200:
                    try:
                        ws_json = ws_resp.json()
                        print("🔎 Workspace state before submit:", json.dumps(ws_json, indent=2)[:1000])
                    except Exception:
                        print("🔎 Could not parse workspace JSON before submit")
                else:
                    print(f"🔎 Failed to fetch workspace before submit: {ws_resp.status_code} - {ws_resp.text}")
            except Exception as e:
                print(f"🔎 Error fetching workspace before submit: {e}")

            # Then submit to workflow
            submitted = self.client.submit_workspace_item(workspace_id)
            if submitted:
                # If client returned JSON, use it; otherwise construct a minimal dict
                if isinstance(submitted, dict):
                    print(f"✅ DSpace item submitted to workflow: {workspace_id}")
                    return submitted
                else:
                    import uuid
                    submitted_item = {
                        'id': str(uuid.uuid4()),
                        'uuid': workspace_id
                    }
                    print(f"✅ DSpace item submitted to workflow (no JSON body): {workspace_id}")
                    return submitted_item
            else:
                last_err = getattr(self.client, 'last_error_message', None)
                print(f"❌ Failed to submit DSpace item: {last_err}")
                return None
        except Exception as e:
            print(f"DSpace submission error: {e}")
            return None
    
    def get_item_bitstreams(self, item_uuid):
        """
        Get bitstreams for an item by first finding its 'ORIGINAL' bundle.
        Note: DSpace 7/8/9 may not support /core/items/{id}/bitstreams directly.
        """
        try:
            # Step 1: Get bundles for the item
            bundles_url = f"{self.base_url}/core/items/{item_uuid}/bundles"
            print(f"Fetching bundles for item: {bundles_url}")
            response = self.client.session.get(bundles_url)
            
            if response.status_code != 200:
                print(f"❌ Failed to get bundles: {response.status_code}")
                return []
            
            bundles_data = response.json()
            bundles = bundles_data.get('_embedded', {}).get('bundles', [])
            
            all_bitstreams = []
            
            # Step 2: Look for 'ORIGINAL' bundle and get its bitstreams
            for bundle in bundles:
                bundle_name = bundle.get('name')
                bitstreams_link = bundle.get('_links', {}).get('bitstreams', {}).get('href')
                
                if bitstreams_link:
                    print(f"Fetching bitstreams for bundle {bundle_name}: {bitstreams_link}")
                    bs_response = self.client.session.get(bitstreams_link)
                    if bs_response.status_code == 200:
                        bs_data = bs_response.json()
                        bundle_bitstreams = bs_data.get('_embedded', {}).get('bitstreams', [])
                        
                        # Add bundleName to each bitstream for convenience
                        for bs in bundle_bitstreams:
                            bs['bundleName'] = bundle_name
                            all_bitstreams.append(bs)
            
            print(f"✅ Found {len(all_bitstreams)} total bitstreams across all bundles")
            return all_bitstreams
            
        except Exception as e:
            print(f"DSpace bitstreams error: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def get_item_by_handle(self, handle):
        """Get item by handle using DSpace discovery API (most reliable)."""
        try:
            if not self.client.logged_in:
                if not self.authenticate():
                    return None

            # Use discovery search as it's the most robust way to find by handle across versions
            discovery_url = f"{self.base_url}/discover/search/objects"
            # Try both exact handle match and query
            params = {
                'query': f'handle:"{handle}"' if '/' in handle else handle,
                'dsoType': 'item',
                'size': 1
            }
            
            print(f"Resolving handle via discovery: {discovery_url} with {params}")
            response = self.client.session.get(discovery_url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                search_result = data.get('_embedded', {}).get('searchResult', {})
                objects = search_result.get('_embedded', {}).get('objects', [])
                
                if objects:
                    # DSpace Discovery returns the item inside an 'indexableObject'
                    item = objects[0].get('_embedded', {}).get('indexableObject', {})
                    if item:
                        print(f"✅ Found item by handle {handle}: {item.get('uuid')}")
                        return item
            
            print(f"❌ Item not found by handle {handle} (status: {response.status_code})")
            return None
            
        except Exception as e:
            print(f"DSpace get item by handle error: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_bitstream_by_uuid(self, bitstream_uuid):
        """Get a single bitstream by its UUID"""
        try:
            response = self.client.session.get(
                f"{self.base_url}/core/bitstreams/{bitstream_uuid}"
            )
            if response.status_code == 200:
                bitstream = response.json()
                print(f"✅ Found bitstream: {bitstream.get('name')} ({bitstream.get('uuid')})")
                return bitstream
            else:
                print(f"❌ Bitstream not found for UUID {bitstream_uuid}: {response.status_code}")
                return None
        except Exception as e:
            print(f"DSpace get bitstream by UUID error: {e}")
            return None

    def get_item_count(self, uuid):
        """Get item count for a given community or collection UUID"""
        try:
            params = {
                'scope': uuid,
                'dsoType': 'item',
                'size': 0
            }
            response = self.client.session.get(f"{self.base_url}/discover/search/objects", params=params)
            if response.status_code == 200:
                data = response.json()
                return data.get('_embedded', {}).get('searchResult', {}).get('page', {}).get('totalElements', 0)
            return 0
        except Exception:
            return 0

    def get_hierarchy(self):
        """Fetch the full DSpace community/sub-community/collection hierarchy with counts"""
        try:
            if not self.client.logged_in:
                self.authenticate()

            # 1. Get top-level communities
            response = self.client.session.get(f"{self.base_url}/core/communities/search/top")
            if response.status_code != 200:
                return []
            
            top_communities = response.json().get('_embedded', {}).get('communities', [])
            hierarchy = []

            for comm in top_communities:
                comm_node = self._build_community_node(comm)
                hierarchy.append(comm_node)
            
            return hierarchy
        except Exception as e:
            print(f"Error fetching hierarchy: {e}")
            return []

    def _build_community_node(self, community):
        uuid = community.get('uuid')
        name = community.get('metadata', {}).get('dc.title', [{}])[0].get('value', 'Unnamed Community')
        
        # Get count
        count = self.get_item_count(uuid)
        
        node = {
            'id': uuid,
            'name': name,
            'type': 'community',
            'count': count,
            'children': []
        }

        # Sub-communities
        try:
            sub_resp = self.client.session.get(f"{self.base_url}/core/communities/{uuid}/subcommunities")
            if sub_resp.status_code == 200:
                subs = sub_resp.json().get('_embedded', {}).get('subcommunities', [])
                for sub in subs:
                    node['children'].append(self._build_community_node(sub))
        except Exception:
            pass

        # Collections
        try:
            coll_resp = self.client.session.get(f"{self.base_url}/core/communities/{uuid}/collections")
            if coll_resp.status_code == 200:
                colls = coll_resp.json().get('_embedded', {}).get('collections', [])
                for coll in colls:
                    coll_uuid = coll.get('uuid')
                    coll_name = coll.get('metadata', {}).get('dc.title', [{}])[0].get('value', 'Unnamed Collection')
                    coll_count = self.get_item_count(coll_uuid)
                    node['children'].append({
                        'id': coll_uuid,
                        'name': coll_name,
                        'type': 'collection',
                        'count': coll_count,
                        'children': []
                    })
        except Exception:
            pass

        return node
