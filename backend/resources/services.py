from django.conf import settings
from .real_dspace_api import RealDSpaceAPI
from .koha_rest_api import KohaRestAPI
from .koha_integration import KohaAPI
from .real_vufind_api import RealVuFindAPI

class KohaService:
    @staticmethod
    def search_resources(query, limit=20):
        koha_api = KohaRestAPI()
        
        if koha_api.authenticate():
            # Get all biblios
            all_biblios = koha_api.search_biblios('', 50)
            
            if not query:  # If no query, return all
                return all_biblios[:limit]
            
            filtered = []
            for biblio in all_biblios:
                title = str(biblio.get('title', '')).lower()
                author = str(biblio.get('author', '')).lower()
                notes = str(biblio.get('notes', '')).lower()
                
                if (query.lower() in title or 
                    query.lower() in author or 
                    query.lower() in notes):
                    filtered.append(biblio)
                    
                if len(filtered) >= limit:
                    break
            
            return filtered
        
        print("⚠️ Koha API not available")
        return []

class DSpaceService:
    @staticmethod
    def search_resources(query, limit=20):
        dspace_api = RealDSpaceAPI()
        
        if dspace_api.authenticate():
            return dspace_api.search_items(query, limit)
        
        print("⚠️ DSpace API not available")
        return []

class VuFindService:
    @staticmethod
    def search_resources(query, limit=20):
        vufind_api = RealVuFindAPI()
        
        if vufind_api.test_connection():
            return vufind_api.search_records(query, limit)
        
        print("⚠️ VuFind API not available")
        return []

