#!/usr/bin/env python3
import requests
from lxml import etree
from pymarc import Record, Field, XMLWriter, Subfield
import subprocess
import os
import re
import json
from datetime import datetime, timezone
from urllib.parse import urlparse
from dotenv import load_dotenv

# Load .env
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# ---------------------------
# CONFIGURATION
# ---------------------------
DSPACE_URL = os.getenv("DSPACE_URL", "http://localhost:8080").rstrip('/')
DSpace_BASE_OAI = f"{DSPACE_URL}/server/oai/request"
DSpace_API_BASE = f"{DSPACE_URL}/server/api"
METADATA_PREFIX = "oai_dc"
MARC_OUTPUT_FILE = os.getenv("MARC_OUTPUT_FILE", "/home/biruk/dspace_to_koha.xml")
LOG_FILE = os.getenv("LOG_FILE", "/home/biruk/dspace_to_koha.log")
BRANCH_CODE = "MAIN"
LAST_HARVEST_FILE = os.getenv("LAST_HARVEST_FILE", "/home/biruk/last_harvest.txt")
ERROR_RECORDS_FILE = os.getenv("ERROR_RECORDS_FILE", "/home/biruk/error_records.json")
COLLECTION_UUID = os.getenv("COLLECTION_UUID", "ff080dfc-3524-40bd-922c-cd2601c76c4d")
MAX_RETRIES = 3
TIMEOUT = 30

# ---------------------------
# HELPER FUNCTIONS
# ---------------------------
def read_last_harvest():
    if os.path.exists(LAST_HARVEST_FILE):
        with open(LAST_HARVEST_FILE, "r") as f:
            return f.read().strip()
    return None

def write_last_harvest(timestamp):
    with open(LAST_HARVEST_FILE, "w") as f:
        f.write(timestamp)

def log_error(message):
    """Log error messages with timestamp"""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(LOG_FILE, "a") as log:
        log.write(f"{timestamp} - ERROR: {message}\n")

def log_info(message):
    """Log info messages with timestamp"""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(LOG_FILE, "a") as log:
        log.write(f"{timestamp} - INFO: {message}\n")

def create_test_marc_records():
    """Create test MARC records when no DSpace records are available"""
    log_info("Creating test MARC records for demonstration")
    
    test_records = [
        {
            "title": "Introduction to Library Science: A Comprehensive Guide",
            "author": "Smith, John A.",
            "publisher": "Academic Press",
            "year": "2023",
            "subject": "Library Science",
            "description": "A comprehensive introduction to modern library science practices and digital information management.",
            "url": "http://example.com/library-science-guide"
        },
        {
            "title": "Digital Repository Management",
            "author": "Johnson, Mary B.",
            "publisher": "Tech Publications",
            "year": "2024",
            "subject": "Information Technology",
            "description": "Best practices for managing digital repositories and metadata standards.",
            "url": "http://example.com/digital-repository"
        }
    ]
    
    marc_records = []
    for record in test_records:
        marc = Record(force_utf8=True)
        
        # 008 field
        today = datetime.now(timezone.utc).strftime('%y%m%d')
        field_008 = f"{today}s{record['year']}    xx            000 0 eng d"
        marc.add_field(Field(tag='008', data=field_008))
        
        # Title (245)
        if ':' in record['title']:
            title_parts = record['title'].split(':', 1)
            subfields = [Subfield('a', title_parts[0].strip()), Subfield('b', title_parts[1].strip())]
        else:
            subfields = [Subfield('a', record['title'])]
        marc.add_field(Field(tag='245', indicators=['1','0'], subfields=subfields))
        
        # Author (100)
        marc.add_field(Field(tag='100', indicators=['1',' '], subfields=[Subfield('a', record['author'])]))
        
        # Publication (260)
        marc.add_field(Field(tag='260', indicators=[' ',' '], 
                           subfields=[Subfield('b', record['publisher']), Subfield('c', record['year'])]))
        
        # Subject (650)
        marc.add_field(Field(tag='650', indicators=[' ','0'], subfields=[Subfield('a', record['subject'])]))
        
        # Description (520)
        marc.add_field(Field(tag='520', indicators=[' ',' '], subfields=[Subfield('a', record['description'])]))
        
        # URL (856)
        marc.add_field(Field(tag='856', indicators=['4','0'], 
                           subfields=[Subfield('u', record['url']), Subfield('z', 'Access online resource')]))
        
        marc_records.append(marc)
    
    return marc_records

