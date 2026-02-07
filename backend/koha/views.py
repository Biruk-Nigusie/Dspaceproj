from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .api import KohaRestAPI
from dspace.models import Resource
from dspace.services import ResourceService

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_koha_connection(request):
    koha_api = KohaRestAPI()
    if koha_api.authenticate():
        return Response({'status': 'online', 'message': 'Koha connected'})
    return Response({'status': 'offline', 'message': 'Koha connection failed'}, status=503)

@api_view(['POST'])
def catalog_resource(request, resource_id):
    if not request.user.is_authenticated: return Response({'error': 'Auth required'}, status=401)
    try:
        resource = Resource.objects.get(id=resource_id)
        if resource.source != 'dspace': return Response({'error': 'Only DSpace items supported'}, status=400)
        
        res = ResourceService.catalog_in_koha(resource.metadata or {'title': resource.title}, resource.view_url)
        resource.metadata['koha_id'] = res.get('biblio_id')
        resource.save()
        return Response({'message': 'Cataloged', **res})
    except Resource.DoesNotExist: return Response({'error': 'Not found'}, status=404)
    except Exception as e: return Response({'error': str(e)}, status=500)