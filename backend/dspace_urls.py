from django.urls import path
from resources import auth_views

urlpatterns = [
    path('authenticate/', auth_views.authenticate_dspace, name='authenticate_dspace'),
]