class ResourceService:
    @staticmethod
    def unified_search(query, filters=None, limit=20):
        results = []
        
        # Search Koha - REAL DATA ONLY
        try:
            koha_results = KohaService.search_resources(query, limit//2 if query else limit//2)
            for item in koha_results:
                results.append({
                    'id': f"koha_{item.get('biblio_id', '')}",
                    'title': item.get('title', 'No Title'),
                    'authors': item.get('author', ''),
                    'source': 'koha',
                    'source_name': 'Library Catalog',
                    'external_id': str(item.get('biblio_id', '')),
                    'resource_type': 'book',
                    'year': item.get('copyright_date', ''),
                    'description': item.get('abstract', ''),
                    'url': f"http://127.0.0.1:8085/cgi-bin/koha/catalogue/detail.pl?biblionumber={item.get('biblio_id', '')}",
                    'availability': 'Available'
                })
        except Exception as e:
            print(f"Koha integration error: {e}")
        
        # Search DSpace - REAL DATA ONLY
        try:
            dspace_results = DSpaceService.search_resources(query, limit//2 if query else limit//2)
            for item in dspace_results:
                obj = item.get('_embedded', {}).get('indexableObject', {})
                metadata = obj.get('metadata', {})
                
                # Extract authors
                authors = []
                for author_field in ['dc.contributor.author', 'dc.creator']:
                    if author_field in metadata:
                        authors.extend([m.get('value', '') for m in metadata[author_field]])
                
                # Extract description
                description = ''
                for desc_field in ['dc.description.abstract', 'dc.description']:
                    if desc_field in metadata and metadata[desc_field]:
                        description = metadata[desc_field][0].get('value', '')
                        break
                
                # Extract year
                year = ''
                for date_field in ['dc.date.issued', 'dc.date.created']:
                    if date_field in metadata and metadata[date_field]:
                        year_value = metadata[date_field][0].get('value', '')
                        if year_value:
                            year = year_value[:4] if len(year_value) >= 4 else year_value
                        break
                
                # Get handle or use UUID
                handle = obj.get('handle', '')
                uuid = obj.get('uuid', '')
                dspace_url = f"http://localhost:4000/handle/{handle}" if handle else f"http://localhost:4000/items/{uuid}"
                
                # Extract citation
                citation = ''
                for cit_field in ['dc.identifier.citation']:
                    if cit_field in metadata and metadata[cit_field]:
                        citation = metadata[cit_field][0].get('value', '')
                        break
                        
                # Extract publisher
                publisher = ''
                for pub_field in ['dc.publisher']:
                    if pub_field in metadata and metadata[pub_field]:
                        publisher = metadata[pub_field][0].get('value', '')
                        break

                results.append({
                    'id': f"dspace_{uuid}",
                    'title': obj.get('name', ''),
                    'authors': ', '.join(authors),
                    'source': 'dspace',
                    'source_name': 'Research Repository',
                    'external_id': handle or uuid,
                    'resource_type': obj.get('type', 'document'),
                    'year': year,
                    'publisher': publisher,
                    'citation': citation,
                    'description': description,
                    'url': dspace_url,
                    'availability': 'Open Access'
                })
        except Exception as e:
            print(f"DSpace integration error: {e}")
        
        # Search VuFind - REAL DATA ONLY
        try:
            vufind_results = VuFindService.search_resources(query, min(5, limit//4))
            for item in vufind_results:
                results.append({
                    'id': f"vufind_{item.get('id', '')}",
                    'title': item.get('title', ''),
                    'authors': ', '.join(item.get('author', [])) if isinstance(item.get('author'), list) else item.get('author', ''),
                    'source': 'vufind',
                    'source_name': 'Discovery Layer',
                    'external_id': item.get('id', ''),
                    'resource_type': item.get('format', ['Unknown'])[0] if isinstance(item.get('format'), list) else item.get('format', 'Unknown'),
                    'year': item.get('publishDate', [''])[0] if isinstance(item.get('publishDate'), list) else item.get('publishDate', ''),
                    'description': item.get('summary', [''])[0] if isinstance(item.get('summary'), list) else item.get('summary', ''),
                    'url': f"http://localhost:8090/Record/{item.get('id', '')}",
                    'availability': 'Check Availability'
                })
        except Exception as e:
            print(f"VuFind integration error: {e}")
        
        # Apply filters if provided
        if filters:
            if filters.get('source'):
                results = [r for r in results if r['source'] == filters['source']]
            if filters.get('type'):
                results = [r for r in results if r['resource_type'] == filters['type']]
            if filters.get('year'):
                results = [r for r in results if str(r.get('year', '')) == str(filters['year'])]
        
        return results[:limit]
    
    @staticmethod
    def upload_to_dspace(file, metadata, collection_uuid):
        """Upload file to real DSpace with full metadata"""
        dspace_api = RealDSpaceAPI()
        
        if not dspace_api.authenticate():
            raise Exception("DSpace authentication failed")
        
        if not collection_uuid:
            raise Exception("DSpace collection UUID is required")
        
        # Prepare DSpace metadata
        dc_metadata = {
            "dc.title": [{"value": metadata['title']}]
        }
        
        if metadata.get('resource_type'):
            dc_metadata["dc.type"] = [{"value": metadata['resource_type']}]
        
        # Handle multiple authors
        if metadata.get('authors'):
            authors = [a.strip() for a in metadata['authors'].split(',') if a.strip()]
            dc_metadata["dc.contributor.author"] = [{"value": author} for author in authors]

        # Handle multiple other titles
        if metadata.get('other_titles'):
            other_titles = [t.strip() for t in metadata['other_titles'].split(',') if t.strip()]
            dc_metadata["dc.title.alternative"] = [{"value": title} for title in other_titles]
            
        if metadata.get('publisher'):
            dc_metadata["dc.publisher"] = [{"value": metadata['publisher']}]
        if metadata.get('citation'):
            dc_metadata["dc.identifier.citation"] = [{"value": metadata['citation']}]
            
        # Handle multiple series/report numbers
        if metadata.get('series_report_no'):
            series_report_nos = [s.strip() for s in metadata['series_report_no'].split(',') if s.strip()]
            dc_metadata["dc.relation.ispartofseries"] = [{"value": sr} for sr in series_report_nos]

        # Handle identifiers
        if metadata.get('identifiers'):
            for identifier in metadata['identifiers']:
                if identifier.get('type') and identifier.get('value'):
                    dc_field = f"dc.identifier.{identifier['type'].lower()}"
                    dc_metadata[dc_field] = [{"value": identifier['value']}]

        # Handle accession number / barcode
        if metadata.get('accession_number'):
            dc_metadata.setdefault('dc.identifier.other', []).append({"value": metadata['accession_number']})

        if metadata.get('language'):
            dc_metadata["dc.language.iso"] = [{"value": metadata['language']}]
            
        if metadata.get('subject_keywords'):
            keywords = [kw.strip() for kw in metadata['subject_keywords'].split(',') if kw.strip()]
            dc_metadata["dc.subject"] = [{"value": kw} for kw in keywords]
            
        if metadata.get('abstract'):
            dc_metadata["dc.description.abstract"] = [{"value": metadata['abstract']}]
        if metadata.get('sponsors'):
            dc_metadata["dc.description.sponsorship"] = [{"value": metadata['sponsors']}]
        if metadata.get('description'):
            dc_metadata["dc.description"] = [{"value": metadata['description']}]
        
        # Build date: prefer explicit publication_date if provided, otherwise compose from year/month/day
        if metadata.get('publication_date'):
            dc_metadata["dc.date.issued"] = [{"value": metadata['publication_date']}]
        else:
            date_parts = [metadata.get('date_year', '')]
            if metadata.get('date_month'):
                date_parts.append(f"{int(metadata['date_month']):02d}")
                if metadata.get('date_day'):
                    date_parts.append(f"{int(metadata['date_day']):02d}")

            if date_parts[0]:  # If year exists
                date_issued = '-'.join(date_parts)
                dc_metadata["dc.date.issued"] = [{"value": date_issued}]
        
        # Create workspace item
        workspace_item = dspace_api.create_workspace_item(collection_uuid)
        if not workspace_item:
            # Attach debug message from DSpace API if available
            err = getattr(dspace_api, 'last_error_message', None)
            if err:
                raise Exception(f"Failed to create DSpace workspace item: {err}")
            raise Exception("Failed to create DSpace workspace item")
        
        workspace_id = workspace_item['id']
        
        # Update metadata (at least title is required for submission)
        if dc_metadata:
            success = dspace_api.update_metadata(workspace_id, dc_metadata)
            if not success:
                print("⚠️ Metadata update failed, but continuing with upload")
        else:
            print("⚠️ No metadata to update")
        
        # Upload file
        file.seek(0)
        bitstream = dspace_api.upload_file_to_workspace(workspace_id, file.read(), file.name)
        if not bitstream:
            raise Exception("Failed to upload file to DSpace")
        
        # Submit to workflow
        submitted_item = dspace_api.submit_workspace_item(workspace_id)
        if not submitted_item:
            err = getattr(dspace_api, 'last_error_message', None)
            if err:
                raise Exception(f"Failed to submit DSpace item: {err}")
            raise Exception("Failed to submit DSpace item")
        
        # Get item details from submitted item
        item_uuid = str(submitted_item.get('uuid', workspace_id))
        
        return {
            'uuid': item_uuid,
            'handle': f"123456789/{item_uuid[:8]}",
            'handle_url': f"http://localhost:4000/handle/123456789/{item_uuid[:8]}",
            'download_url': f"http://localhost:8080/server/api/core/bitstreams/{bitstream.get('uuid', '')}/content"
        }
    
    @staticmethod
    def catalog_in_koha(metadata, dspace_url):
        """Catalog item in real Koha with full metadata"""
        koha_rest_api = KohaRestAPI()
        
        if not koha_rest_api.authenticate():
            raise Exception("Koha authentication failed")
        
        # Prepare Koha metadata
        koha_metadata = {
            'title': metadata['title'],
            'authors': metadata.get('authors', ''),
            'description': metadata.get('abstract') or metadata.get('description', ''),
            'year': metadata.get('year') or metadata.get('date_year', ''),
            'subject': metadata.get('subject_keywords', ''),
            'publisher': metadata.get('publisher', ''),
            'series': metadata.get('series', ''),
            'language': metadata.get('language', 'en'),
            'resource_type': metadata.get('resource_type', 'Text'),
            'dspace_url': dspace_url,
            'issn': metadata.get('isbn_issn') or metadata.get('issn', ''),
            'call_number': metadata.get('call_number', ''),
            'citation': metadata.get('citation', ''),
            'sponsors': metadata.get('sponsors', '')
        }
        
        biblio = koha_rest_api.create_biblio(koha_metadata)
        if not biblio:
            raise Exception("Failed to create Koha bibliographic record")
        
        biblio_id = biblio.get('id')
        
        # Now use KohaAPI for add_item with CGI fallback
        koha_api = KohaAPI()
        
        # Add digital item
        item_data = {
            "barcode": metadata.get('barcode') or f"DIGITAL-{biblio_id}",
            "homebranch": metadata.get('home_library') or "RPL",  # Use RPL as default
            "holdingbranch": metadata.get('current_library') or "TPL",  # Use TPL as default
            "itype": metadata.get('koha_item_type') or "BK",
            "location": metadata.get('shelving_location') or "FIC",
            "ccode": metadata.get('collection') or "Reference",
            "itemcallnumber": metadata.get('full_call_number') or metadata.get('resource_type', 'Text'),
            "itemnotes": metadata.get('public_note') or f"Digital version: {dspace_url}",
            "itemnotes_nonpublic": metadata.get('non_public_note'),
            "uri": metadata.get('uri') or dspace_url,
            "copynumber": metadata.get('copy_number'),
            "inventory_number": metadata.get('inventory_number'),
            "shelving_control_number": metadata.get('shelving_control_number'),
            "coded_location_qualifier": metadata.get('coded_location_qualifier'),
            "serial_enumeration": metadata.get('serial_enumeration'),
            "materials_specified": metadata.get('materials_specified'),
            "classification_source": metadata.get('classification_source'),
            "withdrawn": metadata.get('withdrawn'),
            "damaged": metadata.get('damaged'),
            "not_for_loan": metadata.get('not_for_loan'),
            "use_restrictions": metadata.get('use_restrictions'),
            "date_accessioned": metadata.get('date_acquired'),
            "source_of_acquisition": metadata.get('source_of_acquisition'),
            "price": metadata.get('cost'),
            "replacementprice": metadata.get('replacement_cost'),
            "price_effective_from": metadata.get('price_effective_from')
        }
        
        # Add digital item
        item_result = koha_api.add_item(biblio_id, item_data)
        if not item_result:
            print(f"Warning: Failed to add item to biblio {biblio_id}")
            # Don't fail the whole operation, just log the warning
        
        print(f"Successfully cataloged biblio {biblio_id} with item in Koha")
        
        return {
            'biblio_id': biblio_id,
            'opac_url': f"http://127.0.0.1:8085/cgi-bin/koha/catalogue/detail.pl?biblionumber={biblio_id}"
        }
    
    @staticmethod
    def index_in_vufind(record_data):
        """Index record in VuFind"""
        vufind_api = RealVuFindAPI()
        
        if vufind_api.test_connection():
            return vufind_api.index_record(record_data)
        
        return False