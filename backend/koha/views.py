from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from .api import KohaRestAPI
from .catalog_service import KohaCatalogService
from dspace.client import DSpaceClient
from dspace.config import DSPACE_API_BASE
from dspace.models import Resource
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_koha_connection(request):
    """Check if Koha API is accessible"""
    koha_api = KohaRestAPI()
    if koha_api.authenticate():
        return Response({'status': 'online', 'message': 'Koha connected'})
    return Response({'status': 'offline', 'message': 'Koha connection failed'}, status=503)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def catalog_dspace_item(request):
    """
    Catalog a DSpace item into Koha
    
    Request body:
    {
        "dspace_uuid": "abc-123-def",
        "physical_item": {
            "barcode": "10005",
            "home_library_id": "CPL",
            "item_type_id": "BOOK",
            "call_number": "123.45 ABC",
            "copy_number": 1,
            "notes": "Optional notes"
        }
    }
    """
    try:
        dspace_uuid = request.data.get('dspace_uuid')
        physical_item_data = request.data.get('physical_item')
        
        if not dspace_uuid:
            return Response(
                {'error': 'dspace_uuid is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Fetch DSpace item
        dspace_client = DSpaceClient()
        if not dspace_client.test_connection():
            return Response(
                {'error': 'Cannot connect to DSpace'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Check if dspace_uuid is actually a handle (contains /)
        if '/' in dspace_uuid:
            # It's a handle, need to resolve to UUID first
            logger.info(f"Resolving handle {dspace_uuid} to UUID")
            handle_url = f"{DSPACE_API_BASE}/core/items?handle={dspace_uuid}"
            handle_response = dspace_client.session.get(handle_url)
            
            if handle_response.status_code == 200:
                items = handle_response.json()
                if items and len(items) > 0:
                    actual_uuid = items[0].get('uuid') or items[0].get('id')
                    logger.info(f"Resolved handle {dspace_uuid} to UUID {actual_uuid}")
                    dspace_uuid = actual_uuid
                else:
                    return Response(
                        {'error': f'DSpace item not found for handle: {dspace_uuid}'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                # Try alternative: fetch by handle directly
                handle_url = f"{DSPACE_API_BASE}/core/handle/{dspace_uuid}"
                handle_response = dspace_client.session.get(handle_url)
                if handle_response.status_code == 200:
                    dspace_item = handle_response.json()
                    actual_uuid = dspace_item.get('uuid') or dspace_item.get('id')
                    if actual_uuid:
                        dspace_uuid = actual_uuid
                    else:
                        return Response(
                            {'error': f'Could not resolve handle to UUID: {dspace_uuid}'},
                            status=status.HTTP_404_NOT_FOUND
                        )
        
        # Get item from DSpace by UUID
        item_url = f"{DSPACE_API_BASE}/core/items/{dspace_uuid}"
        response = dspace_client.session.get(item_url)
        
        if response.status_code != 200:
            return Response(
                {'error': f'DSpace item not found: {dspace_uuid}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        dspace_item = response.json()
        
        # Build DSpace handle URL
        handle = dspace_item.get('handle', '')
        if handle:
            dspace_handle_url = f"http://localhost:4000/handle/{handle}"
        else:
            dspace_handle_url = f"http://localhost:4000/items/{dspace_uuid}"
        
        # Catalog the item
        catalog_service = KohaCatalogService()
        result = catalog_service.catalog_dspace_item(
            dspace_item,
            dspace_handle_url,
            physical_item_data
        )
        
        # Check for duplicate error (implies success)
        if not result.get('success') and 'Duplicate biblio' in str(result.get('error', '')):
            try:
                import re
                match = re.search(r'Duplicate biblio (\d+)', str(result.get('error')))
                if match:
                    result['success'] = True
                    result['biblio_id'] = match.group(1)
                    result['error'] = None
                    logger.info(f"Item already cataloged as biblio {result['biblio_id']}")
            except Exception:
                pass

        if result['success']:
            # UPDATE LOCAL RESOURCE MODEL
            try:
                resource_obj, _ = Resource.objects.get_or_create(
                    source='dspace',
                    external_id=dspace_uuid,
                    defaults={'title': dspace_item.get('name', 'Untitled Resource')}
                )
                meta = resource_obj.metadata or {}
                meta['koha_id'] = result['biblio_id']
                meta['is_cataloged'] = True
                resource_obj.metadata = meta
                resource_obj.save()
                logger.info(f"Updated local Resource {resource_obj.id} with Koha ID")
            except Exception as e:
                logger.error(f"Failed to update Resource model: {e}")

            # Update DSpace item with Koha ID
            try:
                # Add koha_id to DSpace metadata
                biblio_id = result['biblio_id']
                # Note: Updating DSpace metadata requires authentication and proper permissions
                # This is a placeholder - implement based on your DSpace setup
                logger.info(f"DSpace item {dspace_uuid} cataloged to Koha biblio {biblio_id}")
            except Exception as e:
                logger.warning(f"Could not update DSpace metadata: {e}")
            
            return Response(result, status=status.HTTP_201_CREATED)
        else:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Error cataloging DSpace item: {str(e)}", exc_info=True)
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def get_catalog_map(request):
    """Return map of DSpace UUID -> Koha Biblio ID"""
    data = {}
    try:
        resources = Resource.objects.filter(source='dspace')
        for r in resources:
            meta = r.metadata or {}
            if meta.get('is_cataloged'):
                data[r.external_id] = meta.get('koha_id')
    except Exception as e:
        logger.error(f"Error generating catalog map: {e}")
    return Response(data)


@api_view(['GET'])
def check_availability(request, biblio_id):
    """
    Check availability of physical items for a bibliographic record
    
    Returns:
    {
        "biblio_id": 2,
        "total_items": 3,
        "available_count": 2,
        "checked_out_count": 1,
        "items": [...]
    }
    """
    try:
        catalog_service = KohaCatalogService()
        result = catalog_service.check_availability(biblio_id)
        return Response(result)
    except Exception as e:
        logger.error(f"Error checking availability: {str(e)}", exc_info=True)
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_duplicate_item(request, biblio_id):
    """
    Add a duplicate physical item to an existing bibliographic record
    
    Request body:
    {
        "barcode": "10006",
        "home_library_id": "CPL",
        "item_type_id": "BOOK",
        "call_number": "123.45 ABC",
        "copy_number": 2,
        "notes": "Optional notes"
    }
    """
    try:
        item_data = request.data
        
        if not item_data.get('barcode'):
            return Response(
                {'error': 'barcode is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        catalog_service = KohaCatalogService()
        result = catalog_service.add_physical_item(biblio_id, item_data)
        
        if result['success']:
            return Response(result, status=status.HTTP_201_CREATED)
        else:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Error adding duplicate item: {str(e)}", exc_info=True)
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )