#!/usr/bin/env python3
"""
DSpace Item Seeding Script
Seeds 3 items for each of the 4 collections with Amharic metadata
Collections:
1. Archive (123456789/207) - archiveForm
2. Multimedia (123456789/210) - multimediaSubmission
3. Serial/Journal (123456789/208) - serialStep
4. Printed Material (123456789/209) - printedStep
"""

import requests
import json
import os
from pathlib import Path
from datetime import datetime

# DSpace REST API Configuration
DSPACE_API_URL = os.getenv('DSPACE_API_URL', 'http://localhost:8080/server/api')
DSPACE_EMAIL = os.getenv('DSPACE_EMAIL', 'biruknigusie98@gmail.com')
DSPACE_PASSWORD = os.getenv('DSPACE_PASSWORD', 'Biruk@0115439')

# File path for uploads
FILE_PATH = '/home/biruk/uploads/setA/item1/file1.pdf'

class DSpaceClient:
    def __init__(self, api_url, email, password):
        self.api_url = api_url
        self.email = email
        self.password = password
        self.token = None
        self.csrf_token = None
        self.session = requests.Session()
        
    def login(self):
        """Authenticate with DSpace"""
        print(f"Logging in to DSpace as {self.email}...")
        
        # First attempt to login (will fail with 403 but returns CSRF token)
        response = self.session.post(
            f"{self.api_url}/authn/login",
            data={'user': self.email, 'password': self.password}
        )
        
        # Extract CSRF token from the failed response
        self.csrf_token = response.headers.get('DSPACE-XSRF-TOKEN')
        
        if not self.csrf_token:
            print("✗ Failed to get CSRF token")
            print(f"Response: {response.text}")
            return False
        
        # Now login with CSRF token
        headers = {
            'X-XSRF-TOKEN': self.csrf_token,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        response = self.session.post(
            f"{self.api_url}/authn/login",
            headers=headers,
            data={'user': self.email, 'password': self.password}
        )
        
        if response.status_code == 200:
            self.token = response.headers.get('Authorization')
            # Update CSRF token if new one is provided
            new_csrf = response.headers.get('DSPACE-XSRF-TOKEN')
            if new_csrf:
                self.csrf_token = new_csrf
            print("✓ Login successful")
            return True
        else:
            print(f"✗ Login failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    
    def get_headers(self):
        """Get headers for authenticated requests"""
        headers = {
            'X-XSRF-TOKEN': self.csrf_token,
            'Content-Type': 'application/json'
        }
        if self.token:
            headers['Authorization'] = self.token
        return headers
    
    def create_workspace_item(self, collection_uuid):
        """Create a workspace item in a collection"""
        print(f"Creating workspace item in collection {collection_uuid}...")
        response = self.session.post(
            f"{self.api_url}/submission/workspaceitems",
            headers=self.get_headers(),
            params={'owningCollection': collection_uuid}
        )
        
        if response.status_code in [200, 201]:
            workspace_item = response.json()
            print(f"✓ Workspace item created: {workspace_item['id']}")
            return workspace_item
        else:
            print(f"✗ Failed to create workspace item: {response.status_code}")
            print(response.text)
            return None
    
    def add_metadata(self, workspace_item_id, metadata):
        """Add metadata to a workspace item"""
        print(f"Adding metadata to workspace item {workspace_item_id}...")
        
        # Field name mapping from our data structure to DSpace Dublin Core
        field_mapping = {
            'title': 'dc.title',
            'authors': 'dc.contributor.author',
            'date_issued': 'dc.date.issued',
            'subjects': 'dc.subject',
            'description': 'dc.description.abstract',
            'type': 'dc.type',
            'language': 'dc.language.iso'
        }
        
        # Build metadata sections
        sections = {}
        
        # Add basic metadata with proper field names
        basic_section = {}
        for key, values in metadata.items():
            if key not in ['archive_metadata', 'multimedia_metadata', 'serial_metadata', 'printed_metadata']:
                # Use mapped field name if available, otherwise use as-is
                dc_field = field_mapping.get(key, key if key.startswith('dc.') else f"dc.{key}")
                basic_section[dc_field] = values
        
        if basic_section:
            sections["traditionalpageone"] = basic_section
        
        # Add collection-specific metadata
        if 'archive_metadata' in metadata:
            sections["archiveForm"] = metadata['archive_metadata']
        elif 'multimedia_metadata' in metadata:
            sections["multimediaSubmission"] = metadata['multimedia_metadata']
        elif 'serial_metadata' in metadata:
            sections["serialStep"] = metadata['serial_metadata']
        elif 'printed_metadata' in metadata:
            sections["printedStep"] = metadata['printed_metadata']
        
        payload = {"sections": sections}
        
        print(f"Sending metadata: {json.dumps(payload, indent=2, ensure_ascii=False)[:500]}...")
        
        response = self.session.patch(
            f"{self.api_url}/submission/workspaceitems/{workspace_item_id}",
            headers=self.get_headers(),
            json=payload
        )
        
        if response.status_code in [200, 201]:
            print("✓ Metadata added successfully")
            return True
        else:
            print(f"✗ Failed to add metadata: {response.status_code}")
            print(response.text)
            return False
    
    def upload_file(self, workspace_item_id, file_path):
        """Upload a file to a workspace item"""
        if not os.path.exists(file_path):
            print(f"✗ File not found: {file_path}")
            return False
        
        print(f"Uploading file {file_path}...")
        
        headers = {
            'X-XSRF-TOKEN': self.csrf_token,
        }
        if self.token:
            headers['Authorization'] = self.token
        
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f, 'application/pdf')}
            response = self.session.post(
                f"{self.api_url}/submission/workspaceitems/{workspace_item_id}/sections/upload/files",
                headers=headers,
                files=files
            )
        
        if response.status_code in [200, 201]:
            print("✓ File uploaded successfully")
            return True
        else:
            print(f"✗ Failed to upload file: {response.status_code}")
            print(response.text)
            return False


