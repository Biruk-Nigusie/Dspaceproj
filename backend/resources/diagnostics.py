from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .koha_rest_api import KohaRestAPI
from .real_dspace_api import RealDSpaceAPI
from .real_vufind_api import RealVuFindAPI

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_koha_connection(request):
    """Check Koha connection status"""
    koha_api = KohaRestAPI()
    if koha_api.authenticate():
        return Response({'status': 'online', 'message': 'Koha connection successful'})
    return Response({'status': 'offline', 'message': 'Koha connection failed'}, status=503)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_dspace_connection(request):
    """Check DSpace connection status"""
    dspace_api = RealDSpaceAPI()
    if dspace_api.authenticate():
        return Response({'status': 'online', 'message': 'DSpace connection successful'})
    return Response({'status': 'offline', 'message': 'DSpace connection failed'}, status=503)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_vufind_connection(request):
    """Check VuFind connection status"""
    vufind_api = RealVuFindAPI()
    if vufind_api.test_connection():
        return Response({'status': 'online', 'message': 'VuFind connection successful'})
    return Response({'status': 'offline', 'message': 'VuFind connection failed'}, status=503)