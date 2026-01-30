import os
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .koha_rest_api import KohaRestAPI
from .real_dspace_api import RealDSpaceAPI

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def authenticate_koha(request):
    """Authenticate with Koha system"""
    if not request.user.is_staff:
        return Response({'error': 'Admin access required'}, status=403)
    
    try:
        koha_api = KohaRestAPI()
        
        if koha_api.authenticate():
            return Response({
                'message': 'Koha authentication successful',
                'status': 'authenticated',
                'system': 'koha'
            })
        else:
            return Response({
                'error': 'Koha authentication failed',
                'status': 'failed'
            }, status=503)
            
    except Exception as e:
        return Response({
            'error': f'Koha connection error: {str(e)}',
            'status': 'error'
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def authenticate_dspace(request):
    """Authenticate with DSpace system"""
    if not request.user.is_staff:
        return Response({'error': 'Admin access required'}, status=403)
    
    try:
        dspace_api = RealDSpaceAPI()
        
        if dspace_api.authenticate():
            return Response({
                'message': 'DSpace authentication successful',
                'status': 'authenticated',
                'system': 'dspace'
            })
        else:
            return Response({
                'error': 'DSpace authentication failed',
                'status': 'failed'
            }, status=503)
            
    except Exception as e:
        return Response({
            'error': f'DSpace connection error: {str(e)}',
            'status': 'error'
        }, status=500)