# Sample Amharic data for each collection type

ARCHIVE_ITEMS = [
    {
        'title': [{'value': 'የመንግስት ሰነዶች ስብስብ - የ1960ዎቹ ዓ.ም', 'language': 'am'}],
        'authors': [{'value': 'የኢትዮጵያ መንግስት', 'language': 'am'}],
        'date_issued': [{'value': '1968'}],
        'subjects': [
            {'value': 'የመንግስት ሰነዶች', 'language': 'am'},
            {'value': 'ታሪክ', 'language': 'am'}
        ],
        'description': [{'value': 'ይህ የመንግስት ሰነዶች ስብስብ የ1960ዎቹን ዓመታት የሚመለከት ታሪካዊ ሰነዶችን ይዟል።', 'language': 'am'}],
        'type': [{'value': 'Governmental Archive'}],
        'language': [{'value': 'am'}],
        'archive_metadata': {
            'dc.identifier.other': [{'value': '01'}],  # Reference Code
            'dc.coverage.temporal': [{'value': '1960 - 1969'}],
            'dc.format.extent': [{'value': '157 የወረቀት ማህደሮች'}],
            'dc.provenance': [{'value': 'ከመንግስት ቤተ መዛግብት የተላለፈ', 'language': 'am'}],
            'dc.date.available': [{'value': '1970-01-15'}],
        }
    },
    {
        'title': [{'value': 'የግል ደብዳቤዎች ስብስብ - ዶ/ር አበበ ብስራት', 'language': 'am'}],
        'authors': [{'value': 'ዶ/ር አበበ ብስራት', 'language': 'am'}],
        'date_issued': [{'value': '1975'}],
        'subjects': [
            {'value': 'የግል ማህደር', 'language': 'am'},
            {'value': 'ደብዳቤዎች', 'language': 'am'}
        ],
        'description': [{'value': 'የዶ/ር አበበ ብስራት የግል ደብዳቤዎች እና ሰነዶች ስብስብ።', 'language': 'am'}],
        'type': [{'value': 'Personal Archive'}],
        'language': [{'value': 'am'}],
        'archive_metadata': {
            'dc.identifier.other': [{'value': '02'}],
            'dc.coverage.temporal': [{'value': '1970 - 1980'}],
            'dc.format.extent': [{'value': '89 የወረቀት ማህደሮች'}],
            'dc.provenance': [{'value': 'ከቤተሰብ የተረከበ', 'language': 'am'}],
            'dc.date.available': [{'value': '1985-06-20'}],
        }
    },
    {
        'title': [{'value': 'የአዲስ አበባ ዩኒቨርሲቲ ማህደር', 'language': 'am'}],
        'authors': [{'value': 'አዲስ አበባ ዩኒቨርሲቲ', 'language': 'am'}],
        'date_issued': [{'value': '1950'}],
        'subjects': [
            {'value': 'የተቋም ማህደር', 'language': 'am'},
            {'value': 'ትምህርት', 'language': 'am'}
        ],
        'description': [{'value': 'የአዲስ አበባ ዩኒቨርሲቲ ታሪካዊ ሰነዶች እና ማህደሮች።', 'language': 'am'}],
        'type': [{'value': 'Institutional Archive'}],
        'language': [{'value': 'am'}],
        'archive_metadata': {
            'dc.identifier.other': [{'value': '03'}],
            'dc.coverage.temporal': [{'value': '1950 - 2000'}],
            'dc.format.extent': [{'value': '234 የወረቀት ማህደሮች'}],
            'dc.provenance': [{'value': 'ከዩኒቨርሲቲው የተላለፈ', 'language': 'am'}],
            'dc.date.available': [{'value': '2005-03-10'}],
        }
    }
]

