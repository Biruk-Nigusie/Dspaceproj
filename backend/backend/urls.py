from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


urlpatterns = [
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"
    ),
    path("admin/", admin.site.urls),
    path("api/auth/", include("authentication.urls")),
    path("api/resources/", include("resources.urls")),
    path("api/analytics/", include("analytics.urls")),
    path("api/koha/", include("koha_urls")),
    path("api/dspace/", include("dspace_urls")),
    path("api/ocr/", include("ocr.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
