from pathlib import Path

def extract_text_from_pdf(file_path: str) -> list[dict]:
    """
    Extract text from a PDF page by page.
    Uses PyMuPDF if available, with pypdf fallback.
    Returns:
        A list containing page numbers and extracted text.
    """
    pages = []

    # 1. Try PyMuPDF
    try:
        import pymupdf
        document = pymupdf.open(file_path)
        try:
            for page_number, page in enumerate(document, start=1):
                text = page.get_text("text").strip()
                if text:
                    pages.append({
                        "page": page_number,
                        "text": text
                    })
        finally:
            document.close()
    except ImportError:
        # 2. Fallback to pypdf
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            for page_number, page in enumerate(reader.pages, start=1):
                text = (page.extract_text() or "").strip()
                if text:
                    pages.append({
                        "page": page_number,
                        "text": text
                    })
        except Exception as e:
            raise ValueError(f"Unable to parse PDF: {e}")

    if not pages:
        raise ValueError(
            "No readable text found in the PDF. "
            "It may be an image-based or scanned document."
        )

    return pages


def extract_text_from_plain_text(text: str) -> list[dict]:
    """
    Prepare directly provided text for processing.
    Page is None because plain text has no PDF page number.
    """
    cleaned_text = text.strip()

    if not cleaned_text:
        raise ValueError("The provided text is empty.")

    return [{
        "page": None,
        "text": cleaned_text
    }]
