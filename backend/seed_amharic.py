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

    # Amharic Metadata Templates
    amharic_authors = ["አበበ በቆለ", "መሠረት ደፋር", "ቀነኒሳ በቀለ", "ኃይሌ ገብረሥላሴ", "ጥሩነሽ ዲባባ"]
    amharic_publishers = ["የኢትዮጵያ አታሚዎች ማኅበር", "የአዲስ አበባ ዩኒቨርሲቲ ፕሬስ", "የኢትዮጵያ ብሔራዊ ቤተ መዛግብትና ቤተ መጻሕፍት መምሪያ"]

    for col_name, col_uuid in collections.items():
        print(f"\n--- 🌟 Starting Seeding for {col_name} (5 items) ---")
        for i in range(5):
            file_idx = (i + list(collections.keys()).index(col_name)) % len(files)
            file_path = files[file_idx]
            item_num = i + 1
            
            print(f"\n🚀 [{col_name}] Seeding item {item_num}/5 with file: {os.path.basename(file_path)}")
            
            # Step 1: Create workspace
            workspace_id = client.create_workspace_item(col_uuid)
            if not workspace_id:
                print(f"   ❌ Failed to create workspace")
                continue
                
            # Step 2: Add metadata (Amharic)
            metadata_patch = [
                # Page 1
                {"op": "add", "path": "/sections/traditionalpageone/dc.title", "value": [{"value": f"የ{col_name} ናሙና መረጃ ቁጥር {item_num}"}]},
                {"op": "add", "path": "/sections/traditionalpageone/dc.contributor.author", "value": [{"value": amharic_authors[i % len(amharic_authors)]}]},
                {"op": "add", "path": "/sections/traditionalpageone/dc.title.alternative", "value": [{"value": f"ተለዋጭ ርዕስ {item_num}"}]},
                {"op": "add", "path": "/sections/traditionalpageone/dc.date.issued", "value": [{"value": f"2018-0{i+1}-01"}]},
                {"op": "add", "path": "/sections/traditionalpageone/dc.publisher", "value": [{"value": amharic_publishers[i % len(amharic_publishers)]}]},
                {"op": "add", "path": "/sections/traditionalpageone/dc.identifier.citation", "value": [{"value": f"{amharic_authors[i % len(amharic_authors)]} (2018). የ{col_name} ጥናት።"}]},
                {"op": "add", "path": "/sections/traditionalpageone/dc.relation.ispartofseries", "value": [{"value": "የኢትዮጵያ ዲጂታል ታሪክ ተከታታይ"}]},
                {"op": "add", "path": "/sections/traditionalpageone/dc.identifier.govdoc", "value": [{"value": f"ETH-{col_name[:3].upper()}-{item_num}"}]},
                {"op": "add", "path": "/sections/traditionalpageone/dc.type", "value": [{"value": "Text"}]},
                {"op": "add", "path": "/sections/traditionalpageone/dc.language.iso", "value": [{"value": "am"}]}, # Amharic
                
                # Page 2
                {"op": "add", "path": "/sections/traditionalpagetwo/dc.subject", "value": [{"value": "ኢትዮጵያ"}, {"value": col_name}, {"value": "ታሪክ"}]},
                {"op": "add", "path": "/sections/traditionalpagetwo/dc.description.abstract", "value": [{"value": f"ይህ በ{col_name} ክፍለ ስብስብ ውስጥ የሚገኝ የናሙና የኢትዮጵያ ታሪክ ሰነድ ነው። ለሙከራ አገልግሎት እንዲውል የተዘጋጀ ነው።"}]},
                {"op": "add", "path": "/sections/traditionalpagetwo/dc.description.sponsorship", "value": [{"value": "የኢትዮጵያ ዲጂታል አገልግሎት"}]},
                {"op": "add", "path": "/sections/traditionalpagetwo/dc.description", "value": [{"value": "አማርኛ ይዘት ለሙከራ"}]}
            ]

            if client.add_workspace_metadata(workspace_id, metadata_patch):
                print(f"   ✅ Amharic Metadata added")
            else:
                print(f"   ❌ Metadata failed")
                continue

            # Step 3: Upload file
            if client.upload_file_to_workspace(workspace_id, file_path):
                print(f"   ✅ File uploaded")
            else:
                print(f"   ❌ File upload failed")
                continue

            # Step 4: Accept license
            if client.accept_workspace_license(workspace_id):
                print(f"   ✅ License accepted")
            else:
                print(f"   ❌ License failed")
                continue

            # Step 5: Submit
            if client.submit_workspace_item(workspace_id):
                print(f"   🎉 Successfully seeded item {item_num}")
            else:
                print(f"   ❌ Submission failed")

if __name__ == "__main__":
    main()
