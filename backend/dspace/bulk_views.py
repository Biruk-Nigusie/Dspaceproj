import os
import subprocess
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from .api import DSpaceAPI

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def count_folders(request):
    try:
        path = request.data.get('directory_path')
        if not path or not os.path.isdir(path):
            return Response({'error': 'Invalid directory'}, status=400)
        
        folders = [f for f in os.listdir(path) if os.path.isdir(os.path.join(path, f))]
        uploaded = 0
        for f in folders:
            if os.path.exists(os.path.join(path, f, 'metadata.xml')):
                uploaded += 1
        
        return Response({'total_folders': len(folders), 'uploaded_folders': uploaded, 'ready_for_upload': len(folders) - uploaded})
    except Exception as e: return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_upload(request):
    try:
        path = request.data.get('directory_path')
        col_id = request.data.get('collection_id')
        if not path or not col_id: return Response({'error': 'Missing fields'}, status=400)
        
        # Path to scripts
        script = os.path.join(settings.BASE_DIR, 'dspace', 'scripts', 'bulk_upload.py')
        env = os.environ.copy()
        # Credentials should be in env or config
        
        result = subprocess.run(['python3', script, path], env=env, capture_output=True, text=True, timeout=3600)
        if result.returncode == 0:
            return Response({'success': True, 'output': result.stdout})
        return Response({'success': False, 'error': result.stderr}, status=500)
    except Exception as e: return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_collections(request):
    try:
        api = DSpaceAPI()
        if api.authenticate():
            colls = api.get_collections()
            return Response({'collections': [{'id': c.get('uuid'), 'name': c.get('name')} for c in colls]})
        return Response({'error': 'Auth failed'}, status=500)
    except Exception as e: return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_metadata(request):
    try:
        path = request.data.get('directory_path')
        if not path or not os.path.isdir(path): return Response({'error': 'Invalid path'}, status=400)
        
        files = []
        for f in os.listdir(path):
            xml = os.path.join(path, f, 'metadata.xml')
            if os.path.exists(xml):
                with open(xml, 'r', encoding='utf-8') as file:
                    files.append({'folder_name': f, 'xml_content': file.read()})
        return Response({'metadata_files': files})
    except Exception as e: return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_metadata(request):
    try:
        path = request.data.get('directory_path')
        folder = request.data.get('folder_name')
        content = request.data.get('xml_content')
        if not all([path, folder, content]): return Response({'error': 'Missing fields'}, status=400)
        
        xml = os.path.join(path, folder, 'metadata.xml')
        with open(xml, 'w', encoding='utf-8') as f: f.write(content)
        return Response({'success': True})
    except Exception as e: return Response({'error': str(e)}, status=500)