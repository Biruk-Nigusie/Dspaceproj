#!/usr/bin/env python3
import os
import sys

# Add backend directory to path so we can import dspace_uploader
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)
sys.path.insert(0, os.path.join(script_dir, 'dspace_uploader'))

from dspace_uploader.dspace_client import DSpaceClient

def main():
    # User Credentials
    SUBMITTER_EMAIL = "biruknigusie98@gmail.com"
    SUBMITTER_PASSWORD = "Biruk@0115439"
    
    collections = {
        "Books": "edbe133a-514a-4a93-91a5-681a63391b14",
        "magazines": "5eca2c28-1447-4684-91eb-d6cf68054ff4",
        "Newspapers": "dc2af003-a5ad-44c1-abae-de99b477dace",
        "Manuscript": "1b7665e4-c791-45ed-b53c-51bc5c9a6408",
        "Microfilms": "a479b060-e2d9-48dc-bb3d-614a6f0ea988",
        "Archives": "356bf909-269e-4b72-80d0-eb155a6647a3"
    }

    files = [
        "/home/biruk/uploads/setA/item1/file1.pdf",
        "/home/biruk/uploads/setA/item1/sample-local-pdf.pdf"
    ]

    client = DSpaceClient()
    
    print(f"🔑 Logging in as {SUBMITTER_EMAIL}...")
    if not client.login(SUBMITTER_EMAIL, SUBMITTER_PASSWORD):
        print("❌ Login failed!")
        return

    for i, (col_name, col_uuid) in enumerate(collections.items()):
        file_path = files[i % 2]
        print(f"\n🚀 Seeding collection: {col_name} ({col_uuid}) with file: {os.path.basename(file_path)}")
        
        # Step 1: Create workspace
        workspace_id = client.create_workspace_item(col_uuid)
        if not workspace_id:
            print(f"   ❌ Failed to create workspace")
            continue
            
        # Step 2: Add metadata
        # Splitting according to user's "Describe" categories
        metadata_patch = [
            # Page 1
            {"op": "add", "path": "/sections/traditionalpageone/dc.title", "value": [{"value": f"Sample {col_name} Resource"}]},
            {"op": "add", "path": "/sections/traditionalpageone/dc.contributor.author", "value": [{"value": "Alemu, Bekele"}]},
            {"op": "add", "path": "/sections/traditionalpageone/dc.title.alternative", "value": [{"value": f"Other Title {col_name}"}]},
            {"op": "add", "path": "/sections/traditionalpageone/dc.date.issued", "value": [{"value": "2026-02-02"}]},
            {"op": "add", "path": "/sections/traditionalpageone/dc.publisher", "value": [{"value": "Ethiopian Digital Archive"}]},
            {"op": "add", "path": "/sections/traditionalpageone/dc.identifier.citation", "value": [{"value": "Alemu, B. (2026)."}]},
            {"op": "add", "path": "/sections/traditionalpageone/dc.relation.ispartofseries", "value": [{"value": "Archive Series"}]},
            {"op": "add", "path": "/sections/traditionalpageone/dc.identifier.govdoc", "value": [{"value": f"REP-{i}"}]},
            {"op": "add", "path": "/sections/traditionalpageone/dc.identifier.issn", "value": [{"value": "1234-5678"}]},
            {"op": "add", "path": "/sections/traditionalpageone/dc.type", "value": [{"value": "Text"}]},
            {"op": "add", "path": "/sections/traditionalpageone/dc.language.iso", "value": [{"value": "en"}]},
            
            # Page 2
            {"op": "add", "path": "/sections/traditionalpagetwo/dc.subject", "value": [{"value": col_name}, {"value": "History"}]},
            {"op": "add", "path": "/sections/traditionalpagetwo/dc.description.abstract", "value": [{"value": f"Abstract for {col_name}"}]},
            {"op": "add", "path": "/sections/traditionalpagetwo/dc.description.sponsorship", "value": [{"value": "National Archive Sponsorship"}]},
            {"op": "add", "path": "/sections/traditionalpagetwo/dc.description", "value": [{"value": "General Description"}]}
        ]

        print(f"   📝 Applying metadata patch...")
        if client.add_workspace_metadata(workspace_id, metadata_patch):
            print(f"   ✅ Metadata added")
        else:
            print(f"   ❌ Metadata failed, trying fallback...")
            # If some fields fail, try minimal fields to at least create something
            minimal_patch = [
                {"op": "add", "path": "/sections/traditionalpageone/dc.title", "value": [{"value": f"Sample {col_name} Title"}]},
                {"op": "add", "path": "/sections/traditionalpageone/dc.type", "value": [{"value": "Text"}]}
            ]
            client.add_workspace_metadata(workspace_id, minimal_patch)

        # Step 3: Upload file
        if client.upload_file_to_workspace(workspace_id, file_path):
            print(f"   ✅ File uploaded")
        else:
            print(f"   ❌ File upload failed")

        # Step 4: Accept license
        if client.accept_workspace_license(workspace_id):
            print(f"   ✅ License accepted")
        else:
            print(f"   ❌ License failed")

        # Step 5: Submit
        if client.submit_workspace_item(workspace_id):
            print(f"   🎉 Successfully seeded {col_name}")
        else:
            print(f"   ❌ Submission failed")

if __name__ == "__main__":
    main()
