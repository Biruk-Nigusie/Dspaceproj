from django.urls import path
from . import views

urlpatterns = [
    path('check/', views.check_koha_connection, name='check_koha'),
    path('catalog/', views.catalog_dspace_item, name='catalog_dspace_item'),
    path('biblio/<int:biblio_id>/availability/', views.check_availability, name='check_availability'),
    path('biblio/<int:biblio_id>/items/', views.add_duplicate_item, name='add_duplicate_item'),
    path('map/', views.get_catalog_map, name='get_catalog_map'),
]

