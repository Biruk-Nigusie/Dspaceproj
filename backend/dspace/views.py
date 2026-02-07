from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.conf import settings
from django.http import StreamingHttpResponse, FileResponse
from django.shortcuts import redirect
import os
import io

from .models import Resource, SearchLog, UploadedFile, DownloadLog
from .serializers import ResourceSerializer, UploadedFileSerializer, DownloadLogSerializer
from .services import ResourceService
from .config import DSPACE_URL, FRONTEND_URL, DSPACE_ADMIN_EMAIL, DSPACE_ADMIN_PASSWORD, KOHA_API_URL
from .api import DSpaceAPI
from .utils.pdf import rotate_pdf_page, split_pdf_at, merge_pdfs, rename_pdf_title
from .hierarchy import DSpaceHierarchyManager

@api_view(['GET'])
@permission_classes([AllowAny])
def search_resources(request):
    query = request.GET.get('q', '')
    source = request.GET.get('source', '')
    resource_type = request.GET.get('type', '')
    year = request.GET.get('year', '')
    limit = int(request.GET.get('limit', 20))
    
    SearchLog.objects.create(
        user=request.user if request.user.is_authenticated else None,
        query=query,
        results_count=0
    )
    
    filters = {}
    if source: filters['source'] = source
    if resource_type: filters['type'] = resource_type
    if year: filters['year'] = year
    
    results = ResourceService.unified_search(query, filters, limit)
    
    local_query = Q(title__icontains=query) | Q(description__icontains=query) | Q(authors__icontains=query)
    if source: local_query &= Q(source=source)
    else: local_query &= ~Q(source='dspace')
        
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
            'url': resource.view_url or f'/api/dspace/resources/{resource.id}/preview/',
            'availability': 'Available'
        })
    
    all_results = results + local_results
    grouped_results = {'koha': [], 'dspace': [], 'local': local_results}
    for result in results:
        s = result.get('source', 'unknown')
        if s in grouped_results: grouped_results[s].append(result)
        else: grouped_results.setdefault(s, []).append(result)
    
    return Response({
        'results': all_results,
        'grouped': grouped_results,
        'total': len(all_results),
        'query': query
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
        
        if resource.source == 'local' and resource.download_url:
            file_path = os.path.join(settings.BASE_DIR, resource.download_url.lstrip('/'))
            if os.path.exists(file_path):
                return FileResponse(open(file_path, 'rb'), as_attachment=True)
            return Response({'error': 'File not found'}, status=404)
        
        url = ""
        if resource.source == 'koha':
            url = f"{KOHA_API_URL}/cgi-bin/koha/opac-detail.pl?biblionumber={resource.external_id}"
        elif resource.source == 'dspace':
            url = f"{DSPACE_URL.rstrip('/')}/handle/{resource.external_id}"
            
        if url: return Response({'download_url': url, 'external': True})
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
        return Response({'error': 'Auth required'}, status=401)
    downloads = DownloadLog.objects.filter(user=request.user).order_by('-timestamp')[:20]
    return Response(DownloadLogSerializer(downloads, many=True).data)

@api_view(['GET'])
@permission_classes([AllowAny])
def check_dspace_connection(request):
    dspace_api = DSpaceAPI()
    if dspace_api.authenticate():
        return Response({'status': 'online', 'message': 'DSpace connected'})
    return Response({'status': 'offline', 'message': 'DSpace connection failed'}, status=503)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def authenticate_dspace(request):
    if not request.user.is_staff: return Response({'error': 'Admin access required'}, status=403)
    dspace_api = DSpaceAPI()
    if dspace_api.authenticate():
        return Response({'message': 'Authenticated', 'status': 'success'})
    return Response({'error': 'Auth failed'}, status=503)

def _serve_bitstream_content(dspace_api, bitstream_uuid):
    try:
        bitstream_url = f"{DSPACE_URL.rstrip('/')}/server/api/core/bitstreams/{bitstream_uuid}"
        response = dspace_api.client.session.get(bitstream_url)
        if response.status_code != 200: return None
        
        bitstream = response.json()
        content_url = f"{DSPACE_URL.rstrip('/')}/server/api/core/bitstreams/{bitstream_uuid}/content"
        dspace_response = dspace_api.client.session.get(content_url, stream=True)
        
        if dspace_response.status_code == 200:
            filename = bitstream.get('name', 'download')
            content_type = dspace_response.headers.get('Content-Type', 'application/octet-stream')
            res = StreamingHttpResponse(dspace_response.iter_content(chunk_size=8192), content_type=content_type)
            res['Content-Disposition'] = f'inline; filename="{filename}"' if 'pdf' in content_type else f'attachment; filename="{filename}"'
            return res
        return None
    except Exception: return None

@api_view(['GET'])
@permission_classes([AllowAny])
def get_dspace_bitstream(request, handle_id):
    handle_id = handle_id.strip('/')
    dspace_api = DSpaceAPI()
    if not dspace_api.authenticate():
        if DSPACE_ADMIN_EMAIL: dspace_api.client.login(DSPACE_ADMIN_EMAIL, DSPACE_ADMIN_PASSWORD)
        else: return redirect(f"{DSPACE_URL.rstrip('/')}/handle/{handle_id}")

    item = dspace_api.get_item_by_handle(handle_id)
    if not item: return redirect(f"{DSPACE_URL.rstrip('/')}/handle/{handle_id}")
    
    bitstreams = dspace_api.get_item_bitstreams(item.get('uuid'))
    if not bitstreams: return redirect(f"{DSPACE_URL.rstrip('/')}/handle/{handle_id}")

    original = next((bs for bs in bitstreams if bs.get('bundleName') == 'ORIGINAL'), bitstreams[0])
    res = _serve_bitstream_content(dspace_api, original['uuid'])
    return res if res else redirect(f"{DSPACE_URL.rstrip('/')}/handle/{handle_id}")

@api_view(['GET'])
@permission_classes([AllowAny])
def get_dspace_items(request):
    try:
        dspace_api = DSpaceAPI()
        if not dspace_api.authenticate(): return Response({'error': 'Auth failed'}, status=401)
        
        scope = request.GET.get('scope', '')
        page = int(request.GET.get('page', 0))
        size = int(request.GET.get('size', 5))
        query = request.GET.get('query', '')
        
        api_url = f"{dspace_api.base_url}/discover/search/objects"
        params = {'dsoType': 'item', 'size': size, 'page': page}
        if scope: params['scope'] = scope
        if query: params['query'] = query
        
        response = dspace_api.client.session.get(api_url, params=params)
        if response.status_code != 200: return Response({'error': 'Fetch failed'}, status=response.status_code)
        
        data = response.json()
        search_result = data.get('_embedded', {}).get('searchResult', {})
        objects = search_result.get('_embedded', {}).get('objects', [])
        
        transformed = []
        for obj in objects:
            item = obj.get('_embedded', {}).get('indexableObject', {})
            meta = item.get('metadata', {})
            def get_m(f): return [v.get('value', '') for v in meta.get(f, [{}]) if v.get('value')]
            
            years = get_m('dc.date.issued')
            transformed.append({
                'id': f"dspace_{item.get('uuid')}",
                'title': get_m('dc.title')[0] if get_m('dc.title') else item.get('name', ''),
                'authors': ", ".join(get_m('dc.contributor.author')),
                'source': 'dspace',
                'year': years[0][:4] if years else "",
                'url': f"{DSPACE_URL.rstrip('/')}/handle/{item.get('handle')}",
                'preview_url': f"/api/dspace/bitstream-handle/{item.get('handle')}/",
            })
        
        return Response({'items': transformed, 'pagination': search_result.get('page', {})})
    except Exception as e: return Response({'error': str(e)}, status=500)

@api_view(['POST'])
def upload_resource(request):
    if not request.user.is_authenticated: return Response({'error': 'Auth required'}, status=401)
    
    col_uuid = request.data.get('collection')
    meta = {
        'title': request.data.get('title'),
        'authors': request.data.get('authors', ''),
        'date_year': request.data.get('date_year'),
        'resource_type': request.data.get('resource_type', 'Text')
    }
    file = request.FILES.get('file')
    if not all([meta['title'], file, col_uuid]): return Response({'error': 'Missing fields'}, status=400)
    
    try:
        res = ResourceService.upload_to_dspace(file, meta, col_uuid)
        resource = Resource.objects.create(
            title=meta['title'], authors=meta['authors'], source='dspace',
            external_id=res.get('uuid'), download_url=res.get('download_url'), view_url=res.get('handle_url')
        )
        return Response({'message': 'Uploaded', 'resource': ResourceSerializer(resource).data}, status=201)
    except Exception as e: return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def catalog_external_dspace(request):
    if not request.user.is_staff:
        return Response({'error': 'Admin access required'}, status=403)
    
    try:
        data = request.data
        title = data.get('title')
        dspace_url = data.get('dspace_url')
        
        if not title or not dspace_url:
            return Response({'error': 'Title and DSpace URL are required'}, status=400)
            
        metadata = {
            'title': title,
            'authors': data.get('authors', ''),
            'year': data.get('year', ''),
            'abstract': data.get('description', ''),
            'subject': data.get('subject_keywords', '')
        }
        
        res = ResourceService.catalog_in_koha(metadata, dspace_url)
        return Response({'message': 'Cataloged successfully', **res})
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_catalog_collections(request):
    # Summary of collections from both systems
    try:
        api = DSpaceAPI()
        dspace_colls = api.get_collections() or []
        
        # In a real scenario, you'd fetch koha collections too
        # For now return a simplified structure that the frontend expects
        return Response({
            'collections': {
                'dspace': dspace_colls,
                'koha': [] # Placeholder
            },
            'column_configs': {
                'default': [
                    {'field': 'title', 'label': 'Title', 'sortable': True},
                    {'field': 'authors', 'label': 'Author', 'sortable': True},
                    {'field': 'year', 'label': 'Year', 'sortable': True},
                    {'field': 'source_name', 'label': 'Source', 'sortable': True},
                ],
                'archive': [
                    {'field': 'title', 'label': 'Title', 'sortable': True},
                    {'field': 'authors', 'label': 'Creator', 'sortable': True},
                    {'field': 'year', 'label': 'Year', 'sortable': True},
                    {'field': 'medium', 'label': 'Medium', 'sortable': True},
                ]
            }
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_catalog_items(request):
    # This is essentially search but maybe with different defaults
    return search_resources(request)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_dspace_hierarchy(request):
    try:
        manager = DSpaceHierarchyManager()
        hierarchy = manager.get_hierarchy()
        return Response(hierarchy)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def pdf_rotate(request):
    try:
        file = request.FILES.get('file'); angle = int(request.data.get('angle', 90))
        if not file: return Response({'error': 'No file'}, status=400)
        rotated = rotate_pdf_page(file.read(), angle)
        return StreamingHttpResponse(io.BytesIO(rotated), content_type='application/pdf')
    except Exception as e: return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def pdf_split(request):
    try:
        file = request.FILES.get('file'); pages = request.data.get('pages', '')
        if not file or not pages: return Response({'error': 'Missing fields'}, status=400)
        split_pdf = split_pdf_at(file.read(), pages)
        return StreamingHttpResponse(io.BytesIO(split_pdf), content_type='application/pdf')
    except Exception as e: return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def pdf_merge(request):
    try:
        files = request.FILES.getlist('files')
        if not files or len(files) < 2: return Response({'error': '2+ files required'}, status=400)
        merged = merge_pdfs([f.read() for f in files])
        return StreamingHttpResponse(io.BytesIO(merged), content_type='application/pdf')
    except Exception as e: return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def pdf_rename(request):
    try:
        file = request.FILES.get('file'); title = request.data.get('title')
        if not file or not title: return Response({'error': 'Missing fields'}, status=400)
        renamed = rename_pdf_title(file.read(), title)
        return StreamingHttpResponse(io.BytesIO(renamed), content_type='application/pdf')
    except Exception as e: return Response({'error': str(e)}, status=500)
