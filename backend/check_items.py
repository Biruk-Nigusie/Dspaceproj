import os
import sys
import requests
import json

# Add backend directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)
sys.path.insert(0, os.path.join(script_dir, 'dspace_uploader'))

from dspace_uploader.dspace_client import DSpaceClient

def check():
    client = DSpaceClient()
    if not client.login("biruk11011@gmail.com", "Biruk@0115439"):
        print("Login failed")
        return

    # Check Workflow
    r = client.session.get(f"{client.base_url}/workflow/workflowitems")
    if r.status_code == 200:
        wf = r.json()
        total = wf.get("page", {}).get("totalElements", 0)
        print(f"Workflow Items: {total}")
        if total > 0:
            for item in wf.get("_embedded", {}).get("workflowitems", []):
                print(f"  - Item ID: {item['id']}")
    else:
        print(f"Workflow check failed: {r.status_code}")

    # Check Workspace
    r = client.session.get(f"{client.base_url}/submission/workspaceitems")
    if r.status_code == 200:
        ws = r.json()
        total = ws.get("page", {}).get("totalElements", 0)
        print(f"Workspace Items: {total}")
    else:
        print(f"Workspace check failed: {r.status_code}")

if __name__ == "__main__":
    check()
