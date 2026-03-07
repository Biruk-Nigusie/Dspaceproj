import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .services import extract_text_from_file
from .utils import extract_metadata

logger = logging.getLogger(__name__)


class OCRExtractAPIView(APIView):
    """
    POST /api/ocr/extract/

    Accepts multiple files and returns combined extracted metadata.
    """

    def post(self, request):
        files = request.FILES.getlist("files")
        print("➡ backend/ocr/views.py:22 files:", files)

        if not files:
            return Response(
                {"error": "No files provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        combined_metadata = {}
        documents = []

        for file_obj in files:
            filename = file_obj.name

            try:
                raw_text = extract_text_from_file(file_obj)
                print("➡ backend/ocr/views.py:37 raw_text:", raw_text)

                metadata = extract_metadata(raw_text)

                for field, field_values in metadata.items():
                    if field not in combined_metadata or not isinstance(
                        combined_metadata.get(field), dict
                    ):
                        combined_metadata[field] = {}

                    if not isinstance(field_values, dict):
                        continue

                    for lang, values in field_values.items():
                        lang_values = combined_metadata[field].setdefault(lang, [])

                        if isinstance(values, list):
                            lang_values.extend(values)

                documents.append({"filename": filename, "status": "processed"})

            except Exception as e:
                logger.error(f"OCR processing failed for {filename}: {e}")
                documents.append(
                    {"filename": filename, "status": "failed", "error": str(e)}
                )

        filtered_metadata = {}
        for field, field_values in combined_metadata.items():
            if not isinstance(field_values, dict):
                continue

            non_empty_langs = {
                lang: values
                for lang, values in field_values.items()
                if isinstance(values, list) and len(values) > 0
            }

            if non_empty_langs:
                filtered_metadata[field] = non_empty_langs

        return Response(
            {
                "metadata": filtered_metadata,
                "documents": documents,
                "count": len(documents),
            },
            status=status.HTTP_200_OK,
        )