MULTIMEDIA_ITEMS = [
    {
        'title': [{'value': 'ትዝታ - የባህላዊ ሙዚቃ ስብስብ', 'language': 'am'}],
        'authors': [{'value': 'ማህሙድ አህመድ', 'language': 'am'}],
        'date_issued': [{'value': '2000'}],
        'subjects': [
            {'value': 'ባህላዊ ሙዚቃ', 'language': 'am'},
            {'value': 'ኢትዮጵያዊ ሙዚቃ', 'language': 'am'}
        ],
        'description': [{'value': 'የኢትዮጵያ ባህላዊ ሙዚቃ ስብስብ በማህሙድ አህመድ የተዘጋጀ።', 'language': 'am'}],
        'type': [{'value': 'Audio'}],
        'language': [{'value': 'am'}],
        'multimedia_metadata': {
            'dc.identifier.other': [{'value': 'AV00571-2002'}],  # CID
            'dc.type': [{'value': 'Audio'}],
            'dc.format': [{'value': 'audio/mpeg'}],
            'dc.format.extent': [{'value': '1 ካሴት, 60 ደቂቃ, 11*7 ሳ.ሜ', 'language': 'am'}],
            'dc.subject': [{'value': 'ዘፈን ባህላዊ', 'language': 'am'}],
        }
    },
    {
        'title': [{'value': 'የአዲስ አበባ ታሪክ - ዘጋቢ ፊልም', 'language': 'am'}],
        'authors': [{'value': 'ሳሙኤል ተስፋዬ', 'language': 'am'}],
        'date_issued': [{'value': '2010'}],
        'subjects': [
            {'value': 'ዘጋቢ ፊልም', 'language': 'am'},
            {'value': 'አዲስ አበባ', 'language': 'am'}
        ],
        'description': [{'value': 'የአዲስ አበባ ከተማ ታሪክ የሚያሳይ ዘጋቢ ፊልም።', 'language': 'am'}],
        'type': [{'value': 'Video'}],
        'language': [{'value': 'am'}],
        'multimedia_metadata': {
            'dc.identifier.other': [{'value': 'VD00234-2010'}],
            'dc.type': [{'value': 'Video'}],
            'dc.format': [{'value': 'video/mp4'}],
            'dc.format.extent': [{'value': '1 DVD, 90 ደቂቃ', 'language': 'am'}],
        }
    },
    {
        'title': [{'value': 'የኢትዮጵያ ባህላዊ ምግቦች - ፎቶ ስብስብ', 'language': 'am'}],
        'authors': [{'value': 'ብርሃኑ ወልደ', 'language': 'am'}],
        'date_issued': [{'value': '2015'}],
        'subjects': [
            {'value': 'ፎቶግራፍ', 'language': 'am'},
            {'value': 'ባህላዊ ምግብ', 'language': 'am'}
        ],
        'description': [{'value': 'የኢትዮጵያ ባህላዊ ምግቦች ፎቶግራፍ ስብስብ።', 'language': 'am'}],
        'type': [{'value': 'Image'}],
        'language': [{'value': 'am'}],
        'multimedia_metadata': {
            'dc.identifier.other': [{'value': 'PH00456-2015'}],
            'dc.type': [{'value': 'Image'}],
            'dc.format': [{'value': 'image/jpeg'}],
            'dc.format.extent': [{'value': '50 ፎቶዎች', 'language': 'am'}],
        }
    }
]

