from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from .models import Resource, SearchLog, DownloadLog, UploadedFile
from .serializers import ResourceSerializer, DownloadLogSerializer, UploadedFileSerializer
from .services import ResourceService
import os
import json

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
            import os
            from django.http import FileResponse, Http404
            from django.conf import settings
            
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
    
    # Extract all form fields
    metadata = {
        'title': request.data.get('title'),
        'authors': request.data.get('authors', ''),
        'other_titles': request.data.get('other_titles', ''),
        'date_year': request.data.get('date_year'),
        'date_month': request.data.get('date_month', ''),
        'date_day': request.data.get('date_day', ''),
        'publisher': request.data.get('publisher', ''),
        'citation': request.data.get('citation', ''),
        'series': request.data.get('series', ''),
        'report_no': request.data.get('report_no', ''),
        'issn': request.data.get('issn', ''),
        'resource_type': request.data.get('resource_type', 'Text'),
        'language': request.data.get('language', 'en'),
        'subject_keywords': request.data.get('subject_keywords', ''),
        'abstract': request.data.get('abstract', ''),
        'sponsors': request.data.get('sponsors', ''),
        'description': request.data.get('description', '')
    }
    
    file = request.FILES.get('file')
    
    if not metadata['title'] or not file:
        return Response({'error': 'Title and file are required'}, status=400)
    
    try:
        # Upload to real DSpace
        print(f"📤 Uploading '{metadata['title']}' to DSpace...")
        dspace_result = ResourceService.upload_to_dspace(file, metadata)
        
        # Catalog in real Koha
        print(f"📚 Cataloging '{metadata['title']}' in Koha...")
        koha_result = ResourceService.catalog_in_koha(metadata, dspace_result.get('handle_url'))
        
        # Index in VuFind
        print(f"🔍 Indexing '{metadata['title']}' in VuFind...")
        vufind_indexed = ResourceService.index_in_vufind({
            'id': dspace_result.get('uuid'),
            'title': metadata['title'],
            'author': metadata['authors'],
            'format': metadata['resource_type'],
            'year': metadata['date_year'],
            'description': metadata['description'],
            'abstract': metadata['abstract'],
            'keywords': metadata['subject_keywords']
        })
        
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
                'koha_biblio_id': koha_result.get('biblio_id'),
                'vufind_indexed': vufind_indexed
            }
        )
        
        print(f"✅ Successfully integrated '{metadata['title']}' across all systems")
        
        return Response({
            'message': 'Resource successfully uploaded to DSpace, cataloged in Koha, and indexed in VuFind',
            'resource': ResourceSerializer(resource).data,
            'dspace_url': dspace_result.get('handle_url'),
            'koha_url': koha_result.get('opac_url'),
            'vufind_url': f"http://localhost:8090/Record/{dspace_result.get('uuid')}",
            'integration_status': {
                'dspace': True,
                'koha': True,
                'vufind': vufind_indexed
            }
        }, status=201)
        
    except Exception as e:
        print(f"❌ Upload failed: {str(e)}")
        return Response({'error': f'Upload failed: {str(e)}'}, status=500)



@api_view(['GET'])
def preview_resource(request, resource_id):
    try:
        resource = Resource.objects.get(id=resource_id)
        
        if resource.source == 'local' and resource.download_url:
            import os
            from django.http import FileResponse
            from django.conf import settings
            
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