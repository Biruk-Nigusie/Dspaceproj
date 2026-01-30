from django.contrib import admin
from .models import Resource, SearchLog, DownloadLog

@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ['title', 'source', 'resource_type', 'year', 'download_count', 'view_count']
    list_filter = ['source', 'resource_type', 'year']
    search_fields = ['title', 'authors', 'description']

@admin.register(SearchLog)
class SearchLogAdmin(admin.ModelAdmin):
    list_display = ['query', 'user', 'results_count', 'timestamp']
    list_filter = ['timestamp']
    search_fields = ['query']

@admin.register(DownloadLog)
class DownloadLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'resource', 'timestamp']
    list_filter = ['timestamp']
    search_fields = ['user__username', 'resource__title']