from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from resources.models import Resource, SearchLog, DownloadLog

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_dashboard(request):
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=403)
    
    # Date range filter
    days = int(request.GET.get('days', 30))
    start_date = timezone.now() - timedelta(days=days)
    
    # Downloads per month
    downloads_data = DownloadLog.objects.filter(
        timestamp__gte=start_date
    ).extra(
        select={'month': "strftime('%%Y-%%m', timestamp)"}
    ).values('month').annotate(count=Count('id')).order_by('month')
    
    # Top searched keywords
    search_data = SearchLog.objects.filter(
        timestamp__gte=start_date
    ).values('query').annotate(count=Count('id')).order_by('-count')[:10]
    
    # Resource source distribution
    source_data = Resource.objects.values('source').annotate(count=Count('id'))
    
    # Most accessed materials
    popular_resources = Resource.objects.filter(
        download_count__gt=0
    ).order_by('-download_count')[:10].values('title', 'download_count')
    
    # User activity timeline
    activity_data = DownloadLog.objects.filter(
        timestamp__gte=start_date
    ).extra(
        select={'date': "date(timestamp)"}
    ).values('date').annotate(count=Count('id')).order_by('date')
    
    return Response({
        'downloads_per_month': list(downloads_data),
        'top_searches': list(search_data),
        'source_distribution': list(source_data),
        'popular_resources': list(popular_resources),
        'user_activity': list(activity_data),
        'total_resources': Resource.objects.count(),
        'total_downloads': DownloadLog.objects.count(),
        'total_searches': SearchLog.objects.count(),
    })