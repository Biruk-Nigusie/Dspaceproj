#!/usr/bin/env python3
"""
DSpace Complete Seeding Script - All Collections
Seeds 3 items each for Archive, Multimedia, Serial, and Printed collections
"""

import sys
import os

# Add dspace_uploader to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'dspace_uploader'))

from dspace_client import DSpaceClient
from config import DSPACE_EMAIL, DSPACE_PASSWORD

# File path for uploads
FILE_PATH = '/home/biruk/uploads/setA/item1/file1.pdf'

# Collection UUIDs - One collection from each community
COLLECTIONS = {
    'archive': '9392a2a6-be45-4c72-b769-dcbccb7801a8',  # Archival File
    'multimedia': 'fcff2da5-9bbf-401d-ae9c-c5f6dca52f40',  # Music
    'serial': 'ce5f4445-bb1f-44d2-a7c0-1f4d2ec2c59d',  # Newspapers
    'printed': '19c27d17-e303-4e8e-be25-11898fdbe0fc'  # Book
}

# Archive items with required fields from archiveForm
ARCHIVE_ITEMS = [
    {
        'metadata': [
            {"op": "add", "path": "/sections/archiveForm/dc.identifier.other", "value": [{"value": "ARH-001"}]},  # Reference Code
            {"op": "add", "path": "/sections/archiveForm/dc.title", "value": [{"value": "የመንግስት ሰነዶች ስብስብ - የ1960ዎቹ ዓ.ም", "language": "am"}]},
            {"op": "add", "path": "/sections/archiveForm/dc.description.abstract", "value": [{"value": "ይህ የመንግስት ሰነዶች ስብስብ የ1960ዎቹን ዓመታት የሚመለከት ታሪካዊ ሰነዶችን ይዟል።", "language": "am"}]},
            {"op": "add", "path": "/sections/archiveForm/dc.type", "value": [{"value": "Governmental Archive"}]},
            {"op": "add", "path": "/sections/archiveForm/dc.subject", "value": [
                {"value": "የመንግስት ሰነዶች", "language": "am"},
                {"value": "ታሪክ", "language": "am"}
            ]},
            {"op": "add", "path": "/sections/archiveForm/dc.coverage.temporal", "value": [{"value": "1960 - 1969"}]},
            {"op": "add", "path": "/sections/archiveForm/dc.date.issued", "value": [{"value": "1968"}]},
        ]
    },
    {
        'metadata': [
            {"op": "add", "path": "/sections/archiveForm/dc.identifier.other", "value": [{"value": "ARH-002"}]},
            {"op": "add", "path": "/sections/archiveForm/dc.title", "value": [{"value": "የግል ደብዳቤዎች ስብስብ - ዶ/ር አበበ ብስራት", "language": "am"}]},
            {"op": "add", "path": "/sections/archiveForm/dc.description.abstract", "value": [{"value": "የዶ/ር አበበ ብስራት የግል ደብዳቤዎች እና ሰነዶች ስብስብ።", "language": "am"}]},
            {"op": "add", "path": "/sections/archiveForm/dc.type", "value": [{"value": "Personal Archive"}]},
            {"op": "add", "path": "/sections/archiveForm/dc.subject", "value": [
                {"value": "የግል ማህደር", "language": "am"},
                {"value": "ደብዳቤዎች", "language": "am"}
            ]},
            {"op": "add", "path": "/sections/archiveForm/dc.coverage.temporal", "value": [{"value": "1970 - 1980"}]},
            {"op": "add", "path": "/sections/archiveForm/dc.date.issued", "value": [{"value": "1975"}]},
        ]
    },
    {
        'metadata': [
            {"op": "add", "path": "/sections/archiveForm/dc.identifier.other", "value": [{"value": "ARH-003"}]},
            {"op": "add", "path": "/sections/archiveForm/dc.title", "value": [{"value": "የአዲስ አበባ ዩኒቨርሲቲ ማህደር", "language": "am"}]},
            {"op": "add", "path": "/sections/archiveForm/dc.description.abstract", "value": [{"value": "የአዲስ አበባ ዩኒቨርሲቲ ታሪካዊ ሰነዶች እና ማህደሮች።", "language": "am"}]},
            {"op": "add", "path": "/sections/archiveForm/dc.type", "value": [{"value": "Institutional Archive"}]},
            {"op": "add", "path": "/sections/archiveForm/dc.subject", "value": [
                {"value": "የተቋም ማህደር", "language": "am"},
                {"value": "ትምህርት", "language": "am"}
            ]},
            {"op": "add", "path": "/sections/archiveForm/dc.coverage.temporal", "value": [{"value": "1950 - 2000"}]},
            {"op": "add", "path": "/sections/archiveForm/dc.date.issued", "value": [{"value": "1950"}]},
        ]
    }
]

