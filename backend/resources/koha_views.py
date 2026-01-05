from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .koha_rest_api import KohaRestAPI

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_biblio(request):
    """Create bibliographic record in Koha"""
    if not request.user.is_staff:
        return Response({'error': 'Admin access required'}, status=403)
    
    data = request.data
    required_fields = ['title']
    
    for field in required_fields:
        if not data.get(field):
            return Response({'error': f'{field} is required'}, status=400)
    
    try:
        koha_api = KohaRestAPI()
        
        if not koha_api.authenticate():
            return Response({'error': 'Koha authentication failed'}, status=503)
        
        metadata = {
            'title': data.get('title'),
            'authors': data.get('author', ''),
            'description': data.get('description', ''),
            'year': data.get('year', ''),
            'subject': data.get('subject', ''),
            'notes': f"Created by {request.user.username}"
        }
        
        # Add ISBN and publisher to notes if provided
        if data.get('isbn'):
            metadata['notes'] += f" - ISBN: {data.get('isbn')}"
        if data.get('publisher'):
            metadata['notes'] += f" - Publisher: {data.get('publisher')}"
        
        biblio = koha_api.create_biblio(metadata)
        
        if not biblio:
            return Response({'error': 'Failed to create bibliographic record'}, status=500)
        
        biblio_id = biblio.get('id')
        
        return Response({
            'message': 'Bibliographic record created successfully',
            'biblio_id': biblio_id,
            'opac_url': f"http://127.0.0.1:8085/cgi-bin/koha/opac-detail.pl?biblionumber={biblio_id}"
        }, status=201)
        
    except Exception as e:
        return Response({'error': f'Creation failed: {str(e)}'}, status=500)