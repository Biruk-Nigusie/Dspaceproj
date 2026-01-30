#!/usr/bin/env python3
import os
import sys

# Add dspace_uploader to path
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(script_dir, 'dspace_uploader'))

from dspace_client import DSpaceClient

def run_dspace_connection_check():
    client = DSpaceClient()
    print('DSpace Client initialized')

    from config import DSPACE_EMAIL, DSPACE_PASSWORD, COLLECTION_UUID
    
    if client.login(DSPACE_EMAIL, DSPACE_PASSWORD):
        print(f'✅ Login successful for {DSPACE_EMAIL}')

        # Try to get collections
        try:
            collections = client.get_collections()
            print(f'📈 Found {len(collections) if collections else 0} collections')
        except Exception as e:
            print('❌ Error getting collections:', e)

        # Try to create workspace item
        try:
            print('🔍 Using collection UUID:', COLLECTION_UUID)
            ws_id = client.create_workspace_item(COLLECTION_UUID)
            
            if ws_id:
                print('✅ Workspace item created:', ws_id)
                # Try to add metadata
                metadata_patch = [
                    {"op": "add", "path": "/sections/traditionalpageone/dc.title", "value": [{"value": "Connection Check Title"}]},
                    {"op": "add", "path": "/sections/traditionalpageone/dc.type", "value": [{"value": "Text"}]}
                ]
                success = client.add_workspace_metadata(ws_id, metadata_patch)
                print('📝 Metadata added:', success)
            else:
                print('❌ Failed to create workspace item')

        except Exception as e:
            print('❌ Error in workspace operations:', e)

    else:
        print(f'❌ Login failed for {DSPACE_EMAIL}')

if __name__ == '__main__':
    run_dspace_connection_check()