# Multimedia items (Music collection)
MULTIMEDIA_ITEMS = [
    {
        'metadata': [
            {"op": "add", "path": "/sections/multimediaSubmission/dc.title", "value": [{"value": "ትዝታ - የባህላዊ ሙዚቃ ስብስብ", "language": "am"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.contributor.author", "value": [{"value": "ማህሙድ አህመድ", "language": "am"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.date.issued", "value": [{"value": "2000"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.subject", "value": [
                {"value": "ባህላዊ ሙዚቃ", "language": "am"},
                {"value": "ኢትዮጵያዊ ሙዚቃ", "language": "am"}
            ]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.description.abstract", "value": [{"value": "የኢትዮጵያ ባህላዊ ሙዚቃ ስብስብ በማህሙድ አህመድ የተዘጋጀ።", "language": "am"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.type", "value": [{"value": "Audio"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.format", "value": [{"value": "audio/mpeg"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.identifier.other", "value": [{"value": "AV00571-2002"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.format.extent", "value": [{"value": "1 ካሴት, 60 ደቂቃ", "language": "am"}]},
        ]
    },
    {
        'metadata': [
            {"op": "add", "path": "/sections/multimediaSubmission/dc.title", "value": [{"value": "የአዲስ አበባ ታሪክ - ዘጋቢ ፊልም", "language": "am"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.contributor.author", "value": [{"value": "ሳሙኤል ተስፋዬ", "language": "am"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.date.issued", "value": [{"value": "2010"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.subject", "value": [
                {"value": "ዘጋቢ ፊልም", "language": "am"},
                {"value": "አዲስ አበባ", "language": "am"}
            ]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.description.abstract", "value": [{"value": "የአዲስ አበባ ከተማ ታሪክ የሚያሳይ ዘጋቢ ፊልም።", "language": "am"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.type", "value": [{"value": "Video"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.format", "value": [{"value": "video/mp4"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.identifier.other", "value": [{"value": "VD00234-2010"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.format.extent", "value": [{"value": "1 DVD, 90 ደቂቃ", "language": "am"}]},
        ]
    },
    {
        'metadata': [
            {"op": "add", "path": "/sections/multimediaSubmission/dc.title", "value": [{"value": "የኢትዮጵያ ባህላዊ ምግቦች - ፎቶ ስብስብ", "language": "am"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.contributor.author", "value": [{"value": "ብርሃኑ ወልደ", "language": "am"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.date.issued", "value": [{"value": "2015"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.subject", "value": [
                {"value": "ፎቶግራፍ", "language": "am"},
                {"value": "ባህላዊ ምግብ", "language": "am"}
            ]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.description.abstract", "value": [{"value": "የኢትዮጵያ ባህላዊ ምግቦች ፎቶግራፍ ስብስብ።", "language": "am"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.type", "value": [{"value": "Image"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.format", "value": [{"value": "image/jpeg"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.identifier.other", "value": [{"value": "PH00456-2015"}]},
            {"op": "add", "path": "/sections/multimediaSubmission/dc.format.extent", "value": [{"value": "50 ፎቶዎች", "language": "am"}]},
        ]
    }
]

# Serial items (Newspapers collection) - Fixed with required provenance field
SERIAL_ITEMS = [
    {
        'metadata': [
            {"op": "add", "path": "/sections/serialStep/dc.title", "value": [{"value": "አዲስ ዘመን - ጋዜጣ", "language": "am"}]},
            {"op": "add", "path": "/sections/serialStep/dc.contributor.author", "value": [{"value": "የአዲስ ዘመን አዘጋጆች", "language": "am"}]},
            {"op": "add", "path": "/sections/serialStep/dc.date.issued", "value": [{"value": "2012-01-15"}]},
            {"op": "add", "path": "/sections/serialStep/dc.subject", "value": [
                {"value": "ጋዜጣ", "language": "am"},
                {"value": "ዜና", "language": "am"}
            ]},
            {"op": "add", "path": "/sections/serialStep/dc.type", "value": [{"value": "Newspaper"}]},
            {"op": "add", "path": "/sections/serialStep/dc.language.iso", "value": [{"value": "am"}]},
            {"op": "add", "path": "/sections/serialStep/dc.publisher", "value": [{"value": "የአዲስ ዘመን ማተሚያ ቤት", "language": "am"}]},
            {"op": "add", "path": "/sections/serialStep/dc.identifier.other", "value": [{"value": "182756"}]},
            {"op": "add", "path": "/sections/serialStep/dc.description.provenance", "value": [{"value": "Legal Deposit"}]},  # Required field
        ]
    },
    {
        'metadata': [
            {"op": "add", "path": "/sections/serialStep/dc.title", "value": [{"value": "የኢትዮጵያ ህክምና ጆርናል", "language": "am"}]},
            {"op": "add", "path": "/sections/serialStep/dc.contributor.author", "value": [
                {"value": "ዶ/ር ሙሉጌታ ገብሬ", "language": "am"},
                {"value": "ዶ/ር ሳራ መኮንን", "language": "am"}
            ]},
            {"op": "add", "path": "/sections/serialStep/dc.date.issued", "value": [{"value": "2018-06-01"}]},
            {"op": "add", "path": "/sections/serialStep/dc.subject", "value": [
                {"value": "ህክምና", "language": "am"},
                {"value": "ጆርናል", "language": "am"}
            ]},
            {"op": "add", "path": "/sections/serialStep/dc.type", "value": [{"value": "Journal"}]},
            {"op": "add", "path": "/sections/serialStep/dc.language.iso", "value": [{"value": "am"}]},
            {"op": "add", "path": "/sections/serialStep/dc.publisher", "value": [{"value": "የኢትዮጵያ ህክምና ማህበር", "language": "am"}]},
            {"op": "add", "path": "/sections/serialStep/dc.identifier.other", "value": [{"value": "234567"}]},
            {"op": "add", "path": "/sections/serialStep/dc.description.provenance", "value": [{"value": "Purchase"}]},
        ]
    },
    {
        'metadata': [
            {"op": "add", "path": "/sections/serialStep/dc.title", "value": [{"value": "ሪፖርተር - ሳምንታዊ መጽሔት", "language": "am"}]},
            {"op": "add", "path": "/sections/serialStep/dc.contributor.author", "value": [{"value": "የሪፖርተር አዘጋጆች", "language": "am"}]},
            {"op": "add", "path": "/sections/serialStep/dc.date.issued", "value": [{"value": "2020-03-20"}]},
            {"op": "add", "path": "/sections/serialStep/dc.subject", "value": [
                {"value": "መጽሔት", "language": "am"},
                {"value": "ዜና እና ትንታኔ", "language": "am"}
            ]},
            {"op": "add", "path": "/sections/serialStep/dc.type", "value": [{"value": "Magazine"}]},
            {"op": "add", "path": "/sections/serialStep/dc.language.iso", "value": [{"value": "am"}]},
            {"op": "add", "path": "/sections/serialStep/dc.publisher", "value": [{"value": "ሪፖርተር ማተሚያ ቤት", "language": "am"}]},
            {"op": "add", "path": "/sections/serialStep/dc.identifier.other", "value": [{"value": "345678"}]},
            {"op": "add", "path": "/sections/serialStep/dc.description.provenance", "value": [{"value": "Donation"}]},
        ]
    }
]

# Printed items (Book collection)
PRINTED_ITEMS = [
    {
        'metadata': [
            {"op": "add", "path": "/sections/printedStep/dc.title", "value": [{"value": "የኢትዮጵያ ታሪክ", "language": "am"}]},
            {"op": "add", "path": "/sections/printedStep/dc.contributor.author", "value": [
                {"value": "ፕሮፌሰር ታደሰ በየነ", "language": "am"},
                {"value": "ዶ/ር አለማየሁ ሞገስ", "language": "am"}
            ]},
            {"op": "add", "path": "/sections/printedStep/dc.date.issued", "value": [{"value": "2005-09-15"}]},
            {"op": "add", "path": "/sections/printedStep/dc.subject", "value": [
                {"value": "ታሪክ", "language": "am"},
                {"value": "ኢትዮጵያ", "language": "am"}
            ]},
            {"op": "add", "path": "/sections/printedStep/dc.type", "value": [{"value": "Book"}]},
            {"op": "add", "path": "/sections/printedStep/dc.identifier.other", "value": [{"value": "955637"}]},
        ]
    },
    {
        'metadata': [
            {"op": "add", "path": "/sections/printedStep/dc.title", "value": [{"value": "የአማርኛ ሰዋስው", "language": "am"}]},
            {"op": "add", "path": "/sections/printedStep/dc.contributor.author", "value": [{"value": "ዶ/ር ግርማ አወቀ ደምሴ", "language": "am"}]},
            {"op": "add", "path": "/sections/printedStep/dc.date.issued", "value": [{"value": "2010-03-01"}]},
            {"op": "add", "path": "/sections/printedStep/dc.subject", "value": [
                {"value": "ቋንቋ", "language": "am"},
                {"value": "ሰዋስው", "language": "am"}
            ]},
            {"op": "add", "path": "/sections/printedStep/dc.type", "value": [{"value": "Book"}]},
            {"op": "add", "path": "/sections/printedStep/dc.identifier.other", "value": [{"value": "856234"}]},
        ]
    },
    {
        'metadata': [
            {"op": "add", "path": "/sections/printedStep/dc.title", "value": [{"value": "የኢትዮጵያ ባህል እና ወግ", "language": "am"}]},
            {"op": "add", "path": "/sections/printedStep/dc.contributor.author", "value": [{"value": "ፕሮፌሰር አበበ ክብረት", "language": "am"}]},
            {"op": "add", "path": "/sections/printedStep/dc.date.issued", "value": [{"value": "2015-11-20"}]},
            {"op": "add", "path": "/sections/printedStep/dc.subject", "value": [
                {"value": "ባህል", "language": "am"},
                {"value": "ወግ", "language": "am"}
            ]},
            {"op": "add", "path": "/sections/printedStep/dc.type", "value": [{"value": "Book"}]},
            {"op": "add", "path": "/sections/printedStep/dc.identifier.other", "value": [{"value": "923456"}]},
        ]
    }
]


def seed_collection(client, collection_name, collection_uuid, items):
    """Seed items into a specific collection"""
    print(f"\n{'='*60}")
    print(f"Seeding {collection_name} Collection")
    print(f"{'='*60}\n")
    
    success_count = 0
    
    for i, item_data in enumerate(items, 1):
        title = item_data['metadata'][0]['value'][0]['value']
        print(f"\n[{i}/{len(items)}] Creating: {title}")
        
        try:
            # Step 1: Create workspace
            workspace_id = client.create_workspace_item(collection_uuid)
            if not workspace_id:
                print(f"✗ Failed to create workspace for item {i}")
                continue
            
            # Step 2: Add metadata
            metadata_success = client.add_workspace_metadata(workspace_id, item_data['metadata'])
            if not metadata_success:
                print(f"✗ Failed to add metadata for item {i}")
                continue
            
            # Step 3: Upload file
            upload_success = client.upload_file_to_workspace(workspace_id, FILE_PATH)
            if not upload_success:
                print(f"⚠️  Failed to upload file for item {i}, but continuing...")
            
            # Step 4: Accept license
            license_success = client.accept_workspace_license(workspace_id)
            if not license_success:
                print(f"✗ Failed to accept license for item {i}")
                continue
            
            # Step 5: Submit to workflow
            submit_result = client.submit_workspace_item(workspace_id)
            if submit_result:
                print(f"✅ Item {i} successfully submitted to workflow!")
                success_count += 1
            else:
                print(f"✗ Failed to submit item {i} to workflow")
                
        except Exception as e:
            print(f"✗ Error processing item {i}: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\n{collection_name} Summary: {success_count}/{len(items)} items successfully submitted")
    return success_count


def main():
    """Main seeding function"""
    print("\n" + "="*60)
    print("DSpace Complete Seeding Script - All Collections")
    print("="*60 + "\n")
    
    # Create and authenticate client
    client = DSpaceClient()
    
    print(f"Logging in as {DSPACE_EMAIL}...")
    if not client.login(DSPACE_EMAIL, DSPACE_PASSWORD):
        print("✗ Failed to login. Exiting.")
        return
    
    print("✅ Successfully authenticated\n")
    
    # Seed each collection
    total_success = 0
    
    total_success += seed_collection(client, "Archive (Archival File)", COLLECTIONS['archive'], ARCHIVE_ITEMS)
    total_success += seed_collection(client, "Multimedia (Music)", COLLECTIONS['multimedia'], MULTIMEDIA_ITEMS)
    total_success += seed_collection(client, "Serial (Newspapers)", COLLECTIONS['serial'], SERIAL_ITEMS)
    total_success += seed_collection(client, "Printed Material (Book)", COLLECTIONS['printed'], PRINTED_ITEMS)
    
    # Final summary
    print("\n" + "="*60)
    print("Seeding Complete!")
    print("="*60)
    print(f"\nTotal items successfully submitted: {total_success}/12")
    print("\n📋 Note: Items are now in the workflow.")
    print("   You can review and approve them in the DSpace admin interface.")
    print("   They will appear in 'Workflow tasks' until approved.\n")


if __name__ == '__main__':
    main()
