import logging
import cv2
import numpy as np
import pytesseract
from PIL import Image
from pdf2image import convert_from_bytes
import io
from pathlib import Path
import uuid

logger = logging.getLogger(__name__)


Image.MAX_IMAGE_PIXELS = None


def correct_orientation(image: Image.Image) -> Image.Image:
    """
    Detect orientation using Tesseract OSD and rotate image if needed.
    """
    img = np.array(image)

    try:
        osd = pytesseract.image_to_osd(img)
    except Exception:
        return image

    rotation = 0

    for line in osd.split("\n"):
        if "Rotate:" in line:
            rotation = int(line.split(":")[1].strip())
            break

    if rotation == 0:
        return image

    print("➡ backend/ocr/services.py:36 rotation:", rotation)
    if rotation == 90:
        rotated = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    elif rotation == 180:
        rotated = cv2.rotate(img, cv2.ROTATE_180)
    elif rotation == 270:
        rotated = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
    else:
        rotated = img

    return Image.fromarray(rotated)


def preprocess_image(image: Image.Image, debug: bool = False) -> np.ndarray:
    """
    Preprocess image for better OCR accuracy.
    - Convert to grayscale
    - Apply Gaussian blur to remove noise
    - Apply Otsu's thresholding
    """
    # Convert PIL Image to OpenCV numpy array
    img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

    # 1. Grayscale
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)

    # 2. Noise removal
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # 3. Thresholding
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    if debug:
        debug_dir = Path("ocr_debug")
        debug_dir.mkdir(parents=True, exist_ok=True)

        uid = uuid.uuid4().hex

        cv2.imwrite(str(debug_dir / f"{uid}_gray.png"), gray)
        cv2.imwrite(str(debug_dir / f"{uid}_blur.png"), blurred)
        cv2.imwrite(str(debug_dir / f"{uid}_thresh.png"), thresh)

    return thresh


def perform_ocr_on_image(image: Image.Image) -> str:
    """
    Execute OCR using Tesseract with Amharic and English models.
    """
    try:
        image = correct_orientation(image)
        preprocessed = preprocess_image(image)

        # pytesseract can take numpy array directly
        text = pytesseract.image_to_string(preprocessed, lang="amh+eng")
        return text
    except Exception as e:
        logger.error(f"OCR Error during image processing: {e}")
        return ""


def extract_text_from_file(file_obj) -> str:
    """
    Process file object (image or PDF) and return OCR text.
    Handles multiple pages for PDFs.
    """
    filename = file_obj.name.lower()

    # Reset file pointer just in case
    file_obj.seek(0)
    file_bytes = file_obj.read()

    text_content = []

    try:
        if filename.endswith(".pdf"):
            images = convert_from_bytes(file_bytes)
            for img in images:
                page_text = perform_ocr_on_image(img)
                text_content.append(page_text)
        else:
            image = Image.open(io.BytesIO(file_bytes))

            text = perform_ocr_on_image(image)
            text_content.append(text)
    except Exception as e:
        logger.error(f"Error processing file {filename}: {e}")
        # Return what we've extracted so far or empty string
        raise e

    return "\n".join(text_content).strip()
