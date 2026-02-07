from django.urls import path
from . import views

urlpatterns = [
    path('check/', views.check_koha_connection, name='check_koha'),
    path('catalog/<int:resource_id>/', views.catalog_resource, name='catalog_resource'),
]
