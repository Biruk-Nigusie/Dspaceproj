import os
import sys
import requests
import json
import time

# Add backend directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)
sys.path.insert(0, os.path.join(script_dir, 'dspace_uploader'))

from dspace_uploader.dspace_client import DSpaceClient

def submit_all():
    client = DSpaceClient()
    # Use the submitter account
    if not client.login("biruk11011@gmail.com", "Biruk@0115439"):
        print("Login failed")
        return

    # Fetch workspace items
    r = client.session.get(f"{client.base_url}/submission/workspaceitems?size=100")
    if r.status_code != 200:
        print(f"Failed to fetch workspace items: {r.status_code}")
        return

    items = r.json().get("_embedded", {}).get("workspaceitems", [])
    print(f"🚀 Found {len(items)} items in workspace to submit.")

    for item in items:
        ws_id = item['id']
        print(f"📝 Submitting item {ws_id}...")
        
        # Step 1: Accept license (if not already done)
        # client.accept_workspace_license(ws_id)
        
        # Step 2: Submit
        if client.submit_workspace_item(ws_id):
            print(f"   ✅ Submitted {ws_id}")
        else:
            print(f"   ❌ Failed to submit {ws_id}")
        
        time.sleep(0.5)

if __name__ == "__main__":
    submit_all()
