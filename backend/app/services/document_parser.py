import io
import base64
from typing import Dict, Any, List, Tuple
from pypdf import PdfReader

class DocumentParser:
    @staticmethod
    def extract_from_pdf(file_bytes: bytes) -> Tuple[str, List[Dict[str, Any]], int]:
        """
        Extracts text from PDF bytes page by page with resilient exception handling.
        """
        pages_data = []
        full_text_parts = []
        try:
            stream = io.BytesIO(file_bytes)
            reader = PdfReader(stream)
            for idx, page in enumerate(reader.pages):
                page_num = idx + 1
                try:
                    extracted = page.extract_text() or ""
                except Exception:
                    extracted = ""
                pages_data.append({
                    "page": page_num,
                    "text": extracted
                })
                full_text_parts.append(f"--- [Page {page_num}] ---\n{extracted}")
            page_count = len(reader.pages)
        except Exception:
            # Fallback text decoding for truncated or non-standard binary streams
            raw_fallback = file_bytes.decode("utf-8", errors="ignore")
            full_text_parts = [raw_fallback]
            pages_data = [{"page": 1, "text": raw_fallback}]
            page_count = 1

        full_text = "\n\n".join(full_text_parts).strip()
        return full_text, pages_data, max(1, page_count)

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