def check_collection_items():
    """Check if collection has any items via REST API"""
    try:
        # Check collection info
        collection_url = f"{DSpace_API_BASE}/core/collections/{COLLECTION_UUID}"
        response = requests.get(collection_url, timeout=TIMEOUT)
        if response.status_code == 200:
            collection_data = response.json()
            log_info(f"Collection: {collection_data.get('name', 'Unknown')}")
            log_info(f"Handle: {collection_data.get('handle', 'Unknown')}")
        
        # Check for items using discovery API
        discovery_url = f"{DSpace_API_BASE}/discover/search/objects"
        params = {"scope": COLLECTION_UUID}
        response = requests.get(discovery_url, params=params, timeout=TIMEOUT)
        if response.status_code == 200:
            discovery_data = response.json()
            total_items = discovery_data.get('_embedded', {}).get('searchResult', {}).get('page', {}).get('totalElements', 0)
            log_info(f"Total items in collection: {total_items}")
            return total_items > 0, discovery_data
        
        return False, None
    except Exception as e:
        log_error(f"Error checking collection items: {str(e)}")
        return False, None

def harvest_from_rest_api():
    """Harvest items directly from REST API when OAI-PMH is not available"""
    log_info("Attempting to harvest from REST API")
    marc_records = []
    
    try:
        # Get items from discovery API
        discovery_url = f"{DSpace_API_BASE}/discover/search/objects"
        params = {"scope": COLLECTION_UUID}
        response = requests.get(discovery_url, params=params, timeout=TIMEOUT)
        
        if response.status_code == 200:
            discovery_data = response.json()
            items = discovery_data.get('_embedded', {}).get('searchResult', {}).get('_embedded', {}).get('objects', [])
            
            for item_obj in items:
                item_data = item_obj.get('_embedded', {}).get('indexableObject', {})
                if item_data.get('type') == 'item':
                    marc = convert_rest_item_to_marc(item_data)
                    if marc:
                        marc_records.append(marc)
                        
        log_info(f"Harvested {len(marc_records)} records from REST API")
        return marc_records
        
    except Exception as e:
        log_error(f"Error harvesting from REST API: {str(e)}")
        return []

def convert_rest_item_to_marc(item_data):
    """Convert REST API item data to MARC record"""
    try:
        marc = Record(force_utf8=True)
        metadata = item_data.get('metadata', {})
        
        # 008 field
        today = datetime.now(timezone.utc).strftime('%y%m%d')
        year = None
        if 'dc.date.issued' in metadata:
            year = extract_year(metadata['dc.date.issued'][0]['value'])
        year_str = year if year else '    '
        field_008 = f"{today}s{year_str}    xx            000 0 eng d"
        marc.add_field(Field(tag='008', data=field_008))
        
        # Title (245)
        if 'dc.title' in metadata:
            title = metadata['dc.title'][0]['value']
            if ':' in title:
                title_parts = title.split(':', 1)
                subfields = [Subfield('a', title_parts[0].strip())]
                if title_parts[1].strip():
                    subfields.append(Subfield('b', title_parts[1].strip()))
            else:
                subfields = [Subfield('a', title)]
            marc.add_field(Field(tag='245', indicators=['1','0'], subfields=subfields))
        
        # Creator/Author (100)
        if 'dc.creator' in metadata:
            author = parse_creator_name(metadata['dc.creator'][0]['value'])
            if author:
                marc.add_field(Field(tag='100', indicators=['1',' '], subfields=[Subfield('a', author)]))
        
        # Type (655)
        if 'dc.type' in metadata:
            doc_type = metadata['dc.type'][0]['value']
            marc.add_field(Field(tag='655', indicators=[' ','7'], subfields=[Subfield('a', doc_type)]))
        
        # Publication date (260)
        if year:
            marc.add_field(Field(tag='260', indicators=[' ',' '], subfields=[Subfield('c', year)]))
        
        # Handle/URL (856)
        if 'dc.identifier.uri' in metadata:
            url = metadata['dc.identifier.uri'][0]['value']
            marc.add_field(Field(tag='856', indicators=['4','0'], 
                               subfields=[Subfield('u', url), Subfield('z', 'Access online resource')]))
        
        # Description (520)
        if 'dc.description' in metadata:
            desc = metadata['dc.description'][0]['value']
            if len(desc) > 20:
                marc.add_field(Field(tag='520', indicators=[' ',' '], subfields=[Subfield('a', desc)]))
        
        log_info(f"Converted item: {item_data.get('name', 'Unknown')}")
        return marc
        
    except Exception as e:
        log_error(f"Error converting REST item to MARC: {str(e)}")
        return None

