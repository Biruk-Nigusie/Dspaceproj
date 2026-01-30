#!/usr/bin/env python3
import os
import xml.etree.ElementTree as ET
from dspace_client import create_authenticated_client
from config import COLLECTION_UUID

def parse_metadata_xml(xml_path):
    """Parse Dublin Core XML and convert to DSpace JSON patch format"""
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
    metadata_patches = []
    
    for dcvalue in root.findall('dcvalue'):
        element = dcvalue.get('element')
        qualifier = dcvalue.get('qualifier', 'none')
        value = dcvalue.text.strip() if dcvalue.text else ""
        
        if not value:
            continue
            
        # Map Dublin Core to DSpace paths
        if element == 'title' and qualifier == 'none':
            path = "/sections/traditionalpageone/dc.title"
        elif element == 'date' and qualifier == 'issued':
            path = "/sections/traditionalpageone/dc.date.issued"
        elif element == 'type' and qualifier == 'none':
            path = "/sections/traditionalpageone/dc.type"
        elif element == 'contributor' and qualifier == 'author':
            path = "/sections/traditionalpageone/dc.contributor.author"
        else:
            # Skip unmapped fields for now
            continue
            
        metadata_patches.append({
            "op": "add",
            "path": path,
            "value": [{"value": value}]
        })
    
    return metadata_patches

def find_pdf_file(item_dir):
    """Find the first PDF file in the item directory"""
    for file in os.listdir(item_dir):
        if file.lower().endswith('.pdf'):
            return os.path.join(item_dir, file)
    return None

def test_complete_upload():
    c = create_authenticated_client()
    if not c:
        return False
    
    COL = COLLECTION_UUID
    item_dir = "/home/biruk/uploads/setA/item1"
    test_file = find_pdf_file(item_dir)
    metadata_xml = os.path.join(item_dir, "metadata.xml")
    
    if not test_file:
        print("❌ No PDF file found in item1 directory")
        return False
        
    print(f"Using file: {os.path.basename(test_file)}")
    
    print("=== Testing Complete Upload Workflow ===")
    
    # Step 1: Create workspace
    workspace_id = c.create_workspace_item(COL)
    if not workspace_id:
        return False
    
    # Step 2: Parse metadata from XML and add to workspace
    metadata_patch = parse_metadata_xml(metadata_xml)
    print(f"✓ Parsed {len(metadata_patch)} metadata fields from XML")
    
    if not c.add_workspace_metadata(workspace_id, metadata_patch):
        print("❌ Failed to add metadata")
        return False
    
    # Step 3: Upload file
    if not c.upload_file_to_workspace(workspace_id, test_file):
        print("❌ Failed to upload file")
        return False
    
    # Step 4: Accept license
    if not c.accept_workspace_license(workspace_id):
        print("❌ Failed to accept license")
        return False
    
    # Step 5: Submit to workflow
    if not c.submit_workspace_item(workspace_id):
        print("❌ Failed to submit to workflow")
        return False
    
    print(f"🎉 COMPLETE SUCCESS! Item submitted to DSpace via workspace {workspace_id}")
    return True

if __name__ == "__main__":
    success = test_complete_upload()
    if success:
        print("\n✅ File is now uploaded to DSpace and in the workflow!")
    else:
        print("\n❌ Upload process failed at some step")