SERIAL_ITEMS = [
    {
        'title': [{'value': 'አዲስ ዘመን - ጋዜጣ', 'language': 'am'}],
        'authors': [{'value': 'የአዲስ ዘመን አዘጋጆች', 'language': 'am'}],
        'date_issued': [{'value': '2012-01-15'}],
        'subjects': [
            {'value': 'ጋዜጣ', 'language': 'am'},
            {'value': 'ዜና', 'language': 'am'}
        ],
        'description': [{'value': 'የአዲስ ዘመን ዕለታዊ ጋዜጣ።', 'language': 'am'}],
        'type': [{'value': 'Newspaper'}],
        'language': [{'value': 'am'}],
        'serial_metadata': {
            'dc.identifier.other': [{'value': '182756'}],  # CID
            'dc.identifier.other': [{'value': '079.63/አዲስ/2012'}],  # Classification
            'dc.publisher': [{'value': 'የአዲስ ዘመን ማተሚያ ቤት', 'language': 'am'}],
            'dc.format.extent': [{'value': 'በቅጽና፣ በቁጥር፣ ፎቶ፣ ሥዕል፣ 44 ሳ.ሜ', 'language': 'am'}],
            'dc.description': [{'value': 'ዋጋ ብር 13.00', 'language': 'am'}],
        }
    },
    {
        'title': [{'value': 'የኢትዮጵያ ህክምና ጆርናል', 'language': 'am'}],
        'authors': [
            {'value': 'ዶ/ር ሙሉጌታ ገብሬ', 'language': 'am'},
            {'value': 'ዶ/ር ሳራ መኮንን', 'language': 'am'}
        ],
        'date_issued': [{'value': '2018-06-01'}],
        'subjects': [
            {'value': 'ህክምና', 'language': 'am'},
            {'value': 'ጆርናል', 'language': 'am'}
        ],
        'description': [{'value': 'የኢትዮጵያ ህክምና ጆርናል - ወር ሁለት ጊዜ የሚወጣ።', 'language': 'am'}],
        'type': [{'value': 'Journal'}],
        'language': [{'value': 'am'}],
        'serial_metadata': {
            'dc.identifier.other': [{'value': '234567'}],
            'dc.identifier.other': [{'value': '610/ኢትዮ/2018'}],
            'dc.publisher': [{'value': 'የኢትዮጵያ ህክምና ማህበር', 'language': 'am'}],
            'dc.format.extent': [{'value': '120 ገጾች፣ ሥዕሎች፣ 28 ሳ.ሜ', 'language': 'am'}],
        }
    },
    {
        'title': [{'value': 'ሪፖርተር - ሳምንታዊ መጽሔት', 'language': 'am'}],
        'authors': [{'value': 'የሪፖርተር አዘጋጆች', 'language': 'am'}],
        'date_issued': [{'value': '2020-03-20'}],
        'subjects': [
            {'value': 'መጽሔት', 'language': 'am'},
            {'value': 'ዜና እና ትንታኔ', 'language': 'am'}
        ],
        'description': [{'value': 'ሪፖርተር ሳምንታዊ መጽሔት - ዜና እና ትንታኔ።', 'language': 'am'}],
        'type': [{'value': 'Magazine'}],
        'language': [{'value': 'am'}],
        'serial_metadata': {
            'dc.identifier.other': [{'value': '345678'}],
            'dc.identifier.other': [{'value': '070/ሪፖ/2020'}],
            'dc.publisher': [{'value': 'ሪፖርተር ማተሚያ ቤት', 'language': 'am'}],
            'dc.format.extent': [{'value': '64 ገጾች፣ ፎቶዎች፣ 32 ሳ.ሜ', 'language': 'am'}],
        }
    }
]