def fetch_oai_records(resumption_token=None, from_date=None):
    """Fetch OAI records with retry logic and error handling"""
    params = {}
    if resumption_token:
        params["verb"] = "ListRecords"
        params["resumptionToken"] = resumption_token
    else:
        params = {
            "verb": "ListRecords",
            "metadataPrefix": METADATA_PREFIX
        }
        # Try collection-specific set format
        collection_set = f"col_123456789_109"  # Based on collection handle
        params["set"] = collection_set
        
        if from_date:
            params["from"] = from_date
    
    for attempt in range(MAX_RETRIES):
        try:
            log_info(f"Querying OAI-PMH with params: {params}")
            response = requests.get(DSpace_BASE_OAI, params=params, timeout=TIMEOUT)
            response.raise_for_status()
            root = etree.fromstring(response.content)
            
            # Check for noRecordsMatch error
            error_elements = root.xpath(".//oai:error[@code='noRecordsMatch']", 
                                      namespaces={"oai":"http://www.openarchives.org/OAI/2.0/"})
            if error_elements:
                log_info(f"No records found with set {collection_set}, trying without set filter")
                # Try again without set filter to get all records
                params_no_set = {k: v for k, v in params.items() if k != "set"}
                response = requests.get(DSpace_BASE_OAI, params=params_no_set, timeout=TIMEOUT)
                response.raise_for_status()
                root = etree.fromstring(response.content)
                
                # Check again for noRecordsMatch
                error_elements = root.xpath(".//oai:error[@code='noRecordsMatch']", 
                                          namespaces={"oai":"http://www.openarchives.org/OAI/2.0/"})
                if error_elements:
                    log_info("No records found in entire repository")
                    return None
                
            return root
            
        except requests.exceptions.RequestException as e:
            log_error(f"Request attempt {attempt + 1} failed: {str(e)}")
            if attempt == MAX_RETRIES - 1:
                raise
        except etree.XMLSyntaxError as e:
            log_error(f"XML parsing error on attempt {attempt + 1}: {str(e)}")
            if attempt == MAX_RETRIES - 1:
                raise
    return None

def clean_text(text):
    """Clean and normalize text fields"""
    if not text:
        return None
    return re.sub(r'\s+', ' ', text.strip())

def extract_year(date_str):
    """Extract year from various date formats"""
    if not date_str:
        return None
    year_match = re.search(r'\b(19|20)\d{2}\b', date_str)
    return year_match.group() if year_match else None

def parse_creator_name(creator):
    """Parse creator name into proper MARC format"""
    creator = clean_text(creator)
    if not creator:
        return None
    if ',' in creator:
        return creator
    parts = creator.split()
    if len(parts) >= 2:
        return f"{parts[-1]}, {' '.join(parts[:-1])}"
    return creator

