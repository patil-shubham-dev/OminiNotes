"""
OCR Engine for OmniNotes AI
Extracts text from images using EasyOCR and PaddleOCR
"""

import os
import re
from PIL import Image
import numpy as np

# Try to import OCR libraries, with graceful fallbacks
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False

try:
    from paddleocr import PaddleOCR
    PADDLEOCR_AVAILABLE = True
except ImportError:
    PADDLEOCR_AVAILABLE = False

# Initialize OCR readers (lazy loading)
_easyocr_reader = None
_paddleocr_reader = None

def get_easyocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None and EASYOCR_AVAILABLE:
        print("Initializing EasyOCR...")
        _easyocr_reader = easyocr.Reader(['en'], gpu=False)
    return _easyocr_reader

def get_paddleocr_reader():
    global _paddleocr_reader
    if _paddleocr_reader is None and PADDLEOCR_AVAILABLE:
        print("Initializing PaddleOCR...")
        _paddleocr_reader = PaddleOCR(
            use_angle_cls=True,
            lang='en',
            show_log=False,
            use_gpu=False
        )
    return _paddleocr_reader


def preprocess_image(image_path: str) -> str:
    """Preprocess image for better OCR accuracy"""
    try:
        img = Image.open(image_path)

        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')

        # Resize if too large (max 4000px on longest side)
        max_size = 4000
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, Image.LANCZOS)

        # Enhance contrast
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.5)

        # Save preprocessed image
        preprocessed_path = image_path.replace('.', '_preprocessed.')
        img.save(preprocessed_path, quality=95)
        return preprocessed_path
    except Exception as e:
        print(f"Preprocessing error: {e}")
        return image_path


def extract_with_easyocr(image_path: str) -> str:
    """Extract text using EasyOCR"""
    reader = get_easyocr_reader()
    if reader is None:
        return ""

    try:
        results = reader.readtext(image_path, detail=0, paragraph=True)
        return "\n".join(results)
    except Exception as e:
        print(f"EasyOCR error: {e}")
        return ""


def extract_with_paddleocr(image_path: str) -> str:
    """Extract text using PaddleOCR"""
    reader = get_paddleocr_reader()
    if reader is None:
        return ""

    try:
        result = reader.ocr(image_path, cls=True)
        if result and len(result) > 0 and result[0]:
            texts = [line[1][0] for line in result[0]]
            return "\n".join(texts)
        return ""
    except Exception as e:
        print(f"PaddleOCR error: {e}")
        return ""


def extract_text_from_image(image_path: str) -> str:
    """
    Extract text from image using available OCR engines.
    Tries multiple engines and combines results for best accuracy.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    # Preprocess image
    preprocessed = preprocess_image(image_path)

    texts = []

    # Try EasyOCR first
    if EASYOCR_AVAILABLE:
        easy_text = extract_with_easyocr(preprocessed)
        if easy_text.strip():
            texts.append(easy_text)

    # Try PaddleOCR as fallback/complement
    if PADDLEOCR_AVAILABLE:
        paddle_text = extract_with_paddleocr(preprocessed)
        if paddle_text.strip():
            texts.append(paddle_text)

    # If no OCR engines available, use pytesseract as last resort
    if not texts:
        try:
            import pytesseract
            img = Image.open(preprocessed)
            tesseract_text = pytesseract.image_to_string(img)
            if tesseract_text.strip():
                texts.append(tesseract_text)
        except ImportError:
            pass

    # Cleanup preprocessed file
    if preprocessed != image_path and os.path.exists(preprocessed):
        try:
            os.remove(preprocessed)
        except:
            pass

    # Combine results - use longest text as it's likely more complete
    if texts:
        best_text = max(texts, key=len)
        return clean_extracted_text(best_text)

    return "[No text detected in image]"


def clean_extracted_text(text: str) -> str:
    """Clean up OCR output"""
    # Remove excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Fix common OCR errors
    text = text.replace('|', 'I')  # Pipe to I
    # Remove non-printable characters
    text = ''.join(char for char in text if char.isprintable() or char in '\n\t')
    return text.strip()


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF (try direct extraction, then OCR fallback)"""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(pdf_path)
        text_content = []
        
        has_text = False
        for page in doc:
            text = page.get_text()
            if text.strip():
                has_text = True
            text_content.append(text)
        
        if has_text:
            return "\n\n---\n\n".join(text_content)
        
        # Fallback to OCR if no text layers found
        from pdf2image import convert_from_path
        images = convert_from_path(pdf_path, dpi=200)
        texts = []
        for i, image in enumerate(images):
            temp_path = f"{pdf_path}_page_{i}.png"
            image.save(temp_path, 'PNG')
            text = extract_text_from_image(temp_path)
            texts.append(text)
            if os.path.exists(temp_path):
                os.remove(temp_path)
        return "\n\n---\n\n".join(texts)
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return "[Error extracting PDF content]"
