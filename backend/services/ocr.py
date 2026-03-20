import pytesseract
from PIL import Image
from pdf2image import convert_from_bytes
import io
from typing import Optional
import logging

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

logger = logging.getLogger(__name__)


def extract_text_from_image_bytes(image_bytes: bytes) -> str:
    try:
        image = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(image, lang="spa+eng")
        text = text.strip()
        if len(text) < 30:
            raise ValueError(
                "No se pudo extraer suficiente texto de la imagen. "
                "Asegúrate de que la imagen contenga texto legible sobre fondo claro."
            )
        return text
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Error en OCR de imagen: {e}")
        raise ValueError(f"No se pudo extraer texto de la imagen: {e}")


def extract_text_from_scanned_pdf(pdf_bytes: bytes) -> str:
    """Convierte PDF a imágenes y aplica OCR a cada página."""
    try:
        images = convert_from_bytes(pdf_bytes, dpi=200)
        all_text = []
        for i, image in enumerate(images):
            text = pytesseract.image_to_string(image, lang="spa+eng")
            if text.strip():
                all_text.append(f"[Página {i + 1}]\n{text.strip()}")
        return "\n\n".join(all_text)
    except Exception as e:
        logger.error(f"Error en OCR de PDF: {e}")
        raise ValueError(f"No se pudo procesar el PDF escaneado: {e}")


def is_pdf_scanned(pdf_bytes: bytes) -> bool:
    """Detecta si un PDF es mayormente escaneado (sin texto extraíble)."""
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        total_text = ""
        pages_checked = min(3, len(reader.pages))
        for i in range(pages_checked):
            total_text += reader.pages[i].extract_text() or ""
        # Si hay muy poco texto, probablemente es escaneado
        return len(total_text.strip()) < 50
    except Exception:
        return False
