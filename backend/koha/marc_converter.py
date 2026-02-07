"""
MARC21 Converter for DSpace Metadata
Converts DSpace metadata to MARC21 format for Koha cataloging
"""

import datetime

def dspace_to_marc21(dspace_item, dspace_handle_url):
    """
    Convert DSpace item metadata to MARC21 format
    
    Args:
        dspace_item: DSpace item object with metadata
        dspace_handle_url: Full URL to DSpace item
    
    Returns:
        dict: MARC21 data in marc-in-json format
    """
    metadata = dspace_item.get('metadata', {})
    
    # Helper to clean strings
    def clean(text):
        if not text:
            return ""
        return str(text).strip()

    # Helper function to get first value from metadata
    def get_first(field_name):
        values = metadata.get(field_name, [])
        val = values[0].get('value', '') if values else ''
        return clean(val)
    
    # Helper function to get all values from metadata
    def get_all(field_name):
        values = metadata.get(field_name, [])
        return [clean(v.get('value', '')) for v in values if v.get('value')]
    
    # Extract basic metadata
    title = get_first('dc.title') or get_first('dc.title.prtitle') or 'Untitled'
    authors = get_all('dc.contributor.author')
    publisher = get_first('dc.publisher')
    pub_place = get_first('dc.publisher.place')
    pub_date = get_first('dc.date.issued') or get_first('local.accession.date')
    isbn = get_first('dc.identifier.isbn')
    issn = get_first('dc.identifier.issn')
    edition = get_first('dc.description.edition')
    physical_desc = get_first('dc.description.physical') or get_first('dc.format.extent')
    series = get_first('dc.relation.ispartofseries')
    abstract = get_first('dc.description.abstract') or get_first('dc.description')
    subjects = get_all('dc.subject')
    language = get_first('dc.language') or get_first('dc.language.iso')
    
    # Archive-specific fields
    provenance = get_first('dc.provenance')
    security = get_first('local.archival.security')
    accession_means = get_first('local.accession.means')
    arrangement = get_first('local.arrangement.level')
    
    # Multimedia-specific fields
    duration = get_first('dc.format.extent')
    composer = get_first('dc.contributor.composer')
    singer = get_first('dc.contributor.singer')
    
    # === Generate Control Fields ===
    now = datetime.datetime.now()
    
    # 005 - Date and Time of Latest Transaction
    # Format: YYYYMMDDHHMMSS.0
    field_005 = now.strftime("%Y%m%d%H%M%S.0")
    
    # 008 - Fixed-Length Data Elements
    # 00-05: Date entered (YYMMDD)
    date_entered = now.strftime("%y%m%d")
    # 06: Type of date (s = single known date/probable date)
    date_type = 's'
    # 07-10: Date 1 (Year)
    year_str = pub_date[:4] if pub_date and len(pub_date) >= 4 and pub_date[:4].isdigit() else now.strftime("%Y")
    # 11-14: Date 2 (spaces)
    date2 = "    "
    # 15-17: Place of publication code (xx = unknown)
    place_code = "xx "
    # 18-34: Fixed length data elements (using pipes for 'no attempt to code')
    # This is safe for Koha, as it will interpret them as undefined
    fixed_data = "|||||||||||||||||"
    # 35-37: Language code
    lang_code = (language[:3].lower() if language else "eng").ljust(3)
    # 38: Modified record
    modified = " "
    # 39: Cataloging source (d = other)
    source = "d"
    
    field_008 = f"{date_entered}{date_type}{year_str}{date2}{place_code}{fixed_data}{lang_code}{modified}{source}"
    
    # Build MARC21 fields list
    fields = []
    
    # Add Control Fields
    fields.append({"008": field_008})
    fields.append({"005": field_005})
    
    # 040 - Cataloging Source
    fields.append({
        "040": {
            "ind1": " ",
            "ind2": " ",
            "subfields": [
                {"a": "DSpace"},
                {"c": "DSpace"}
            ]
        }
    })
    
    # 020 - ISBN
    if isbn:
        fields.append({
            "020": {
                "ind1": " ",
                "ind2": " ",
                "subfields": [{"a": isbn}]
            }
        })
    
    # 022 - ISSN
    if issn:
        fields.append({
            "022": {
                "ind1": " ",
                "ind2": " ",
                "subfields": [{"a": issn}]
            }
        })
    
    # 041 - Language Code
    if language:
        fields.append({
            "041": {
                "ind1": "0",
                "ind2": " ",
                "subfields": [{"a": lang_code}]
            }
        })
    
    # 100 - Main Author
    if authors:
        fields.append({
            "100": {
                "ind1": "1",
                "ind2": " ",
                "subfields": [{"a": authors[0]}]
            }
        })
    
    # 245 - Title is MANDATORY
    title_subfields = [{"a": title}]
    if authors:
        try:
            # Join all authors for statement of responsibility
            stmt_resp = " / ".join(authors)
            title_subfields.append({"c": stmt_resp})
        except:
            pass
            
    fields.append({
        "245": {
            "ind1": "1",
            "ind2": "0",
            "subfields": title_subfields
        }
    })
    
    # 250 - Edition
    if edition:
        fields.append({
            "250": {
                "ind1": " ",
                "ind2": " ",
                "subfields": [{"a": edition}]
            }
        })
    
    # 260 - Publication Info
    pub_subfields = []
    if pub_place:
        pub_subfields.append({"a": pub_place})
    if publisher:
        pub_subfields.append({"b": publisher})
    if pub_date:
        pub_subfields.append({"c": pub_date})
    
    if pub_subfields:
        fields.append({
            "260": {
                "ind1": " ",
                "ind2": " ",
                "subfields": pub_subfields
            }
        })
    
    # 300 - Physical Description
    if physical_desc:
        fields.append({
            "300": {
                "ind1": " ",
                "ind2": " ",
                "subfields": [{"a": physical_desc}]
            }
        })
    
    # 306 - Duration (for multimedia)
    if duration and ('min' in duration.lower() or 'hour' in duration.lower()):
        fields.append({
            "306": {
                "ind1": " ",
                "ind2": " ",
                "subfields": [{"a": duration}]
            }
        })
    
    # 351 - Organization (for archives)
    if arrangement:
        fields.append({
            "351": {
                "ind1": " ",
                "ind2": " ",
                "subfields": [{"a": arrangement}]
            }
        })
    
    # 490 - Series
    if series:
        fields.append({
            "490": {
                "ind1": "0",
                "ind2": " ",
                "subfields": [{"a": series}]
            }
        })
    
    # 520 - Summary/Abstract (Main summary note)
    if abstract:
        fields.append({
            "520": {
                "ind1": " ",
                "ind2": " ",
                "subfields": [{"a": abstract[:2000]}]  # Reasonable limit
            }
        })
    
    # 506 - Access Restrictions (for archives)
    if security:
        fields.append({
            "506": {
                "ind1": " ",
                "ind2": " ",
                "subfields": [{"a": security}]
            }
        })
    
    # 508 - Composer (for multimedia)
    if composer:
        fields.append({
            "508": {
                "ind1": " ",
                "ind2": " ",
                "subfields": [{"a": composer}]
            }
        })
    
    # 511 - Performer (for multimedia)
    if singer:
        fields.append({
            "511": {
                "ind1": "0",
                "ind2": " ",
                "subfields": [{"a": singer}]
            }
        })
    
    # 541 - Acquisition Source (for archives)
    if accession_means:
        fields.append({
            "541": {
                "ind1": " ",
                "ind2": " ",
                "subfields": [{"a": accession_means}]
            }
        })
    
    # 561 - Provenance (for archives)
    if provenance:
        fields.append({
            "561": {
                "ind1": " ",
                "ind2": " ",
                "subfields": [{"a": provenance}]
            }
        })
    
    # 650 - Subject Headings
    if subjects:
        for subject in subjects:
            if subject:
                fields.append({
                    "650": {
                        "ind1": " ",
                        "ind2": "0",
                        "subfields": [{"a": subject}]
                    }
                })
    
    # 700 - Additional Authors
    if len(authors) > 1:
        for author in authors[1:]:  # Skip first author (already in 100)
            fields.append({
                "700": {
                    "ind1": "1",
                    "ind2": " ",
                    "subfields": [{"a": author}]
                }
            })
    
    # 856 - Digital URL (CRITICAL - Links to DSpace)
    if dspace_handle_url:
        fields.append({
            "856": {
                "ind1": "4",
                "ind2": "0",
                "subfields": [
                    {"u": dspace_handle_url},
                    {"y": "View Digital Copy in DSpace Repository"}
                ]
            }
        })
    
    # 942 - Koha Item Type (Optional but good)
    # Default to BOOK if not specified
    fields.append({
        "942": {
            "ind1": " ",
            "ind2": " ",
            "subfields": [{"c": "BOOK"}]
        }
    })

    # Build complete MARC record
    # Leader: 
    # 00-04: Record length (auto-calculated)
    # 05: Record status (n = new)
    # 06: Type of record (a = language material)
    # 07: Bibliographic level (m = monograph/item)
    # 08: Control type (space)
    # 09: Character coding (a = UCS/Unicode)
    # 10: Indicator count (2)
    # 11: Subfield code count (2)
    # 12-16: Base address (auto)
    # 17: Encoding level (u = unknown)
    # 18: Desc cataloging form (a = AACR2)
    # 19: Multipart (space)
    # 20-23: Length of length/start/impl/undef (4500)
    
    leader = "00000nam a2200000 i 4500"
    
    marc_record = {
        "leader": leader,
        "fields": fields
    }
    
    return marc_record


def extract_dspace_metadata_summary(dspace_item):
    """
    Extract key metadata from DSpace item for display/preview
    
    Returns:
        dict: Summary of key metadata fields
    """
    metadata = dspace_item.get('metadata', {})
    
    # Helper to clean strings
    def clean(text):
        if not text:
            return ""
        return str(text).strip()

    def get_first(field_name):
        values = metadata.get(field_name, [])
        val = values[0].get('value', '') if values else ''
        return clean(val)
    
    def get_all(field_name):
        values = metadata.get(field_name, [])
        return [clean(v.get('value', '')) for v in values if v.get('value')]
    
    return {
        'title': get_first('dc.title') or get_first('dc.title.prtitle'),
        'authors': get_all('dc.contributor.author'),
        'publisher': get_first('dc.publisher'),
        'date': get_first('dc.date.issued') or get_first('local.accession.date'),
        'isbn': get_first('dc.identifier.isbn'),
        'issn': get_first('dc.identifier.issn'),
        'language': get_first('dc.language') or get_first('dc.language.iso'),
        'subjects': get_all('dc.subject'),
        'abstract': get_first('dc.description.abstract') or get_first('dc.description'),
    }