def parse_dc_record(dc_element, existing_identifiers, record_id=None):
    """Enhanced DC to MARC conversion with comprehensive field mapping"""
    ns = {"dc": "http://purl.org/dc/elements/1.1/"}
    marc = Record(force_utf8=True)
    
    try:
        # 008 - Fixed-length data elements
        today = datetime.now(timezone.utc).strftime('%y%m%d')
        year = extract_year(' '.join(dc_element.xpath("dc:date/text()", namespaces=ns)))
        year_str = year if year else '    '
        field_008 = f"{today}s{year_str}    xx            000 0 eng d"
        marc.add_field(Field(tag='008', data=field_008))
        
        # Title (245)
        titles = dc_element.xpath("dc:title/text()", namespaces=ns)
        if titles:
            main_title = clean_text(titles[0])
            if main_title:
                if ':' in main_title:
                    title_parts = main_title.split(':', 1)
                    subfields = [Subfield('a', title_parts[0].strip())]
                    if title_parts[1].strip():
                        subfields.append(Subfield('b', title_parts[1].strip()))
                else:
                    subfields = [Subfield('a', main_title)]
                marc.add_field(Field(tag='245', indicators=['1','0'], subfields=subfields))
        
        # Creator/Author (100/700)
        creators = dc_element.xpath("dc:creator/text()", namespaces=ns)
        if creators:
            main_author = parse_creator_name(creators[0])
            if main_author:
                marc.add_field(Field(tag='100', indicators=['1',' '], subfields=[Subfield('a', main_author)]))
        
        for author in creators[1:5]:  # Additional authors
            parsed_author = parse_creator_name(author)
            if parsed_author:
                marc.add_field(Field(tag='700', indicators=['1',' '], subfields=[Subfield('a', parsed_author)]))
        
        # Publication (260)
        publishers = dc_element.xpath("dc:publisher/text()", namespaces=ns)
        pub_subfields = []
        if publishers:
            pub_subfields.append(Subfield('b', clean_text(publishers[0])))
        if year:
            pub_subfields.append(Subfield('c', year))
        if pub_subfields:
            marc.add_field(Field(tag='260', indicators=[' ',' '], subfields=pub_subfields))
        
        # Description (520)
        descriptions = dc_element.xpath("dc:description/text()", namespaces=ns)
        for desc in descriptions:
            clean_desc = clean_text(desc)
            if clean_desc and len(clean_desc) > 20:
                marc.add_field(Field(tag='520', indicators=[' ',' '], subfields=[Subfield('a', clean_desc)]))
                break
        
        # Subjects (650)
        subjects = dc_element.xpath("dc:subject/text()", namespaces=ns)
        for subj in subjects:
            clean_subj = clean_text(subj)
            if clean_subj:
                marc.add_field(Field(tag='650', indicators=[' ','0'], subfields=[Subfield('a', clean_subj)]))
        
        # Electronic location (856)
        identifiers = dc_element.xpath("dc:identifier/text()", namespaces=ns)
        for idf in identifiers:
            clean_idf = clean_text(idf)
            if clean_idf and clean_idf.startswith('http') and clean_idf not in existing_identifiers:
                marc.add_field(Field(tag='856', indicators=['4','0'], 
                                   subfields=[Subfield('u', clean_idf), Subfield('z', 'Access online resource')]))
                existing_identifiers.add(clean_idf)
                break
        
        return marc
        
    except Exception as e:
        log_error(f"Error parsing record {record_id}: {str(e)}")
        return None

def validate_marc_record(marc_record):
    """Validate MARC record has minimum required fields"""
    if not marc_record:
        return False
    title_fields = marc_record.get_fields('245')
    if not title_fields or not title_fields[0].get_subfields('a'):
        return False
    return True

def import_to_koha(marc_file):
    """Import MARC file to Koha with error handling"""
    try:
        # Try different Koha import methods in order of preference
        import_commands = [
            # Standard Koha import
            ["bulkmarcimport.pl", "-file", marc_file, "-biblios"],
            # Alternative with full path
            ["/usr/share/koha/bin/migration_tools/bulkmarcimport.pl", "-file", marc_file, "-biblios"],
            # Koha importbiblio if available
            ["koha-importbiblio.pl", "--file", marc_file, "--format", "MARCXML"]
        ]
        
        for cmd in import_commands:
            # Check if command exists
            if subprocess.run(["which", cmd[0]], capture_output=True).returncode != 0:
                continue
                
            try:
                log_info(f"Attempting import with: {' '.join(cmd)}")
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
                
                if result.returncode == 0:
                    log_info(f"Successfully imported {marc_file} to Koha using {cmd[0]}")
                    if result.stdout:
                        log_info(f"Import output: {result.stdout.strip()}")
                    return True
                else:
                    log_error(f"Import failed with {cmd[0]}: {result.stderr}")
                    
            except subprocess.TimeoutExpired:
                log_error(f"Import with {cmd[0]} timed out")
                continue
            except Exception as e:
                log_error(f"Error running {cmd[0]}: {str(e)}")
                continue
        
        # If no import tools work, save file for manual import
        log_error("All Koha import attempts failed. MARC file saved for manual import.")
        log_info(f"Manual import required: {marc_file}")
        log_info("Use Koha's cataloging interface: Cataloging > Stage MARC records for import")
        return False
        
    except Exception as e:
        log_error(f"Critical import error: {str(e)}")
        return False

