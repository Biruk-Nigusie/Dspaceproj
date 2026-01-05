from django.urls import path
from resources import koha_views, auth_views

urlpatterns = [
    path('create-biblio/', koha_views.create_biblio, name='create_biblio'),
    path('authenticate/', auth_views.authenticate_koha, name='authenticate_koha'),
]