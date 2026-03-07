from django.urls import path
from .views import OCRExtractAPIView

urlpatterns = [
    path("extract/", OCRExtractAPIView.as_view(), name="ocr-extract"),
]