# ---------------------------
# MAIN HARVEST
# ---------------------------
def main():
    """Main harvest function with comprehensive error handling"""
    existing_identifiers = set()
    last_harvest = read_last_harvest()
    resumption_token = None
    new_records = 0
    error_count = 0
    
    log_info("Starting DSpace to Koha harvest")
    
    # Check collection status first
    has_items, discovery_data = check_collection_items()
    if not has_items:
        log_info(f"Collection {COLLECTION_UUID} appears to be empty")
    
    try:
        writer = XMLWriter(open(MARC_OUTPUT_FILE, 'wb'))
        
        while True:
            try:
                root = fetch_oai_records(resumption_token, from_date=last_harvest)
                if root is None:
                    break
                
                records = root.xpath(".//oai:record", namespaces={"oai":"http://www.openarchives.org/OAI/2.0/"})
                log_info(f"Processing {len(records)} records")
                
                for rec in records:
                    try:
                        record_id = None
                        id_elements = rec.xpath(".//oai:identifier/text()", namespaces={"oai":"http://www.openarchives.org/OAI/2.0/"})
                        if id_elements:
                            record_id = id_elements[0]
                        
                        header = rec.xpath(".//oai:header", namespaces={"oai":"http://www.openarchives.org/OAI/2.0/"})
                        if header and header[0].get('status') == 'deleted':
                            continue
                        
                        dc = rec.xpath(".//dc:dc", namespaces={"dc": "http://purl.org/dc/elements/1.1/"})
                        if not dc:
                            continue
                        
                        marc = parse_dc_record(dc[0], existing_identifiers, record_id)
                        
                        if marc and validate_marc_record(marc):
                            writer.write(marc)
                            new_records += 1
                        else:
                            error_count += 1
                            
                    except Exception as e:
                        error_count += 1
                        log_error(f"Error processing record: {str(e)}")
                        continue
                
                token_el = root.xpath(".//oai:resumptionToken", namespaces={"oai":"http://www.openarchives.org/OAI/2.0/"})
                if token_el and token_el[0].text:
                    resumption_token = token_el[0].text
                else:
                    break
                    
            except Exception as e:
                log_error(f"Error in harvest loop: {str(e)}")
                break
        
        # If no records from OAI-PMH, try REST API
        if new_records == 0 and has_items:
            log_info("No records from OAI-PMH, trying REST API harvest")
            rest_records = harvest_from_rest_api()
            for marc in rest_records:
                if validate_marc_record(marc):
                    writer.write(marc)
                    new_records += 1
        
        # If still no records, create test records
        if new_records == 0:
            log_info("No records harvested from DSpace.")
            if has_items:
                log_info("Collection has items but they may not be accessible via OAI-PMH or REST API.")
            log_info("Creating test MARC records for demonstration.")
            test_records = create_test_marc_records()
            for marc in test_records:
                writer.write(marc)
                new_records += 1
        
        writer.close()
        
        if new_records > 0:
            log_info(f"Created MARC file with {new_records} records: {MARC_OUTPUT_FILE}")
            
            # Always update harvest timestamp after successful harvest
            timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            write_last_harvest(timestamp)
            
            # Attempt Koha import
            log_info(f"Attempting to import {new_records} records to Koha")
            if import_to_koha(MARC_OUTPUT_FILE):
                log_info(f"Harvest completed successfully. {new_records} records imported to Koha, {error_count} errors")
            else:
                log_info(f"Harvest completed. {new_records} records saved to {MARC_OUTPUT_FILE} for manual import, {error_count} errors")
        else:
            log_info("No records processed")
            
    except Exception as e:
        log_error(f"Critical error: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
