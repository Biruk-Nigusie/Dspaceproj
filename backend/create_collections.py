#!/usr/bin/env python3
import os
import sys
import requests

# Add backend directory to path so we can import dspace_uploader
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)
sys.path.insert(0, os.path.join(script_dir, 'dspace_uploader'))

from dspace_uploader.dspace_client import DSpaceClient
from dspace_uploader.config import API_BASE

def main():
    # Admin Credentials provided by user
    ADMIN_EMAIL = "biruk11011@gmail.com"
    ADMIN_PASSWORD = "Biruk@0115439"
    COMMUNITY_HANDLE = "123456789/228"
    
    collections_to_create = [
        "Books",
        "magazines",
        "Newspapers",
        "Manuscript",
        "Microfilms",
        "Archives"
    ]

    print(f"🚀 Starting collection creation for community handle: {COMMUNITY_HANDLE}")
    
    client = DSpaceClient()
    
    # Login
    print(f"🔑 Logging in as {ADMIN_EMAIL}...")
    if not client.login(ADMIN_EMAIL, ADMIN_PASSWORD):
        print("❌ Login failed!")
        return

    # Find Community UUID
    community_uuid = None
    community_name = "Ethiopian digital archive and digital services"
    
    print(f"🔍 Searching for community: {community_name}...")
    
    try:
        # Try finding by name first or as fallback
        search_url = f"{API_BASE}/core/communities/search/findByName?name={community_name}"
        resp_search = client.session.get(search_url)
        
        if resp_search.status_code == 200:
            data = resp_search.json()
            communities = data.get('_embedded', {}).get('communities', [])
            if communities:
                community_uuid = communities[0].get('uuid')
                print(f"✅ Found Community by name: {community_name} (UUID: {community_uuid})")
        
        if not community_uuid:
            print("🔍 Listing all communities to find a match...")
            communities_url = f"{API_BASE}/core/communities"
            resp_all = client.session.get(communities_url)
            if resp_all.status_code == 200:
                all_data = resp_all.json()
                communities = all_data.get('_embedded', {}).get('communities', [])
                print(f"   Found {len(communities)} communities total.")
                for comm in communities:
                    name = comm.get('name')
                    uuid = comm.get('uuid')
                    handle = comm.get('handle')
                    print(f"   - {name} (UUID: {uuid}, Handle: {handle})")
                    if community_name.lower() in name.lower():
                        community_uuid = uuid
                        print(f"      👉 Match found: {uuid}")
                        break

        if not community_uuid:
            print("❌ Could not find community by name or handle.")
            return
        
        # In DSpace 7, often you POST to /core/collections and link the community
        # or use the sub-resource endpoint if supported.
        # Let's try posting to /core/collections with parent community link
        create_col_url = f"{API_BASE}/core/collections"
        
        for col_name in collections_to_create:
            print(f"📦 Creating collection: {col_name}...")
            
            # DSpace 7 payload for creating a collection
            payload = {
                "name": col_name,
                "metadata": {
                    "dc.title": [
                        {
                            "value": col_name,
                            "language": None
                        }
                    ]
                }
            }
            
            # We need to specify the parent community. 
            # In DSpace 7 this is often done via a query parameter 'parent' 
            # or by embedding the parent in the post.
            
            params = {"parent": community_uuid}
            
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            resp_col = client.session.post(create_col_url, json=payload, params=params, headers=headers)
            
            if resp_col.status_code in [200, 201]:
                col_data = resp_col.json()
                print(f"   ✅ Successfully created: {col_name} (UUID: {col_data.get('uuid')})")
            else:
                print(f"   ❌ Failed to create {col_name}: {resp_col.status_code}")
                # Try fallback if 405 or 400
                if resp_col.status_code in [405, 400]:
                    print("   🔄 Trying alternative endpoint...")
                    alt_url = f"{API_BASE}/core/communities/{community_uuid}/collections"
                    resp_alt = client.session.post(alt_url, json=payload, headers=headers)
                    if resp_alt.status_code in [200, 201]:
                         print(f"   ✅ Successfully created (alt): {col_name} (UUID: {resp_alt.json().get('uuid')})")
                    else:
                         print(f"   ❌ Alt failed: {resp_alt.status_code} - {resp_alt.text}")

    except Exception as e:
        print(f"❌ An error occurred: {e}")

if __name__ == "__main__":
    main()
