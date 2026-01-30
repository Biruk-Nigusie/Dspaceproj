from django.urls import path
from . import views, diagnostics, bulk_views

urlpatterns = [
    path('dspace-items/', views.get_dspace_items, name='get_dspace_items'),
    path('bitstream/<str:bitstream_uuid>/', views.get_bitstream, name='get_bitstream'),
    path('dspace-bitstream/<path:handle_id>/', views.get_dspace_bitstream, name='get_dspace_bitstream'),
    path('search/', views.search_resources, name='search_resources'),
    path('recent/', views.recent_resources, name='recent_resources'),
    path('downloads/', views.user_downloads, name='user_downloads'),
    path('upload/', views.upload_resource, name='upload_resource'),
    path('upload-file/', views.upload_file, name='upload_file'),
    path('uploaded-files/', views.list_uploaded_files, name='list_uploaded_files'),
    path('search-files/', views.search_uploaded_files, name='search_uploaded_files'),
    path('<int:resource_id>/', views.get_resource, name='get_resource'),
    path('<int:resource_id>/download/', views.download_resource, name='download_resource'),
    path('<int:resource_id>/preview/', views.preview_resource, name='preview_resource'),
    path('check-koha/', diagnostics.check_koha_connection, name='check_koha'),
    path('check-dspace/', diagnostics.check_dspace_connection, name='check_dspace'),
    path('check-vufind/', diagnostics.check_vufind_connection, name='check_vufind'),
    path('bulk/count-folders/', bulk_views.count_folders, name='count_folders'),
    path('bulk/upload/', bulk_views.bulk_upload, name='bulk_upload_new'),
    path('bulk/collections/', bulk_views.get_collections, name='get_collections'),
    path('bulk/metadata/', bulk_views.get_metadata, name='get_metadata'),
    path('bulk/update-metadata/', bulk_views.update_metadata, name='update_metadata'),
    path('<int:resource_id>/catalog/', views.catalog_resource, name='catalog_resource'),
    path('catalog-external/', views.catalog_external_dspace, name='catalog_external_dspace'),
    path('koha-metadata/<int:biblio_id>/', views.get_koha_item_metadata, name='get_koha_item_metadata'),
]