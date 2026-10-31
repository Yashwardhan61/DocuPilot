import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body
from typing import Optional
from app.schemas import NoticeExtractionResponse, QuestionRequest, QuestionResponse
from app.services.document_parser import DocumentParser
from app.services.gemini_service import GeminiService
from app.database import save_notice, get_notice

router = APIRouter(prefix="/api/notices", tags=["Notices"])

@router.post("", response_model=NoticeExtractionResponse)
async def upload_and_process_notice(
    file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None),
    text: Optional[str] = Form(None)
):
    """
    Ingests a notice via PDF, image, or raw text.
    Extracts structured facts with page-level evidence pinning.
    """
    notice_id = str(uuid.uuid4())[:8]
    filename = "text_input.txt"
    extracted_text = ""
    page_count = 1
    image_data = None

    input_text = (raw_text or text or "").strip()

    if file:
        filename = file.filename or "uploaded_notice"
        content_bytes = await file.read()
        content_type = file.content_type or ""

        if "pdf" in content_type or filename.lower().endswith(".pdf"):
            extracted_text, pages, page_count = DocumentParser.extract_from_pdf(content_bytes)
        elif "image" in content_type or any(filename.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg"]):
            image_data = DocumentParser.prepare_image(content_bytes, content_type)
            extracted_text = f"Notice uploaded as image: {filename}"
        else:
            extracted_text = content_bytes.decode("utf-8", errors="ignore")
    elif input_text:
        extracted_text = input_text
    else:
        raise HTTPException(status_code=400, detail="Must provide either a file upload or notice text")

    if not extracted_text and not image_data:
        raise HTTPException(status_code=400, detail="No readable content found in the provided notice")

    # Call Gemini extraction engine
    extraction_data = await GeminiService.extract_notice_data(extracted_text, image_data=image_data)
    extraction_data["notice_id"] = notice_id

    # Persist in SQLite
    title = extraction_data.get("title", filename)
    save_notice(notice_id, title, filename, extracted_text, page_count, extraction_data)

    return extraction_data

@router.get("/{notice_id}", response_model=NoticeExtractionResponse)
async def get_notice_details(notice_id: str):
    """
    Retrieves stored extraction data and evidence for a notice.
    """
    notice = get_notice(notice_id)
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    
    data = notice["extraction"]
    data["notice_id"] = notice["id"]
    return data

@router.post("/{notice_id}/ask", response_model=QuestionResponse)
async def ask_notice_question(notice_id: str, payload: QuestionRequest):
    """
    Stretch feature: Answers student questions specifically grounded in the notice.
    """
    notice = get_notice(notice_id)
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    result = await GeminiService.ask_question(notice["raw_text"], payload.question)
    return result

