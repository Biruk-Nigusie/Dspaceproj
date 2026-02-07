import sys
import os
import json
import mimetypes
from datetime import datetime

# Add current directory to path so we can import backend.dspace.client
sys.path.append(os.getcwd())

from backend.dspace.client import create_authenticated_client

# Amharic content
AMHARIC_DATA = {
    "title": "የአማርኛ ሰነድ ሙከራ - {name}",
    "author": "አበበ ቢቂላ",
    "abstract": "ይህ በራስ-ሰር የተፈጠረ የአማርኛ ይዘት ያለው ሰነድ ነው። ይህ ሙከራ ለ {name} ስብስብ የተደረገ ነው።",
    "publisher": "ኢትዮጵያ የታተመ",
    "provenance": "ከሰነድ ማከማቻ የተገኘ።",
    "source": "ብሔራዊ ቤተ መዛግብት",
    "reference": "REF-ETH-{id}",
    "cid": "ETH-CID-{id}",
    "accession": "ACC-ETH-{id}",
    "physical": "100 ገጾች",
    "date": datetime.now().strftime("%Y-%m-%d"),
    "year": "2024"
}

COLLECTIONS_MAPPING = {
    "123456789/207": {
        "form": "archiveForm",
        "fields": lambda col_id, col_name: [
            {"key": "dc.identifier.refcode", "value": AMHARIC_DATA["reference"].format(id=col_id)},
            {"key": "local.identifier.cid", "value": AMHARIC_DATA["cid"].format(id=col_id)},
            {"key": "dc.title", "value": AMHARIC_DATA["title"].format(name=col_name)},
            {"key": "dc.description.abstract", "value": AMHARIC_DATA["abstract"].format(name=col_name)},
            {"key": "dc.type.archival", "value": "Governmental Archive"},
            {"key": "dc.coverage.temporal", "value": "1990-2020"},
            {"key": "dc.date.calendartype", "value": "Ethiopian"},
            {"key": "local.arrangement.level", "value": "Series"},
            {"key": "local.archival.quantity", "value": "1 box"},
            {"key": "local.archival.medium", "value": "Paper"},
            {"key": "dc.provenance", "value": AMHARIC_DATA["provenance"]},
            {"key": "dc.date.accessioned", "value": AMHARIC_DATA["date"]},
            {"key": "local.accession.means", "value": "Legal Deposit"},
            {"key": "dc.source", "value": AMHARIC_DATA["source"]},
            {"key": "dc.rights", "value": "Open Access"},
            {"key": "local.archival.security", "value": "Unclassified"},
            {"key": "local.archival.processing", "value": "Processed"}
        ]
    },
    "123456789/208": {
        "form": "serialStep",
        "fields": lambda col_id, col_name: [
            {"key": "dc.title", "value": AMHARIC_DATA["title"].format(name=col_name)},
            {"key": "dc.contributor.author", "value": AMHARIC_DATA["author"]},
            {"key": "dc.identifier.class", "value": "ETH-CLASS-001"},
            {"key": "dc.type.newspaper", "value": "Daily"},
            {"key": "dc.identifier.cid", "value": AMHARIC_DATA["cid"].format(id=col_id)},
            {"key": "dc.identifier.accession", "value": AMHARIC_DATA["accession"].format(id=col_id)},
            {"key": "dc.publisher", "value": AMHARIC_DATA["publisher"]},
            {"key": "dc.date.issued", "value": AMHARIC_DATA["date"]},
            {"key": "dc.language.iso", "value": "amh"},
            {"key": "local.acquisition.type", "value": "Legal Deposit"}
        ]
    },
    "123456789/209": {
        "form": "printedStep",
        "fields": lambda col_id, col_name: [
            {"key": "dc.title.prtitle", "value": AMHARIC_DATA["title"].format(name=col_name)},
            {"key": "dc.contributor.author", "value": AMHARIC_DATA["author"]},
            {"key": "dc.type.itemtype", "value": "Book"},
            {"key": "dc.date.issued", "value": AMHARIC_DATA["date"]},
            {"key": "dc.identifier.cid", "value": AMHARIC_DATA["cid"].format(id=col_id)}
        ]
    },
    "123456789/210": {
        "form": "multimediaSubmission",
        "fields": lambda col_id, col_name: [
            {"key": "dc.title", "value": AMHARIC_DATA["title"].format(name=col_name)},
            {"key": "dc.contributor.author", "value": AMHARIC_DATA["author"]},
            {"key": "dc.type", "value": "Audio" if "Music" in col_name else "Video"},
            {"key": "dc.description.abstract", "value": AMHARIC_DATA["abstract"].format(name=col_name)},
            {"key": "dc.format.medium", "value": "Digital"},
            {"key": "local.identifier.cid", "value": AMHARIC_DATA["cid"].format(id=col_id)},
            {"key": "dc.format.extent", "value": "05:00 minutes"}
        ]
    }
}

