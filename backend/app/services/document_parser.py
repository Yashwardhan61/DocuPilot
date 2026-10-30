import io
import base64
from typing import Dict, Any, List, Tuple
from pypdf import PdfReader

class DocumentParser:
    @staticmethod
    def extract_from_pdf(file_bytes: bytes) -> Tuple[str, List[Dict[str, Any]], int]:
        """
        Extracts text from PDF bytes page by page.
        Returns:
            full_text: concatenated text of all pages
            pages: list of dicts with page index (1-based) and text
            page_count: total pages
        """
        stream = io.BytesIO(file_bytes)
        reader = PdfReader(stream)
        pages_data = []
        full_text_parts = []

        for idx, page in enumerate(reader.pages):
            page_num = idx + 1
            extracted = page.extract_text() or ""
            pages_data.append({
                "page": page_num,
                "text": extracted
            })
            full_text_parts.append(f"--- [Page {page_num}] ---\n{extracted}")

        full_text = "\n\n".join(full_text_parts)
        return full_text, pages_data, len(reader.pages)

    @staticmethod
    def prepare_image(file_bytes: bytes, content_type: str) -> Dict[str, Any]:
        """
        Prepares image bytes for Gemini Vision inline data.
        """
        encoded = base64.b64encode(file_bytes).decode("utf-8")
        mime = content_type if content_type in ["image/png", "image/jpeg", "image/webp"] else "image/jpeg"
        return {
            "mime_type": mime,
            "data": encoded
        }

