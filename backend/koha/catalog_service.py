"""
Koha Catalog Service
Handles cataloging DSpace items into Koha and managing physical items
"""

from .api import KohaRestAPI
from .marc_converter import dspace_to_marc21
from dspace.client import DSpaceClient
import logging

logger = logging.getLogger(__name__)


class KohaCatalogService:
    """Service for cataloging DSpace items into Koha"""
    
    def __init__(self):
        self.koha_api = KohaRestAPI()
    
    def catalog_dspace_item(self, dspace_item, dspace_handle_url, physical_item_data=None):
        """
        Catalog a DSpace item into Koha
        
        Args:
            dspace_item: DSpace item object with metadata
            dspace_handle_url: Full URL to DSpace item
            physical_item_data: Optional dict with physical item details
                {
                    'barcode': str (required),
                    'home_library_id': str (default: 'CPL'),
                    'item_type_id': str (default: 'BOOK'),
                    'call_number': str (optional),
                    'copy_number': int (default: 1),
                    'notes': str (optional)
                }
        
        Returns:
            dict: {
                'success': bool,
                'biblio_id': int,
                'item_id': int (if physical_item_data provided),
                'error': str (if failed)
            }
        """
        try:
            # Step 1: Convert DSpace metadata to MARC21
            logger.info(f"Converting DSpace item to MARC21: {dspace_handle_url}")
            marc_record = dspace_to_marc21(dspace_item, dspace_handle_url)
            
            # Step 2: Create bibliographic record in Koha
            logger.info("Creating bibliographic record in Koha")
            biblio_result = self.koha_api.create_biblio_from_marc(marc_record)
            
            if not biblio_result or 'id' not in biblio_result:
                error_msg = biblio_result.get('error') if biblio_result and isinstance(biblio_result, dict) and 'error' in biblio_result else 'Failed to create bibliographic record in Koha'
                return {
                    'success': False,
                    'error': error_msg
                }
            
            biblio_id = biblio_result['id']
            logger.info(f"Bibliographic record created with ID: {biblio_id}")
            
            result = {
                'success': True,
                'biblio_id': biblio_id
            }
            
            # Step 3: Create physical item if data provided
            # NOTE: Physical item creation disabled as requested
            # The biblio record is created successfully, but no physical items are added
            # This allows the record to exist in Koha without inventory management
            if physical_item_data and False:  # Disabled
                logger.info(f"Creating physical item for biblio {biblio_id}")
                item_result = self.add_physical_item(biblio_id, physical_item_data)
                
                if item_result['success']:
                    result['item_id'] = item_result['item_id']
                else:
                    result['item_warning'] = item_result.get('error', 'Failed to create physical item')
            
            return result
            
        except Exception as e:
            logger.error(f"Error cataloging DSpace item: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    
    def add_physical_item(self, biblio_id, item_data):
        """
        Add a physical item to an existing bibliographic record
        
        Args:
            biblio_id: Koha bibliographic record ID
            item_data: dict with physical item details
        
        Returns:
            dict: {'success': bool, 'item_id': int, 'error': str}
        """
        try:
            # Prepare item data for Koha API
            koha_item_data = {
                'external_id': item_data.get('barcode'),  # Barcode
                'home_library_id': item_data.get('home_library_id', 'CPL'),
                'holding_library_id': item_data.get('holding_library_id', item_data.get('home_library_id', 'CPL')),
                'item_type_id': item_data.get('item_type_id', 'BOOK'),
                'not_for_loan_status': 0,  # 0 = can borrow
            }
            
            # Optional fields
            if item_data.get('call_number'):
                koha_item_data['callnumber'] = item_data['call_number']
            
            if item_data.get('copy_number'):
                koha_item_data['copy_number'] = item_data['copy_number']
            
            if item_data.get('notes'):
                koha_item_data['public_notes'] = item_data['notes']
            
            # Create item in Koha
            item_result = self.koha_api.add_item(biblio_id, koha_item_data)
            
            if item_result and 'item_id' in item_result:
                return {
                    'success': True,
                    'item_id': item_result['item_id']
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to create item in Koha'
                }
                
        except Exception as e:
            logger.error(f"Error adding physical item: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    
    def check_availability(self, biblio_id):
        """
        Check availability of physical items for a bibliographic record
        
        Args:
            biblio_id: Koha bibliographic record ID
        
        Returns:
            dict: {
                'biblio_id': int,
                'total_items': int,
                'available_count': int,
                'checked_out_count': int,
                'items': list of item details
            }
        """
        try:
            # Get biblio record
            biblio = self.koha_api.get_biblio(biblio_id)
            if not biblio:
                return {
                    'biblio_id': biblio_id,
                    'total_items': 0,
                    'available_count': 0,
                    'checked_out_count': 0,
                    'items': [],
                    'error': 'Bibliographic record not found'
                }
            
            # Get items for this biblio
            items = self.koha_api.get_biblio_items(biblio_id)
            
            if not items:
                return {
                    'biblio_id': biblio_id,
                    'total_items': 0,
                    'available_count': 0,
                    'checked_out_count': 0,
                    'items': []
                }
            
            # Count availability
            total_items = len(items)
            available_count = 0
            checked_out_count = 0
            
            item_details = []
            for item in items:
                is_available = not item.get('checked_out', False)
                if is_available:
                    available_count += 1
                else:
                    checked_out_count += 1
                
                item_details.append({
                    'item_id': item.get('item_id'),
                    'barcode': item.get('external_id'),
                    'status': 'available' if is_available else 'checked_out',
                    'home_library': item.get('home_library_id'),
                    'call_number': item.get('callnumber', '')
                })
            
            return {
                'biblio_id': biblio_id,
                'total_items': total_items,
                'available_count': available_count,
                'checked_out_count': checked_out_count,
                'items': item_details
            }
            
        except Exception as e:
            logger.error(f"Error checking availability: {str(e)}", exc_info=True)
            return {
                'biblio_id': biblio_id,
                'total_items': 0,
                'available_count': 0,
                'checked_out_count': 0,
                'items': [],
                'error': str(e)
            }
