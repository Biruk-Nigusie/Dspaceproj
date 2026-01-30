import os
import subprocess
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def count_folders(request):
    """Count total folders and uploaded status in selected directory"""
    try:
        directory_path = request.data.get('directory_path')
        print(f"Received directory_path: {directory_path}")
        
        if not directory_path:
            return Response({'error': 'Directory path is required'}, status=400)
            
        if not os.path.exists(directory_path):
            return Response({'error': f'Directory does not exist: {directory_path}'}, status=400)
            
        if not os.path.isdir(directory_path):
            return Response({'error': f'Path is not a directory: {directory_path}'}, status=400)
        
        # Count total folders
        total_folders = 0
        uploaded_folders = 0
        
        try:
            items = os.listdir(directory_path)
            print(f"Found {len(items)} items in directory")
            
            for item in items:
                item_path = os.path.join(directory_path, item)
                if os.path.isdir(item_path):
                    total_folders += 1
                    # Check if folder has metadata.xml and PDF (indicates it's ready/uploaded)
                    try:
                        metadata_file = os.path.join(item_path, 'metadata.xml')
                        if os.path.exists(metadata_file):
                            try:
                                pdf_files = [f for f in os.listdir(item_path) if f.endswith('.pdf')]
                                if pdf_files:
                                    uploaded_folders += 1
                            except:
                                pass
                    except:
                        continue
        except Exception as e:
            print(f"Error accessing directory: {e}")
            return Response({'error': f'Error accessing directory: {str(e)}'}, status=400)
        
        return Response({
            'total_folders': total_folders,
            'uploaded_folders': uploaded_folders,
            'ready_for_upload': total_folders - uploaded_folders
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_upload(request):
    """Execute bulk upload using dspace_uploader"""
    try:
        directory_path = request.data.get('directory_path')
        collection_id = request.data.get('collection_id')
        
        if not directory_path or not collection_id:
            return Response({'error': 'Directory path and collection ID required'}, status=400)
        
        if not os.path.exists(directory_path):
            return Response({'error': 'Directory does not exist'}, status=400)
        
        # Skip admin check for now
        # if not request.user.is_staff:
        #     return Response({'error': 'Admin privileges required for bulk upload'}, status=403)
        
        # Path to dspace_uploader
        uploader_path = os.path.join(settings.BASE_DIR, 'dspace_uploader')
        bulk_script = os.path.join(uploader_path, 'bulk_upload.py')
        
        if not os.path.exists(bulk_script):
            return Response({'error': 'Bulk upload script not found'}, status=500)
        
        # Set environment variables for the upload
        env = os.environ.copy()
        env['DSPACE_URL'] = 'http://localhost:8080'
        env['DSPACE_EMAIL'] = 'biruknigusie98@gmail.com'
        env['DSPACE_PASSWORD'] = 'Biruk@0115439'
        # Validate collection UUID and use user selection
        valid_collections = {
            '6ea6e295-3424-4d5a-a238-8bd21faf4f3c': 'Wemezeker',
            'ff080dfc-3524-40bd-922c-cd2601c76c4d': 'Mint collection'
        }
        
        if collection_id in valid_collections:
            env['COLLECTION_UUID'] = collection_id
            print(f"Using collection: {valid_collections[collection_id]} ({collection_id})")
        else:
            # Fallback to Mint collection
            env['COLLECTION_UUID'] = 'ff080dfc-3524-40bd-922c-cd2601c76c4d'
            print(f"Invalid collection {collection_id}, using fallback: Mint collection")
        print(f"Using collection UUID: {env['COLLECTION_UUID']}")
        
        # Execute bulk upload script with the directory path as argument
        try:
            result = subprocess.run(
                ['python3', bulk_script, directory_path],
                cwd=uploader_path,
                env=env,
                capture_output=True,
                text=True,
                timeout=3600  # 1 hour timeout
            )
            
            if result.returncode == 0:
                return Response({
                    'success': True,
                    'message': 'Successfully uploaded to DSpace',
                    'output': result.stdout
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Bulk upload failed',
                    'output': result.stderr
                }, status=500)
                
        except subprocess.TimeoutExpired:
            return Response({'error': 'Upload timeout - process took too long'}, status=408)
        except Exception as e:
            return Response({'error': f'Upload execution failed: {str(e)}'}, status=500)
            
    except Exception as e:
        return Response({'error': str(e)}, status=500)

from .real_dspace_api import RealDSpaceAPI

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_collections(request):
    """Get available DSpace collections"""
    try:
        dspace_api = RealDSpaceAPI()
        if dspace_api.authenticate():
            collections_data = dspace_api.get_collections()
            if collections_data:
                collections = []
                for item in collections_data:
                    collections.append({
                        'id': item.get('uuid', ''),
                        'name': item.get('name', 'Unnamed Collection')
                    })
                return Response({'collections': collections})
            else:
                return Response({'collections': [], 'error': 'No collections found or DSpace API error.'}, status=404)
        else:
            return Response({'error': 'DSpace authentication failed'}, status=500)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_metadata(request):
    """Get metadata files from directory"""
    try:
        directory_path = request.data.get('directory_path')
        
        if not directory_path or not os.path.exists(directory_path):
            return Response({'error': 'Invalid directory path'}, status=400)
        
        metadata_files = []
        
        for item in os.listdir(directory_path):
            item_path = os.path.join(directory_path, item)
            if os.path.isdir(item_path):
                metadata_file = os.path.join(item_path, 'metadata.xml')
                if os.path.exists(metadata_file):
                    try:
                        with open(metadata_file, 'r', encoding='utf-8') as f:
                            xml_content = f.read()
                        metadata_files.append({
                            'folder_name': item,
                            'xml_content': xml_content
                        })
                    except Exception as e:
                        print(f"Error reading {metadata_file}: {e}")
        
        return Response({'metadata_files': metadata_files})
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_metadata(request):
    """Update metadata file"""
    try:
        directory_path = request.data.get('directory_path')
        folder_name = request.data.get('folder_name')
        xml_content = request.data.get('xml_content')
        
        if not all([directory_path, folder_name, xml_content]):
            return Response({'error': 'Missing required fields'}, status=400)
        
        metadata_file = os.path.join(directory_path, folder_name, 'metadata.xml')
        
        if not os.path.exists(os.path.dirname(metadata_file)):
            return Response({'error': 'Folder does not exist'}, status=400)
        
        with open(metadata_file, 'w', encoding='utf-8') as f:
            f.write(xml_content)
        
        return Response({'success': True})
    except Exception as e:
        return Response({'error': str(e)}, status=500)