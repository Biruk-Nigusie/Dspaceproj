from django.urls import path
from . import views, bulk_views

urlpatterns = [
    # Global Search & General Resources
    path('search/', views.search_resources, name='search_resources'),
    path('recent/', views.recent_resources, name='recent_resources'),
    path('downloads/', views.user_downloads, name='user_downloads'),
    path('<int:resource_id>/', views.get_resource, name='get_resource'),
    path('<int:resource_id>/download/', views.download_resource, name='download_resource'),
    
    # DSpace Specific (Legacy path compatibility)
    path('dspace/hierarchy/', views.get_dspace_hierarchy, name='get_dspace_hierarchy'),
    path('dspace-items/', views.get_dspace_items, name='get_dspace_items'),
    path('dspace-bitstream/<path:handle_id>/', views.get_dspace_bitstream, name='get_dspace_bitstream'),
    path('check-dspace/', views.check_dspace_connection, name='check_dspace'),
    
    # Workflows
    path('upload/', views.upload_resource, name='upload_resource'),
    path('catalog-external/', views.catalog_external_dspace, name='catalog_external_dspace'),
    
    # Catalog Specific (New)
    path('catalog/collections/', views.get_catalog_collections, name='catalog_collections'),
    path('catalog/items/', views.get_catalog_items, name='catalog_items'),
    
    # Bulk & Utils
    path('bulk/upload/', bulk_views.bulk_upload, name='bulk_upload'),
    path('pdf/rotate/', views.pdf_rotate, name='pdf_rotate'),
    path('pdf/split/', views.pdf_split, name='pdf_split'),
    path('pdf/merge/', views.pdf_merge, name='pdf_merge'),
    path('pdf/rename/', views.pdf_rename, name='pdf_rename'),
]
