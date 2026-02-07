import requests
from .config import validate_config, DSPACE_LOGIN_URL as LOGIN_URL, DSPACE_API_BASE as API_BASE
import mimetypes
import os

class DSpaceClient:
    def __init__(self):
        validate_config()
        self.session = requests.Session()
        self.base_url = API_BASE
        self.logged_in = False
        self.csrf_token = None
        self.auth_token = None
        
    def get_csrf_token(self):
        """Get CSRF token from DSpace using the dedicated endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/security/csrf")
            # Accept 200 or 204 (DSpace returns 204 with token header)
            if response.status_code not in (200, 204):
                print(f"✗ Failed to get CSRF token: {response.status_code}")
                return False

            # 1) header named DSPACE-XSRF-TOKEN
            if 'DSPACE-XSRF-TOKEN' in response.headers:
                self.csrf_token = response.headers['DSPACE-XSRF-TOKEN']
                print(f"✓ CSRF token obtained from header: {self.csrf_token}")
                return True

            # 2) header named XSRF-TOKEN or X-XSRF-TOKEN
            for h in ('XSRF-TOKEN', 'X-XSRF-TOKEN'):
                if h in response.headers:
                    self.csrf_token = response.headers[h]
                    print(f"✓ CSRF token obtained from header {h}: {self.csrf_token}")
                    return True

            # 3) cookie named DSPACE-XSRF-COOKIE, XSRF-TOKEN or DSPACE-XSRF-TOKEN
            for cname in ('DSPACE-XSRF-COOKIE', 'DSPACE-XSRF-TOKEN', 'XSRF-TOKEN'):
                cookie_val = response.cookies.get(cname)
                if cookie_val:
                    self.csrf_token = cookie_val
                    print(f"✓ CSRF token obtained from cookie {cname}: {self.csrf_token}")
                    return True

            # 4) sometimes token is returned in body (rare) -> try to parse JSON
            try:
                body = response.json()
                for key in ('token', 'csrfToken', 'xsrfToken'):
                    if key in body:
                        self.csrf_token = body[key]
                        print(f"✓ CSRF token obtained from JSON body key {key}: {self.csrf_token}")
                        return True
            except Exception:
                pass

            print("✗ No CSRF token found in headers, cookies, or body")
            return False

        except Exception as e:
            print(f"✗ Error getting CSRF token: {e}")
            return False
        
    def login(self, email, password):
        """
        Authenticate with DSpace using email and password
        """
        # First get CSRF token
        if not self.get_csrf_token():
            print("✗ Failed to get CSRF token")
            return False
            
        login_data = {
            'user': email,
            'password': password
        }
        
        # DSpace REST API expects form data with CSRF token
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'X-XSRF-TOKEN': self.csrf_token,
            'DSPACE-XSRF-TOKEN': self.csrf_token
        }
        
        try:
            response = self.session.post(
                LOGIN_URL,
                data=login_data,
                headers=headers
            )

            # Debug helpers
            print("Login status:", response.status_code)
            print("Login response headers:", dict(response.headers))
            print("Session cookies after login:", {c.name: c.value for c in self.session.cookies})
            
            # store Authorization token if present and set for subsequent requests
            auth_hdr = response.headers.get("Authorization") or response.headers.get("authorization")
            if auth_hdr:
                self.auth_token = auth_hdr
                self.session.headers.update({"Authorization": auth_hdr})

            # IMPORTANT: update CSRF token from login response (DSpace returns a fresh token)
            new_token = (response.headers.get("DSPACE-XSRF-TOKEN")
                         or response.headers.get("XSRF-TOKEN")
                         or response.headers.get("X-XSRF-TOKEN"))
            if new_token:
                self.csrf_token = new_token
                print(f"✓ CSRF token updated from login response: {self.csrf_token}")
                
                # CRITICAL FIX: Update session headers with new CSRF token for ALL future requests
                self.session.headers.update({
                    'X-XSRF-TOKEN': self.csrf_token,
                    'DSPACE-XSRF-TOKEN': self.csrf_token
                })
            
            if response.status_code == 200:
                self.logged_in = True
                print("✓ Successfully logged into DSpace")
                return True
            else:
                print("✗ Login failed:", response.status_code, response.text)
                return False
                
        except requests.exceptions.ConnectionError:
            print("✗ Connection error during login")
            return False
        except Exception as e:
            print("✗ Error during login:", e)
            return False
    
    def test_connection(self):
        """
        Test if we can access the DSpace API
        """
        try:
            response = self.session.get(f"{self.base_url}/core/collections")
            return response.status_code == 200
        except:
            return False

    def _get_csrf_headers(self, additional_headers=None):
        """Helper to get CSRF headers for any request"""
        headers = {}
        if self.csrf_token:
            headers.update({
                'X-XSRF-TOKEN': self.csrf_token,
                'DSPACE-XSRF-TOKEN': self.csrf_token
            })
        if additional_headers:
            headers.update(additional_headers)
        return headers

    def create_workspace_item(self, collection_uuid, metadata=None):
        """
        Create a workspace item for submission workflow
        Returns workspace ID on success or None
        """
        url = f"{self.base_url}/submission/workspaceitems?owningCollection={collection_uuid}"
        
        headers = self._get_csrf_headers({
            "Accept": "application/json",
            "Content-Type": "application/json"
        })
        
        # Start with empty workspace, metadata will be added separately
        r = self.session.post(url, headers=headers)

        # Save last error for callers to inspect
        try:
            text = r.text
        except Exception:
            text = ''
        self.last_error_message = f"{r.status_code} - {text}"

        if r.status_code == 201:
            # Clear last error on success
            self.last_error_message = None
            ws_data = r.json()
            ws_id = ws_data.get('id')
            print(f"✓ Workspace created successfully: {ws_id}")
            return ws_id
        else:
            print(f"✗ Failed to create workspace: {r.status_code} - {r.text}")
            return None

    def add_workspace_metadata(self, workspace_id, metadata_patch):
        """
        Add metadata to workspace item using JSON Patch
        metadata_patch should be a list of patch operations
        Example: [{"op": "add", "path": "/sections/traditionalpageone/dc.title", "value": [{"value": "Title"}]}]
        """
        url = f"{self.base_url}/submission/workspaceitems/{workspace_id}"
        
        headers = self._get_csrf_headers({
            "Accept": "application/json",
            "Content-Type": "application/json-patch+json"
        })
        
        r = self.session.patch(url, headers=headers, json=metadata_patch)

        if r.status_code == 200:
            print(f"✓ Metadata added to workspace {workspace_id}")
            return True
        else:
            print(f"✗ Failed to add metadata: {r.status_code} - {r.text}")
            return False

    def upload_file_to_workspace(self, workspace_id, file_path):
        """
        Upload a file to workspace item using DSpace API
        """
        if not os.path.exists(file_path):
            print(f"✗ File not found: {file_path}")
            return False
            
        filename = os.path.basename(file_path)
        mime_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
        # Prefer the explicit sections upload endpoint when available
        upload_url_v2 = f"{self.base_url}/submission/workspaceitems/{workspace_id}/sections/upload"
        upload_headers = self._get_csrf_headers({
            "Accept": "application/json"
        })

        with open(file_path, "rb") as fh:
            files = {"file": (filename, fh, mime_type)}
            try:
                # include filename as form field (some DSpace builds expect 'name')
                r_upload = self.session.post(upload_url_v2, headers=upload_headers, files=files, data={"name": filename})
                # record last upload response
                try:
                    self.last_upload_response = r_upload.text
                except Exception:
                    self.last_upload_response = ''
                if r_upload.status_code in [200, 201]:
                    print(f"✓ File uploaded successfully to workspace (sections/upload) {workspace_id}")
                else:
                    print(f"⚠️ sections/upload endpoint returned {r_upload.status_code} - {r_upload.text}; falling back")
            except Exception as e:
                print(f"⚠️ sections/upload request error: {e}; falling back to legacy endpoint")

            # Fallback to legacy upload endpoint
            upload_url = f"{self.base_url}/submission/workspaceitems/{workspace_id}"
            try:
                fh.seek(0)
                r_upload2 = self.session.post(upload_url, headers=upload_headers, files=files, data={"name": filename})
                try:
                    self.last_upload_response = r_upload2.text
                except Exception:
                    self.last_upload_response = ''
                if r_upload2.status_code in [200, 201]:
                    print(f"✓ File uploaded successfully to workspace {workspace_id} (legacy endpoint)")
                else:
                    print(f"✗ File upload failed (legacy): {r_upload2.status_code} - {r_upload2.text}")
                    return False
            except Exception as e:
                print(f"✗ Error uploading file to workspace: {e}")
                return False

            # Verify that the workspace's upload section now has files
            try:
                check_resp = self.session.get(f"{self.base_url}/submission/workspaceitems/{workspace_id}")
                if check_resp.status_code == 200:
                    try:
                        ws_json = check_resp.json()
                        files_section = ws_json.get('sections', {}).get('upload', {}).get('files', [])
                        if files_section:
                            print(f"✓ Upload confirmed in workspace {workspace_id}: {len(files_section)} files")
                            return True
                        else:
                            print(f"✗ Upload not registered in workspace {workspace_id}: upload.files empty")
                            return False
                    except Exception as e:
                        print(f"✗ Could not parse workspace JSON to verify upload: {e}")
                        return False
                else:
                    print(f"✗ Failed to fetch workspace for verification: {check_resp.status_code} - {check_resp.text}")
                    return False
            except Exception as e:
                print(f"✗ Error verifying workspace upload: {e}")
                return False

    def accept_workspace_license(self, workspace_id):
        """
        Accept the submission license using the correct patch path
        """
        url = f"{self.base_url}/submission/workspaceitems/{workspace_id}"
        headers = self._get_csrf_headers({
            "Accept": "application/json",
            "Content-Type": "application/json-patch+json"
        })

        # Try both 'add' and 'replace' operations to handle different DSpace setups
        attempts = [
            [{"op": "add", "path": "/sections/license/granted", "value": True}],
            [{"op": "replace", "path": "/sections/license/granted", "value": True}]
        ]

        for attempt in attempts:
            try:
                r = self.session.patch(url, headers=headers, json=attempt)
                if r.status_code == 200:
                    print(f"✓ License accepted for workspace {workspace_id} (op={attempt[0]['op']})")
                    return True
                else:
                    print(f"⚠️ License attempt op={attempt[0]['op']} returned {r.status_code}: {r.text}")
            except Exception as e:
                print(f"⚠️ Error attempting license op={attempt[0]['op']}: {e}")

        # If both attempts failed, check workspace validity and continue only if workspace appears usable
        try:
            check_response = self.session.get(url, headers=headers)
            if check_response.status_code == 200:
                try:
                    ws = check_response.json()
                    granted = ws.get('sections', {}).get('license', {}).get('granted', False)
                    if granted:
                        print("✓ License already granted in workspace, proceeding")
                        return True
                    else:
                        print("✗ License not granted and both attempts failed")
                        return False
                except Exception:
                    print("⚠️ Could not parse workspace JSON when checking license")
                    return False
            else:
                print(f"✗ Failed to fetch workspace when checking license: {check_response.status_code}")
                return False
        except Exception as e:
            print(f"✗ Error checking workspace license state: {e}")
            return False

    def submit_workspace_item(self, workspace_id):
        """
        Submit workspace item to workflow
        """
        url = f"{self.base_url}/workflow/workflowitems"
        
        headers = self._get_csrf_headers({
            "Accept": "application/json",
            "Content-Type": "text/uri-list"
        })
        
        workspace_uri = f"{self.base_url}/submission/workspaceitems/{workspace_id}"
        r = self.session.post(url, headers=headers, data=workspace_uri)

        # Record detailed response for diagnostics
        try:
            resp_text = r.text
        except Exception:
            resp_text = ''
        self.last_error_message = f"{r.status_code} - {resp_text}"

        if r.status_code in [200, 201, 202]:
            print(f"✓ Workspace {workspace_id} submitted to workflow successfully")
            # Try to return JSON body if present for callers
            try:
                return r.json()
            except Exception:
                return {'status': r.status_code}
        else:
            print(f"✗ Failed to submit workspace: {r.status_code} - {r.text}")
            return None

    def complete_submission_workflow(self, collection_uuid, file_path, metadata=None):
        """
        Complete submission workflow: create workspace → add metadata → upload file → accept license → submit
        """
        # Step 1: Create workspace
        workspace_id = self.create_workspace_item(collection_uuid)
        if not workspace_id:
            return False
            
        # Step 2: Add metadata
        if metadata:
            if not self.add_workspace_metadata(workspace_id, metadata):
                return False
        
        # Step 3: Upload file
        if not self.upload_file_to_workspace(workspace_id, file_path):
            return False
            
        # Step 4: Accept license
        if not self.accept_workspace_license(workspace_id):
            return False
            
        # Step 5: Submit to workflow
        if not self.submit_workspace_item(workspace_id):
            return False
            
        print(f"🎉 Complete submission workflow successful! Workspace: {workspace_id}")
        return True

    # Legacy methods (keep for backward compatibility)
    def _make_metadata_list(self, metadata_dict):
        """
        Convert {'dc.title': 'Title', 'dc.contributor.author': ['A','B']} into
        DSpace metadata list [{"key": "dc.title", "value": "Title"}, ...]
        """
        md = []
        for k, v in metadata_dict.items():
            if v is None:
                continue
            if isinstance(v, (list, tuple)):
                for item in v:
                    if item is None:
                        continue
                    md.append({"key": k, "value": str(item)})
            else:
                md.append({"key": k, "value": str(v)})
        return md

    def create_item(self, collection_uuid, metadata):
        """
        Create an item in the given collection. `metadata` is a dict of dc keys -> values.
        Returns item UUID on success or None.
        """
        body = {"metadata": self._make_metadata_list(metadata or {})}
        headers = self._get_csrf_headers({
            "Accept": "application/json", 
            "Content-Type": "application/json"
        })

        # 1) try collection-specific endpoint (some DSpace builds support this)
        url1 = f"{self.base_url}/core/collections/{collection_uuid}/items"
        r = self.session.post(url1, json=body, headers=headers)
        if r.status_code in (200, 201):
            try:
                return r.json().get("uuid") or r.json().get("id")
            except Exception:
                return None

        # 2) fallback: create item by posting to /core/items with owningCollection
        if r.status_code == 405 or r.status_code == 404:
            fallback = {"metadata": body["metadata"], "owningCollection": {"uuid": collection_uuid}}
            url2 = f"{self.base_url}/core/items"
            r2 = self.session.post(url2, json=fallback, headers=headers)
            if r2.status_code in (200, 201):
                try:
                    return r2.json().get("uuid") or r2.json().get("id")
                except Exception:
                    return None
            else:
                print(f"✗ create_item fallback failed {r2.status_code}: {r2.text}")
                return None

        print(f"✗ create_item failed {r.status_code}: {r.text}")
        return None

    def upload_bitstream(self, item_uuid, file_path, name=None):
        """
        Upload file_path as a bitstream attached to item_uuid.
        Returns bitstream id or None.
        """
        name = name or os.path.basename(file_path)
        url = f"{self.base_url}/core/bitstreams?item_id={item_uuid}&name={name}"
        content_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
        headers = self._get_csrf_headers({"Content-Type": content_type})

        with open(file_path, "rb") as fh:
            r = self.session.post(url, data=fh, headers=headers)
        if r.status_code in (200, 201):
            try:
                return r.json().get("id")
            except Exception:
                return None
        else:
            print(f"✗ upload_bitstream failed {r.status_code}: {r.text}")
            return None

    def create_item_and_upload(self, collection_uuid, file_path, metadata=None):
        """
        Convenience: create an item with metadata then upload file_path as its primary bitstream.
        metadata is a dict (will default to {'dc.title': filename}).
        Returns item_uuid on success or None.
        """
        if not metadata:
            metadata = {"dc.title": os.path.basename(file_path)}
        item_uuid = self.create_item(collection_uuid, metadata)
        if not item_uuid:
            return None
        bit_id = self.upload_bitstream(item_uuid, file_path)
        if not bit_id:
            print(f"✗ Upload of {file_path} failed after creating item {item_uuid}")
            return None
        return item_uuid

# Helper function to create and authenticate client
def create_authenticated_client():
    from .config import DSPACE_EMAIL, DSPACE_PASSWORD
    
    client = DSpaceClient()
    
    # Test connection first
    if not client.test_connection():
        print("✗ Cannot connect to DSpace API. Please check your DSPACE_URL.")
        return None
    
    # Attempt login
    if client.login(DSPACE_EMAIL, DSPACE_PASSWORD):
        return client
    else:
        print("✗ Authentication failed. Please check your email and password in .env file.")
        return None