FILE_TYPE_MAP = {
    "archiveForm": "/home/biruk/uploads/setA/item1/file.pdf",
    "serialStep": "/home/biruk/uploads/setA/item1/file.pdf",
    "printedStep": "/home/biruk/uploads/setA/item1/file.pdf",
    "multimediaSubmission": "/home/biruk/uploads/setA/item1/music.mp3"
}

def seed():
    client = create_authenticated_client()
    if not client:
        print("Failed to authenticate with DSpace")
        return

    print("Fetching collections...")
    res = client.session.get(f"{client.base_url}/core/collections?size=100")
    if res.status_code != 200:
        print(f"Failed to fetch collections: {res.status_code}")
        return

    collections = res.json().get("_embedded", {}).get("collections", [])
    print(f"Found {len(collections)} collections.")

    for col in collections:
        col_name = col["name"]
        col_uuid = col["uuid"]
        
        # Get parent community handle
        parent_res = client.session.get(col["_links"]["parentCommunity"]["href"])
        if parent_res.status_code != 200:
            print(f"Failed to get parent for {col_name}")
            continue
        
        parent_handle = parent_res.json()["handle"]
        
        if parent_handle not in COLLECTIONS_MAPPING:
            print(f"Skipping {col_name} (parent community {parent_handle} not in mapping)")
            continue
        
        config = COLLECTIONS_MAPPING[parent_handle]
        form_id = config["form"]
        fields = config["fields"](col_uuid[:8], col_name)
        
        print(f"\n--- Seeding Collection: {col_name} ({form_id}) ---")
        
        # 1. Create Workspace Item
        wsi_id = client.create_workspace_item(col_uuid)
        if not wsi_id:
            print(f"Failed to create workspace item for {col_name}")
            continue
        print(f"Created Workspace Item: {wsi_id}")

        # 2. Add Metadata
        patches = []
        for f in fields:
            patches.append({
                "op": "add",
                "path": f"/sections/{form_id}/{f['key']}",
                "value": [{"value": f['value']}]
            })
        
        if client.add_workspace_metadata(wsi_id, patches):
            print("Metadata updated successfully")
        else:
            print("Metadata update failed. Retrying individual fields...")
            for f in fields:
                single_patch = [{
                    "op": "add",
                    "path": f"/sections/{form_id}/{f['key']}",
                    "value": [{"value": f['value']}]
                }]
                if not client.add_workspace_metadata(wsi_id, single_patch):
                     print(f"  ✗ Failed: {f['key']} = {f['value']}")

        # 3. Upload File
        file_path = FILE_TYPE_MAP.get(form_id)
        if col_name == "Film":
            file_path = "/home/biruk/uploads/setA/item1/video.webm"
        
        if file_path and os.path.exists(file_path):
            print(f"Uploading file: {file_path}")
            if client.upload_file_to_workspace(wsi_id, file_path):
                print("File uploaded successfully")
            else:
                print("File upload failed")
        
        # 4. Accept License
        client.accept_workspace_license(wsi_id)
        print("License accepted")

        # 5. Submit to Workflow
        workflow_item = client.submit_workspace_item(wsi_id)
        if workflow_item:
            print(f"SUCCESS: Submitted to workflow! ID: {workflow_item.get('id', wsi_id)}")
        else:
            print("Submission failed (likely validation error)")

if __name__ == "__main__":
    seed()
