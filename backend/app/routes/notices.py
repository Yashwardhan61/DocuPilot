
import os
import tempfile
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.notice import NoticeResponse
from app.services.document import (
    extract_text_from_pdf,
    extract_text_from_plain_text,
)
from app.services.gemini import extract_notice_with_gemini
from app.services.storage import save_notice, get_notice


router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/notices", response_model=NoticeResponse)
async def create_notice(
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
):
    if (file is None and not text) or (file is not None and text):
        raise HTTPException(
            status_code=400,
            detail="Provide either a PDF file or plain text, not both."
        )

    if file is not None:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are supported."
            )

        content = await file.read()

        if not content:
            raise HTTPException(status_code=400, detail="The PDF is empty.")

        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="PDF size must not exceed 10 MB."
            )

        temp_path = None

        try:
            with tempfile.NamedTemporaryFile(
                suffix=".pdf", delete=False
            ) as temp_file:
                temp_file.write(content)
                temp_path = temp_file.name

            pages = extract_text_from_pdf(temp_path)

        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error))

        except Exception as error:
            raise HTTPException(
                status_code=422,
                detail=f"Unable to read PDF: {error}"
            )

        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)

    else:
        try:
            pages = extract_text_from_plain_text(text)

        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error))

    try:
        extraction = extract_notice_with_gemini(pages)

        notice = NoticeResponse(
            notice_id=str(uuid4()),
            **extraction.model_dump()
        )

        # Persist the notice in SQLite
        save_notice(notice)

        return notice

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Notice processing failed: {error}"
        )


@router.get("/notices/{notice_id}", response_model=NoticeResponse)
def retrieve_notice(notice_id: str):
    notice = get_notice(notice_id)

    if notice is None:
        raise HTTPException(
            status_code=404,
            detail="Notice not found."
        )

    return notice
