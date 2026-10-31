from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date as DateType

# Re-export from notice.py and profile.py
from app.schemas.notice import (
    Evidence,
    Deadline,
    Eligibility,
    RequiredDocument,
    NoticeTask,
    NoticeExtraction,
    NoticeResponse
)
from app.schemas.profile import (
    StudentProfile,
    ProfileResponse
)

# Aliases and additional schemas for full cross-branch compatibility
DeadlineItem = Deadline
EligibilityCriteria = Eligibility
ActionTask = NoticeTask
NoticeExtractionResponse = NoticeResponse
StudentProfileSchema = StudentProfile

class EligibilityResultSchema(BaseModel):
    eligible: bool
    course_eligible: bool = True
    branch_eligible: bool
    year_eligible: bool
    cgpa_eligible: bool
    reasons: List[str] = Field(default_factory=list)
    manual_checks: List[str] = Field(default_factory=list)
    evidence_snippet: Optional[str] = None

class GoogleAuthStatus(BaseModel):
    connected: bool
    email: Optional[str] = None

class GoogleCalendarSyncResponse(BaseModel):
    success: bool
    synced_events_count: int
    events: List[Dict[str, Any]] = Field(default_factory=list)
    message: str

class QuestionRequest(BaseModel):
    question: str

class QuestionResponse(BaseModel):
    answer: str
    source_snippets: List[str] = Field(default_factory=list)

__all__ = [
    "Evidence",
    "Deadline",
    "DeadlineItem",
    "Eligibility",
    "EligibilityCriteria",
    "RequiredDocument",
    "NoticeTask",
    "ActionTask",
    "NoticeExtraction",
    "NoticeResponse",
    "NoticeExtractionResponse",
    "StudentProfile",
    "StudentProfileSchema",
    "ProfileResponse",
    "EligibilityResultSchema",
    "GoogleAuthStatus",
    "GoogleCalendarSyncResponse",
    "QuestionRequest",
    "QuestionResponse",
]