PRINTED_ITEMS = [
    {
        'title': [{'value': 'የኢትዮጵያ ታሪክ', 'language': 'am'}],
        'authors': [
            {'value': 'ፕሮፌሰር ታደሰ በየነ', 'language': 'am'},
            {'value': 'ዶ/ር አለማየሁ ሞገስ', 'language': 'am'}
        ],
        'date_issued': [{'value': '2005-09-15'}],
        'subjects': [
            {'value': 'ታሪክ', 'language': 'am'},
            {'value': 'ኢትዮጵያ', 'language': 'am'}
        ],
        'description': [{'value': 'ከጥንት ዘመን እስከ ዘመናዊ ኢትዮጵያ የሚዘረጋ የታሪክ መጽሐፍ።', 'language': 'am'}],
        'type': [{'value': 'Book'}],
        'language': [{'value': 'am'}],
        'printed_metadata': {
            'dc.identifier.other': [{'value': '955637'}],  # CID
            'dc.identifier.other': [{'value': 'BK2005-001'}],  # Accession Number
            'dc.title.alternative': [{'value': 'ከጥንት እስከ ዘመናዊ ዘመን', 'language': 'am'}],
            'dc.format.extent': [{'value': '456 ገጾች', 'language': 'am'}],
        }
    },
    {
        'title': [{'value': 'የአማርኛ ሰዋስው', 'language': 'am'}],
        'authors': [{'value': 'ዶ/ር ግርማ አወቀ ደምሴ', 'language': 'am'}],
        'date_issued': [{'value': '2010-03-01'}],
        'subjects': [
            {'value': 'ቋንቋ', 'language': 'am'},
            {'value': 'ሰዋስው', 'language': 'am'}
        ],
        'description': [{'value': 'የአማርኛ ቋንቋ ሰዋስው እና አጠቃቀም መመሪያ።', 'language': 'am'}],
        'type': [{'value': 'Book'}],
        'language': [{'value': 'am'}],
        'printed_metadata': {
            'dc.identifier.other': [{'value': '856234'}],
            'dc.identifier.other': [{'value': 'BK2010-045'}],
            'dc.title.alternative': [{'value': 'ሰዋስው እና አጠቃቀም', 'language': 'am'}],
            'dc.format.extent': [{'value': '324 ገጾች', 'language': 'am'}],
        }
    },
    {
        'title': [{'value': 'የኢትዮጵያ ባህል እና ወግ', 'language': 'am'}],
        'authors': [{'value': 'ፕሮፌሰር አበበ ክብረት', 'language': 'am'}],
        'date_issued': [{'value': '2015-11-20'}],
        'subjects': [
            {'value': 'ባህል', 'language': 'am'},
            {'value': 'ወግ', 'language': 'am'}
        ],
        'description': [{'value': 'የኢትዮጵያ ባህላዊ ወጎች እና ልማዶች ጥናት።', 'language': 'am'}],
        'type': [{'value': 'Book'}],
        'language': [{'value': 'am'}],
        'printed_metadata': {
            'dc.identifier.other': [{'value': '923456'}],
            'dc.identifier.other': [{'value': 'BK2015-078'}],
            'dc.title.alternative': [{'value': 'ባህላዊ ወጎች እና ልማዶች', 'language': 'am'}],
            'dc.format.extent': [{'value': '512 ገጾች', 'language': 'am'}],
        }
    }
]

