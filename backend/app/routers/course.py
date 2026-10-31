from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.course_service import get_course_metadata, analyze_course_with_ai

router = APIRouter(prefix="/api/course", tags=["Course"])

class CourseAnalyzeRequest(BaseModel):
    course: str

class YearItem(BaseModel):
    id: str
    year_number: int
    label: str
    is_pre_final: bool
    is_final: bool

class CourseMetadataResponse(BaseModel):
    course: str
    name: str
    duration_years: int
    pre_final_year: str
    final_year: str
    years: List[YearItem]
    description: Optional[str] = None

@router.get("/duration", response_model=CourseMetadataResponse)
async def get_course_duration(course: str = Query(..., description="Course or degree program name")):
    meta = get_course_metadata(course)
    return meta

@router.post("/analyze", response_model=CourseMetadataResponse)
async def analyze_course(payload: CourseAnalyzeRequest):
    meta = await analyze_course_with_ai(payload.course)
    return meta

