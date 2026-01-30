#!/usr/bin/env python3
import os
import xml.etree.ElementTree as ET
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dspace_client import create_authenticated_client
from config import COLLECTION_UUID

# Global stats
stats = {'success': 0, 'total': 0, 'start_time': 0}
stats_lock = threading.Lock()

def parse_metadata_xml_fast(xml_path):
    """Ultra-fast XML parsing with proper text handling"""
    try:
        tree = ET.parse(xml_path)
        patches = []
        for elem in tree.findall('.//dcvalue'):
            element = elem.get('element')
            qualifier = elem.get('qualifier', 'none')
            value = elem.text.strip() if elem.text else ""
            
            if value:
                if element == 'title' and qualifier == 'none':
                    patches.append({"op": "add", "path": "/sections/traditionalpageone/dc.title", "value": [{"value": value}]})
                elif element == 'date' and qualifier == 'issued':
                    patches.append({"op": "add", "path": "/sections/traditionalpageone/dc.date.issued", "value": [{"value": value}]})
                elif element == 'type' and qualifier == 'none':
                    patches.append({"op": "add", "path": "/sections/traditionalpageone/dc.type", "value": [{"value": value}]})
        return patches
    except Exception as e:
        print(f"Error parsing {xml_path}: {e}")
        return []

def find_pdf_fast(item_dir):
    """Fast PDF file finder"""
    try:
        for f in os.listdir(item_dir):
            if f.endswith('.pdf'):
                return os.path.join(item_dir, f)
    except:
        pass
    return None

def upload_item(item_data):
    """Create and submit workspace item to workflow for admin approval"""
    item_name, metadata_xml, pdf_file = item_data
    
    try:
        # Create client per thread
        c = create_authenticated_client()
        if not c:
            return False, f"{item_name}: Auth failed"
        
        # Parse metadata
        metadata_patch = parse_metadata_xml_fast(metadata_xml)
        if not metadata_patch:
            return False, f"{item_name}: No metadata"
        
        # Create workspace
        workspace_id = c.create_workspace_item(COLLECTION_UUID)
        if not workspace_id:
            return False, f"{item_name}: Workspace failed"
        
        # Add metadata
        if not c.add_workspace_metadata(workspace_id, metadata_patch):
            return False, f"{item_name}: Metadata failed"
        
        # Upload file
        if not c.upload_file_to_workspace(workspace_id, pdf_file):
            return False, f"{item_name}: Upload failed"
        
        # Accept license
        if not c.accept_workspace_license(workspace_id):
            return False, f"{item_name}: License failed"
        
        # SUBMIT to move from workspace to workflow for admin approval
        if not c.submit_workspace_item(workspace_id):
            return False, f"{item_name}: Submit failed"
        
        return True, f"{item_name}: Submitted to workflow for admin approval"
        
    except Exception as e:
        return False, f"{item_name}: {str(e)}"

def prepare_items_fast(upload_dir):
    """Fast item preparation"""
    items = []
    try:
        for item_name in os.listdir(upload_dir):
            item_path = os.path.join(upload_dir, item_name)
            if os.path.isdir(item_path):
                metadata_xml = os.path.join(item_path, "metadata.xml")
                pdf_file = find_pdf_fast(item_path)
                if os.path.exists(metadata_xml) and pdf_file:
                    items.append((item_name, metadata_xml, pdf_file))
    except:
        pass
    return items

def bulk_upload(upload_dir):
    """Create and submit items to workflow for admin approval"""
    print(f"=== BULK SUBMISSION TO WORKFLOW FOR ADMIN REVIEW ===")
    
    # Prepare all items
    items = prepare_items_fast(upload_dir)
    stats['total'] = len(items)
    stats['start_time'] = time.time()
    
    if not items:
        print("No items found")
        return False
    
    print(f"Submitting {len(items)} items to workflow with 50 threads...")
    print("📋 Items will be submitted to workflow for admin review")
    print("🔍 Admin can approve through DSpace UI workflow section")
    print("🚫 Items will NOT be automatically published until admin approval")
    
    # Process with optimal thread count (not too high to avoid server overload)
    with ThreadPoolExecutor(max_workers=50) as executor:
        futures = [executor.submit(upload_item, item) for item in items]
        
        for i, future in enumerate(as_completed(futures), 1):
            try:
                success, message = future.result()
                
                with stats_lock:
                    if success:
                        stats['success'] += 1
                        if i % 10 == 0:  # Show success messages less frequently
                            print(f"✓ {message}")
                    else:
                        print(f"✗ {message}")
                    
                    # Progress every 10 items
                    if i % 10 == 0 or i == len(items):
                        elapsed = time.time() - stats['start_time']
                        rate = i / elapsed if elapsed > 0 else 0
                        print(f"Progress: {i}/{len(items)} ({rate:.1f}/sec, {stats['success']} success)")
            except Exception as e:
                print(f"✗ Task exception: {e}")
    
    # Final stats
    elapsed = time.time() - stats['start_time']
    rate = len(items) / elapsed if elapsed > 0 else 0
    
    print(f"\n=== WORKFLOW SUBMISSION COMPLETE ===")
    print(f"Items submitted to workflow: {stats['success']}/{len(items)}")
    print(f"Time: {elapsed:.1f}s, Rate: {rate:.1f}/sec")
    if rate > 0:
        print(f"Estimated time for 2M items: {(2000000/rate/3600):.1f} hours")
    print(f"\n📌 NEXT STEPS:")
    print(f"1. Login to DSpace as admin")
    print(f"2. Go to 'Administrative' → 'Workflow' section")
    print(f"3. Review and approve the {stats['success']} workflow items")
    print(f"4. Items will become publicly accessible after admin approval")
    
    return stats['success'] == len(items)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        UPLOAD_DIR = sys.argv[1]
    else:
        UPLOAD_DIR = "/home/biruk/uploads/setA"
    bulk_upload(UPLOAD_DIR)