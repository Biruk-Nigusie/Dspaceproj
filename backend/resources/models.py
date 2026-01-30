from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Resource(models.Model):
    SOURCE_CHOICES = [
        ('koha', 'Koha'),
        ('dspace', 'DSpace'),
    ]
    
    TYPE_CHOICES = [
        ('book', 'Book'),
        ('article', 'Article'),
        ('thesis', 'Thesis'),
        ('report', 'Report'),
        ('image', 'Image'),
        ('document', 'Document'),
    ]
    
    title = models.CharField(max_length=500)
    authors = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES)
    resource_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    year = models.IntegerField(null=True, blank=True)
    publisher = models.CharField(max_length=200, blank=True)
    external_id = models.CharField(max_length=100)
    download_url = models.URLField(blank=True)
    view_url = models.URLField(blank=True)
    thumbnail_url = models.URLField(blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    download_count = models.IntegerField(default=0)
    view_count = models.IntegerField(default=0)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['source', 'external_id']
    
    def __str__(self):
        return self.title

class SearchLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    query = models.CharField(max_length=500)
    results_count = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
class DownloadLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)

class UploadedFile(models.Model):
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='uploads/')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    dspace_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title