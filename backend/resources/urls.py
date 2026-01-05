from django.urls import path
from . import views, test_views, bulk_views

urlpatterns = [
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
    path('test-koha/', test_views.test_koha, name='test_koha'),
    path('test-dspace/', test_views.test_dspace, name='test_dspace'),
    path('test-vufind/', test_views.test_vufind, name='test_vufind'),
    path('bulk/count-folders/', bulk_views.count_folders, name='count_folders'),
    path('bulk/upload/', bulk_views.bulk_upload, name='bulk_upload_new'),
    path('bulk/collections/', bulk_views.get_collections, name='get_collections'),
]