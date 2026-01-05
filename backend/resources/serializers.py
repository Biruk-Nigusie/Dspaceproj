from rest_framework import serializers
from .models import Resource, SearchLog, DownloadLog, UploadedFile

class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = '__all__'

class SearchLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchLog
        fields = '__all__'

class DownloadLogSerializer(serializers.ModelSerializer):
    resource_title = serializers.CharField(source='resource.title', read_only=True)
    
    class Meta:
        model = DownloadLog
        fields = ['id', 'resource', 'resource_title', 'timestamp']

class UploadedFileSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = UploadedFile
        fields = ['id', 'title', 'description', 'file_url', 'dspace_id', 'created_at']
    
    def get_file_url(self, obj):
        return obj.file.url if obj.file else None