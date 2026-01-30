from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from .models import Resource, SearchLog, DownloadLog, UploadedFile
from .serializers import ResourceSerializer, DownloadLogSerializer, UploadedFileSerializer
from .services import ResourceService
from .real_dspace_api import RealDSpaceAPI
import os
import json
from django.shortcuts import redirect
from django.http import StreamingHttpResponse, FileResponse
from django.conf import settings

@api_view(['GET'])
@permission_classes([AllowAny])
def search_resources(request):
    query = request.GET.get('q', '')
    source = request.GET.get('source', '')
    resource_type = request.GET.get('type', '')
    year = request.GET.get('year', '')
    limit = int(request.GET.get('limit', 20))
    
    # Allow empty query to return all items
    if not query:
        query = ''  # Empty query will return all items from each system
    
    # Log search
    SearchLog.objects.create(
        user=request.user if request.user.is_authenticated else None,
        query=query,
        results_count=0
    )
    
    # Build filters
    filters = {}
    if source:
        filters['source'] = source
    if resource_type:
        filters['type'] = resource_type
    if year:
        filters['year'] = year
    
    # Get unified results from external APIs
    results = ResourceService.unified_search(query, filters, limit)
    
    # Search local database
    local_query = Q(title__icontains=query) | Q(description__icontains=query) | Q(authors__icontains=query)
    if source and source != '':
        local_query &= Q(source=source)
    else:
        # Exclude DSpace items from local results during a general search
        # because they are fetched live from the DSpace API.
        local_query &= ~Q(source='dspace')
    if resource_type and resource_type != '':
        local_query &= Q(resource_type=resource_type)
    if year and year != '':
        local_query &= Q(year=year)
    
    local_resources = Resource.objects.filter(local_query)[:limit//4]
    local_results = []
    
    for resource in local_resources:
        local_results.append({
            'id': resource.id,
            'title': resource.title,
            'authors': resource.authors,
            'source': resource.source,
            'source_name': 'Local Repository' if resource.source == 'local' else 'DSpace Repository',
            'external_id': resource.external_id,
            'resource_type': resource.resource_type,
            'year': resource.year,
            'description': resource.description,
            'url': resource.view_url or f'/api/resources/{resource.id}/preview/',
            'download_url': resource.download_url,
            'availability': 'Available'
        })
    
    # Combine results
    all_results = results + local_results
    
    # Add preview URLs and extra metadata for DSpace items
    for result in all_results:
        if result.get('source') == 'dspace' and result.get('external_id'):
            # Add preview URL for DSpace items
            result['preview_url'] = f"/api/resources/dspace-bitstream/{result['external_id']}/"
            
            # Ensure unified metadata fields are populated if they are in result
            # (they will be if they came from ResourceService.unified_search)
    
    # Group results by source for better presentation
    grouped_results = {
        'koha': [],
        'dspace': [],
        'vufind': [],
        'local': local_results
    }
    
    for result in results:
        source_key = result.get('source', 'unknown')
        if source_key in grouped_results:
            grouped_results[source_key].append(result)
        else:
            # Handle any other sources
            if source_key not in grouped_results:
                grouped_results[source_key] = []
            grouped_results[source_key].append(result)
    
    return Response({
        'results': all_results,
        'grouped': grouped_results,
        'total': len(all_results),
        'query': query,
        'filters': filters
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def get_resource(request, resource_id):
    try:
        resource = Resource.objects.get(id=resource_id)
        resource.view_count += 1
        resource.save()
        return Response(ResourceSerializer(resource).data)
    except Resource.DoesNotExist:
        return Response({'error': 'Resource not found'}, status=404)

@api_view(['GET'])
def download_resource(request, resource_id):
    try:
        resource = Resource.objects.get(id=resource_id)
        resource.download_count += 1
        resource.save()
        
        if request.user.is_authenticated:
            DownloadLog.objects.create(user=request.user, resource=resource)
        
        # Handle local files
        if resource.source == 'local' and resource.download_url:
            file_path = os.path.join(settings.BASE_DIR, resource.download_url.lstrip('/'))
            
            if os.path.exists(file_path):
                response = FileResponse(
                    open(file_path, 'rb'),
                    as_attachment=True,
                    filename=os.path.basename(file_path)
                )
                return response
            else:
                return Response({'error': 'File not found'}, status=404)
        
        # Handle external resources
        elif resource.source in ['koha', 'dspace', 'vufind']:
            # For external resources, redirect to their download URL
            if resource.source == 'koha':
                download_url = f"{settings.KOHA_API_URL}/cgi-bin/koha/opac-detail.pl?biblionumber={resource.external_id}"
            elif resource.source == 'dspace':
                download_url = f"http://localhost:4000/handle/{resource.external_id}"
            else:
                download_url = f"http://localhost:8090/Record/{resource.external_id}"
            
            return Response({
                'download_url': download_url,
                'external': True,
                'message': 'Redirecting to external system'
            })
        
        return Response({'download_url': resource.download_url})
    except Resource.DoesNotExist:
        return Response({'error': 'Resource not found'}, status=404)

@api_view(['GET'])
@permission_classes([AllowAny])
def recent_resources(request):
    resources = Resource.objects.order_by('-created_at')[:10]
    return Response(ResourceSerializer(resources, many=True).data)

@api_view(['GET'])
def user_downloads(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    
    try:
        downloads = DownloadLog.objects.filter(user=request.user).order_by('-timestamp')[:20]
        return Response(DownloadLogSerializer(downloads, many=True).data)
    except Exception as e:
        return Response({'downloads': [], 'message': 'No downloads found'})

@api_view(['POST'])
def upload_resource(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    
    collection_uuid = request.data.get('collection')
    
    # Extract all form fields
    metadata = {
        'title': request.data.get('title'),
        'authors': request.data.get('authors', ''),
        'other_titles': request.data.get('other_titles', ''),
        'date_year': request.data.get('date_year'),
        'publication_date': request.data.get('publication_date', ''),
        'date_month': request.data.get('date_month', ''),
        'date_day': request.data.get('date_day', ''),
        'publisher': request.data.get('publisher', ''),
        'citation': request.data.get('citation', ''),
        'series_report_no': request.data.get('series_report_no', ''),
        'accession_number': request.data.get('accession_number', ''),
        'identifiers': json.loads(request.data.get('identifiers', '[]')),
        'resource_type': request.data.get('resource_type', 'Text'),
        'language': request.data.get('language', 'en'),
        'subject_keywords': request.data.get('subject_keywords', ''),
        'abstract': request.data.get('abstract', ''),
        'sponsors': request.data.get('sponsors', ''),
        'description': request.data.get('description', '')
    }
    
    file = request.FILES.get('file')
    
    if not metadata['title'] or not file or not collection_uuid:
        return Response({'error': 'Title, file, and collection are required'}, status=400)
    
    try:
        # Upload to real DSpace only
        print(f"📤 Uploading '{metadata['title']}' to DSpace...")
        dspace_result = ResourceService.upload_to_dspace(file, metadata, collection_uuid)
        
        # Create local record
        resource = Resource.objects.create(
            title=metadata['title'],
            description=metadata['description'],
            authors=metadata['authors'],
            resource_type=metadata['resource_type'],
            year=metadata['date_year'],
            source='dspace',
            external_id=dspace_result.get('uuid', ''),
            download_url=dspace_result.get('download_url', ''),
            view_url=dspace_result.get('handle_url', ''),
            file_size=file.size,
            metadata={
                **metadata,
                'dspace_uuid': dspace_result.get('uuid'),
                'dspace_handle': dspace_result.get('handle'),
            }
        )
        
        print(f"✅ Successfully uploaded '{metadata['title']}' to DSpace")
        
        return Response({
            'message': 'Resource successfully uploaded to DSpace',
            'resource': ResourceSerializer(resource).data,
            'dspace_url': dspace_result.get('handle_url'),
            'integration_status': {
                'dspace': True,
                'koha': False,
                'vufind': False
            }
        }, status=201)
        
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"❌ Upload failed: {str(e)}")
        print(tb)
        # Return traceback in response for debugging (remove in production)
        return Response({'error': f'Upload failed: {str(e)}', 'traceback': tb}, status=500)

@api_view(['GET'])
def preview_resource(request, resource_id):
    try:
        resource = Resource.objects.get(id=resource_id)
        
        if resource.source == 'local' and resource.download_url:
            file_path = os.path.join(settings.BASE_DIR, resource.download_url.lstrip('/'))
            
            if os.path.exists(file_path):
                response = FileResponse(
                    open(file_path, 'rb'),
                    content_type='application/octet-stream'
                )
                return response
            else:
                return Response({'error': 'File not found'}, status=404)
        
        return Response({
            'preview_url': resource.download_url,
            'external': True
        })
    except Resource.DoesNotExist:
        return Response({'error': 'Resource not found'}, status=404)

@api_view(['POST'])
def upload_file(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    
    title = request.data.get('title')
    description = request.data.get('description', '')
    file = request.FILES.get('file')
    
    if not title or not file:
        return Response({'error': 'Title and file are required'}, status=400)
    
    try:
        # Save file locally
        uploaded_file = UploadedFile.objects.create(
            title=title,
            description=description,
            file=file,
            user=request.user
        )
        
        # Try to upload to DSpace if available
        try:
            import requests
            dspace_url = 'http://localhost:8080/server'
            
            # Simple DSpace upload (would need proper authentication in production)
            files = {'file': (file.name, file.read(), file.content_type)}
            data = {'title': title, 'description': description}
            
            response = requests.post(f'{dspace_url}/api/submission/workspaceitems', 
                                   files=files, data=data, timeout=5)
            
            if response.status_code == 201:
                dspace_data = response.json()
                uploaded_file.dspace_id = dspace_data.get('id', '')
                uploaded_file.save()
        except Exception as e:
            print(f'DSpace upload failed: {e}')
        
        return Response(UploadedFileSerializer(uploaded_file).data, status=201)
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def list_uploaded_files(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    
    files = UploadedFile.objects.filter(user=request.user).order_by('-created_at')
    return Response(UploadedFileSerializer(files, many=True).data)

@api_view(['GET'])
def search_uploaded_files(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    
    query = request.GET.get('q', '')
    if not query:
        files = UploadedFile.objects.filter(user=request.user).order_by('-created_at')[:20]
    else:
        files = UploadedFile.objects.filter(
            user=request.user,
            title__icontains=query
        ).order_by('-created_at')[:20]
    
    return Response(UploadedFileSerializer(files, many=True).data)

@api_view(['POST'])
def catalog_resource(request, resource_id):
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    
    try:
        resource = Resource.objects.get(id=resource_id)
        
        if resource.source != 'dspace':
            return Response({'error': 'Only DSpace resources can be cataloged in Koha'}, status=400)
        
        # Get metadata from resource
        metadata = resource.metadata
        
        # Ensure required fields
        if not metadata.get('title'):
            metadata['title'] = resource.title
        
        dspace_url = resource.view_url or resource.external_id
        
        # Catalog in Koha
        koha_result = ResourceService.catalog_in_koha(metadata, dspace_url)
        
        # Update resource with Koha info
        resource.koha_id = koha_result.get('biblio_id')
        resource.save()
        
        return Response({
            'message': 'Successfully cataloged in Koha',
            'koha_url': koha_result.get('opac_url'),
            'biblio_id': koha_result.get('biblio_id')
        })
        
    except Resource.DoesNotExist:
        return Response({'error': 'Resource not found'}, status=404)
    except Exception as e:
        print(f"Catalog error: {str(e)}")
        return Response({'error': f'Catalog failed: {str(e)}'}, status=500)

@api_view(['POST'])
def catalog_external_dspace(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    
    try:
        data = request.data
        metadata = {
            'title': data.get('title'),
            'authors': data.get('authors', ''),
            'description': data.get('description', ''),
            'year': data.get('year', ''),
            'subject_keywords': data.get('subject_keywords', ''),
            'publisher': data.get('publisher', ''),
            'language': data.get('language', 'en'),
            'resource_type': data.get('resource_type', 'Text'),
            'abstract': data.get('abstract', ''),
            'sponsors': data.get('sponsors', ''),
            'dspace_url': data.get('dspace_url'),
            # Koha item fields
            'withdrawn': data.get('withdrawn'),
            'classification_source': data.get('classification_source'),
            'materials_specified': data.get('materials_specified'),
            'damaged': data.get('damaged'),
            'use_restrictions': data.get('use_restrictions'),
            'not_for_loan': data.get('not_for_loan'),
            'collection': data.get('collection'),
            'home_library': data.get('home_library'),
            'current_library': data.get('current_library'),
            'shelving_location': data.get('shelving_location'),
            'date_acquired': data.get('date_acquired'),
            'source_of_acquisition': data.get('source_of_acquisition'),
            'coded_location_qualifier': data.get('coded_location_qualifier'),
            'cost': data.get('cost'),
            'serial_enumeration': data.get('serial_enumeration'),
            'inventory_number': data.get('inventory_number'),
            'shelving_control_number': data.get('shelving_control_number'),
            'full_call_number': data.get('full_call_number'),
            'barcode': data.get('barcode'),
            'copy_number': data.get('copy_number'),
            'uri': data.get('uri'),
            'replacement_cost': data.get('replacement_cost'),
            'price_effective_from': data.get('price_effective_from'),
            'non_public_note': data.get('non_public_note'),
            'koha_item_type': data.get('koha_item_type'),
            'public_note': data.get('public_note')
        }
        
        # Catalog in Koha
        koha_result = ResourceService.catalog_in_koha(metadata, metadata['dspace_url'])
        
        return Response({
            'message': 'Successfully cataloged external DSpace item in Koha (bibliographic record + item)',
            'koha_url': koha_result.get('opac_url'),
            'biblio_id': koha_result.get('biblio_id')
        })
        
    except Exception as e:
        print(f"External catalog error: {str(e)}")
        return Response({'error': f'Catalog failed: {str(e)}'}, status=500)

def _serve_bitstream_content(dspace_api, bitstream_uuid):
    try:
        # Get bitstream metadata
        bitstream_url = f"http://localhost:8080/server/api/core/bitstreams/{bitstream_uuid}"
        response = dspace_api.client.session.get(bitstream_url)
        
        if response.status_code != 200:
            return None # Indicate failure to find bitstream metadata
        
        bitstream = response.json()
        
        # Fetch the bitstream content
        content_url = f"http://localhost:8080/server/api/core/bitstreams/{bitstream_uuid}/content"
        
        dspace_response = dspace_api.client.session.get(content_url, stream=True)
        
        if dspace_response.status_code == 200:
            filename = bitstream.get('name', 'download')
            content_type = dspace_response.headers.get('Content-Type', 
                                                    bitstream.get('mimeType', 
                                                                 'application/octet-stream'))
            
            response = StreamingHttpResponse(
                dspace_response.iter_content(chunk_size=8192),
                content_type=content_type,
            )
            
            # For PDFs, show inline for preview
            if content_type.startswith('application/pdf'):
                response['Content-Disposition'] = f'inline; filename="{filename}"'
            else:
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
        else:
            return None # Indicate failure to fetch content
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return None # Indicate general error


@api_view(['GET'])
@permission_classes([AllowAny])
def get_dspace_bitstream(request, handle_id):
    """
    Proxies a DSpace bitstream download to handle authentication.
    Supports handles (e.g. 123456789/183), item UUIDs, and bitstream UUIDs.
    Attempts to serve the file directly.
    """
    handle_id = handle_id.strip('/')
    dspace_api = RealDSpaceAPI()
    
    # Authenticate once
    if not dspace_api.authenticate():
        # Fallback to admin if user auth fails
        from .config import DSPACE_ADMIN_EMAIL, DSPACE_ADMIN_PASSWORD
        if DSPACE_ADMIN_EMAIL and DSPACE_ADMIN_PASSWORD:
            if not dspace_api.client.login(DSPACE_ADMIN_EMAIL, DSPACE_ADMIN_PASSWORD):
                # If admin auth also fails, then truly can't access
                return redirect(f"http://localhost:4000/handle/{handle_id}")
        else:
            return redirect(f"http://localhost:4000/handle/{handle_id}")

    # Case 1: handle_id is already a bitstream UUID
    try:
        # Check if handle_id looks like a UUID (heuristic)
        if '-' in handle_id and len(handle_id.split('-')) == 5 and handle_id.count('/') == 0:
            # Try it as a bitstream UUID first
            served_response = _serve_bitstream_content(dspace_api, handle_id)
            if served_response:
                return served_response
            
            # If it wasn't a bitstream, it might be an ITEM UUID
            # Try fetching item directly
            item_url = f"{dspace_api.base_url}/core/items/{handle_id}"
            item_response = dspace_api.client.session.get(item_url)
            if item_response.status_code == 200:
                item = item_response.json()
                item_uuid = item.get('uuid')
                if item_uuid:
                    bitstreams = dspace_api.get_item_bitstreams(item_uuid)
                    if bitstreams:
                        # Find original bitstream
                        original_bitstream = next((bs for bs in bitstreams if bs.get('bundleName') == 'ORIGINAL'), bitstreams[0])
                        served_response = _serve_bitstream_content(dspace_api, original_bitstream['uuid'])
                        if served_response:
                            return served_response
    except Exception as e:
        print(f"Error in UUID check: {e}")

    # Case 2: Treat as handle
    item = dspace_api.get_item_by_handle(handle_id)
    if not item:
        # If item not found, redirect to DSpace item page (fallback)
        return redirect(f"http://localhost:4000/handle/{handle_id}")
    
    item_uuid = item.get('uuid')
    if not item_uuid:
        return redirect(f"http://localhost:4000/handle/{handle_id}")
    
    # Get bitstreams for the item
    bitstreams = dspace_api.get_item_bitstreams(item_uuid)
    
    if not bitstreams:
        return redirect(f"http://localhost:4000/handle/{handle_id}")

    # Find the original bitstream or first available
    original_bitstream = None
    for bs in bitstreams:
        if bs.get('bundleName') == 'ORIGINAL':
            original_bitstream = bs
            break
    
    if not original_bitstream and bitstreams:
        original_bitstream = bitstreams[0]
    
    if original_bitstream:
        bitstream_uuid = original_bitstream['uuid']
        # Serve the found bitstream
        served_response = _serve_bitstream_content(dspace_api, bitstream_uuid)
        if served_response:
            return served_response
    
    # Final fallback
    return redirect(f"http://localhost:4000/handle/{handle_id}")

@api_view(['GET'])
@permission_classes([AllowAny])
def get_bitstream(request, bitstream_uuid):
    """
    Directly proxy a DSpace bitstream download by bitstream UUID.
    This endpoint is specifically for bitstream UUIDs.
    """
    try:
        dspace_api = RealDSpaceAPI()
        
        # Try authentication
        if not dspace_api.authenticate():
            from .config import DSPACE_ADMIN_EMAIL, DSPACE_ADMIN_PASSWORD
            if DSPACE_ADMIN_EMAIL and DSPACE_ADMIN_PASSWORD:
                dspace_api.client.login(DSPACE_ADMIN_EMAIL, DSPACE_ADMIN_PASSWORD)
            else:
                return Response({'error': 'DSpace authentication failed'}, status=500)
        
        response = _serve_bitstream_content(dspace_api, bitstream_uuid)
        if response:
            return response
        else:
            return Response({'error': 'Bitstream content not found or accessible'}, status=404)
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': f'Server error: {str(e)}'}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_dspace_items(request):
    """
    Get DSpace items with filtering by collection.
    Query parameters:
    - scope: Collection UUID to filter by
    - page: Page number (default: 0)
    - size: Items per page (default: 5)
    - query: Search query
    """
    try:
        dspace_api = RealDSpaceAPI()
        
        # Authenticate first
        if not dspace_api.authenticate():
            return Response({'error': 'DSpace authentication failed'}, status=500)
        
        # Get query parameters
        scope = request.GET.get('scope', '')
        page = int(request.GET.get('page', 0))
        size = int(request.GET.get('size', 5))
        query = request.GET.get('query', '')
        
        print(f"DEBUG: Fetching DSpace items - scope: {scope}, page: {page}, size: {size}, query: {query}")
        
        # Build API URL for DSpace
        api_url = f"{dspace_api.base_url}/discover/search/objects"
        params = {
            'dsoType': 'item',
            'size': size,
            'page': page
        }
        
        # Handle multiple scopes (collections)
        if scope:
            scopes = [s.strip() for s in scope.split(',') if s.strip()]
            if len(scopes) == 1:
                params['scope'] = scopes[0]
            elif len(scopes) > 1:
                # Use location filter for multiple scopes
                # location is often indexed for community/collection UUIDs
                scope_query = " OR ".join([f"location:{s}" for s in scopes])
                if query:
                    query = f"({query}) AND ({scope_query})"
                else:
                    query = scope_query
        
        if query:
            params['query'] = query
        
        # Make request to DSpace API
        response = dspace_api.client.session.get(api_url, params=params)
        
        if response.status_code != 200:
            print(f"DEBUG: DSpace API error: {response.status_code} - {response.text}")
            return Response({'error': 'Failed to fetch DSpace items'}, status=response.status_code)
        
        dspace_data = response.json()
        search_result = dspace_data.get('_embedded', {}).get('searchResult', {})
        
        # Transform DSpace items to match our format
        objects = search_result.get('_embedded', {}).get('objects', [])
        transformed_items = []
        
        for obj in objects:
            item = obj.get('_embedded', {}).get('indexableObject', {})
            metadata = item.get('metadata', {})
            print(f"DEBUG: DSpace item metadata for {item.get('uuid')}: {json.dumps(metadata, indent=2)}")
            
            # Better metadata extraction for all fields
            def get_metadata_values(field_name):
                vals = metadata.get(field_name, [{}])
                return [v.get('value', '') for v in vals if v.get('value')]

            title = item.get('name', '')
            dc_titles = get_metadata_values('dc.title')
            if dc_titles:
                title = dc_titles[0]
            
            authors = get_metadata_values('dc.contributor.author')
            author_str = ", ".join(authors) if authors else ""
            
            years = get_metadata_values('dc.date.issued')
            year = years[0][:4] if years and len(years[0]) >= 4 else (years[0] if years else "")
            
            publishers = get_metadata_values('dc.publisher')
            publisher = publishers[0] if publishers else ""
            
            citations = get_metadata_values('dc.identifier.citation')
            citation = citations[0] if citations else ""
            
            languages = get_metadata_values('dc.language.iso')
            language = languages[0] if languages else ""
            
            abstracts = get_metadata_values('dc.description.abstract')
            descs = get_metadata_values('dc.description')
            description = abstracts[0] if abstracts else (descs[0] if descs else "")
            
            types = get_metadata_values('dc.type')
            resource_type = types[0] if types else "item"
            
            transformed_items.append({
                'id': f"dspace_{item.get('uuid', '')}",
                'title': title,
                'authors': author_str,
                'source': 'dspace',
                'source_name': 'Research Repository',
                'external_id': item.get('handle', ''),
                'resource_type': resource_type,
                'year': year,
                'publisher': publisher,
                'citation': citation,
                'language': language,
                'description': description,
                'url': f"http://localhost:4000/handle/{item.get('handle', '')}",
                'preview_url': f"/api/resources/dspace-bitstream/{item.get('handle', '')}/",
                'availability': 'Open Access',
                'metadata': {
                    'uuid': item.get('uuid', ''),
                    'handle': item.get('handle', ''),
                    'lastModified': item.get('lastModified', '')
                }
            })
        
        pagination = search_result.get('page', {
            'number': page,
            'size': size,
            'totalPages': 0,
            'totalElements': 0
        })
        
        return Response({
            'items': transformed_items,
            'pagination': pagination,
            'scope': scope,
            'query': query
        })
        
    except Exception as e:
        print(f"DSpace items error: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def get_koha_item_metadata(request, biblio_id):
    try:
        from .koha_rest_api import KohaRestAPI
        koha_api = KohaRestAPI()
        if not koha_api.authenticate():
            return Response({'error': 'Koha authentication failed'}, status=500)
        
        # Get biblio details
        biblio = koha_api.get_biblio_details(biblio_id)
        if not biblio:
            return Response({'error': 'Biblio not found'}, status=404)
        
        # Get items for this biblio
        items = koha_api.get_biblio_items(biblio_id)
        
        return Response({
            'biblio': biblio,
            'items': items
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)