# Collection UUIDs - Actual collections within each community
# Archive Community -> Archival File collection
# Multimedia Community -> Music collection  
# Serial Community -> Journal collection
# Printed Material Community -> Book collection
COLLECTIONS = {
    'archive': '9392a2a6-be45-4c72-b769-dcbccb7801a8',  # Archival File
    'multimedia': 'fcff2da5-9bbf-401d-ae9c-c5f6dca52f40',  # Music
    'serial': 'b1614716-2a47-4685-b36f-3a93b3f00885',  # Journal
    'printed': '19c27d17-e303-4e8e-be25-11898fdbe0fc'  # Book
}


def seed_items():
    """Main function to seed items into DSpace"""
    client = DSpaceClient(DSPACE_API_URL, DSPACE_EMAIL, DSPACE_PASSWORD)
    
    if not client.login():
        print("Failed to login. Exiting.")
        return
    
    print("\n" + "="*60)
    print("Starting DSpace Item Seeding")
    print("="*60 + "\n")
    
    # Seed Archive items
    print("\n--- Seeding Archive Items ---")
    for i, item_data in enumerate(ARCHIVE_ITEMS, 1):
        print(f"\n[{i}/3] Creating Archive Item: {item_data['title'][0]['value']}")
        workspace_item = client.create_workspace_item(COLLECTIONS['archive'])
        if workspace_item:
            client.add_metadata(workspace_item['id'], item_data)
            client.upload_file(workspace_item['id'], FILE_PATH)
    
    # Seed Multimedia items
    print("\n--- Seeding Multimedia Items ---")
    for i, item_data in enumerate(MULTIMEDIA_ITEMS, 1):
        print(f"\n[{i}/3] Creating Multimedia Item: {item_data['title'][0]['value']}")
        workspace_item = client.create_workspace_item(COLLECTIONS['multimedia'])
        if workspace_item:
            client.add_metadata(workspace_item['id'], item_data)
            client.upload_file(workspace_item['id'], FILE_PATH)
    
    # Seed Serial items
    print("\n--- Seeding Serial Items ---")
    for i, item_data in enumerate(SERIAL_ITEMS, 1):
        print(f"\n[{i}/3] Creating Serial Item: {item_data['title'][0]['value']}")
        workspace_item = client.create_workspace_item(COLLECTIONS['serial'])
        if workspace_item:
            client.add_metadata(workspace_item['id'], item_data)
            client.upload_file(workspace_item['id'], FILE_PATH)
    
    # Seed Printed items
    print("\n--- Seeding Printed Material Items ---")
    for i, item_data in enumerate(PRINTED_ITEMS, 1):
        print(f"\n[{i}/3] Creating Printed Item: {item_data['title'][0]['value']}")
        workspace_item = client.create_workspace_item(COLLECTIONS['printed'])
        if workspace_item:
            client.add_metadata(workspace_item['id'], item_data)
            client.upload_file(workspace_item['id'], FILE_PATH)
    
    print("\n" + "="*60)
    print("Seeding Complete!")
    print("="*60)
    print("\nNote: Items are created in workflow. You may need to approve them")
    print("through the DSpace admin interface to make them publicly visible.")


if __name__ == '__main__':
    seed_items()
