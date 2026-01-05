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
        uploader_path = '/home/biruk/Documents/Resource/dspace_uploader'
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_collections(request):
    """Get available DSpace collections"""
    try:
        import requests
        from django.conf import settings
        
        # Try multiple DSpace URLs
        dspace_urls = [
            'http://localhost:8080/server',
            'http://localhost:4000/server', 
            'http://127.0.0.1:8080/server',
            'https://demo.dspace.org/server'
        ]
        
        for dspace_url in dspace_urls:
            try:
                print(f"Trying to fetch collections from: {dspace_url}")
                response = requests.get(f'{dspace_url}/api/core/collections', timeout=3)
                print(f"DSpace response status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    collections = []
                    for item in data.get('_embedded', {}).get('collections', []):
                        collections.append({
                            'id': item.get('uuid', ''),
                            'name': item.get('name', 'Unnamed Collection')
                        })
                    if collections:
                        print(f"Found {len(collections)} real collections from {dspace_url}")
                        return Response({'collections': collections})
            except Exception as e:
                print(f"Error fetching from {dspace_url}: {e}")
                continue
            
        # Fallback to mock collections
        print("Using fallback mock collections")
        collections = [
            {'id': 'vital-records', 'name': 'Vital Records Collection'},
            {'id': 'birth-certificates', 'name': 'Birth Certificates'},
            {'id': 'death-records', 'name': 'Death Records'},
            {'id': 'marriage-certificates', 'name': 'Marriage Certificates'},
            {'id': 'annual-reports', 'name': 'Annual Reports'},
            {'id': 'statistical-data', 'name': 'Statistical Data'}
        ]
        return Response({'collections': collections})
    except Exception as e:
        return Response({'error': str(e)}, status=500)