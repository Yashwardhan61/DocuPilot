from typing import Optional, List, Union
from datetime import date as DateType
from pydantic import BaseModel, Field

# Evidence supporting an extracted fact
class Evidence(BaseModel):
    snippet: str
    page: Optional[int] = None

# Individual deadline
class Deadline(BaseModel):
    label: str
    date: Optional[Union[str, DateType]] = None
    needs_confirmation: bool = False
    evidence: Evidence

# Eligibility requirements
class Eligibility(BaseModel):
    courses: List[str] = Field(default_factory=list)
    branches: List[str] = Field(default_factory=list)
    years: List[str] = Field(default_factory=list)
    min_cgpa: Optional[float] = None
    other_conditions: List[str] = Field(default_factory=list)
    evidence: Optional[Evidence] = None

# Required document
class RequiredDocument(BaseModel):
    name: str
    evidence: Optional[Evidence] = None

# Actionable task
class NoticeTask(BaseModel):
    id: Optional[str] = None
    title: str
    due: Optional[Union[str, DateType]] = None
    done: bool = False

# Information extracted from a notice
class NoticeExtraction(BaseModel):
    title: str
    summary: Optional[str] = None
    deadlines: List[Deadline] = Field(default_factory=list)
    eligibility: Eligibility = Field(default_factory=Eligibility)
    required_documents: List[RequiredDocument] = Field(default_factory=list)
    tasks: List[NoticeTask] = Field(default_factory=list)

# Complete API response
class NoticeResponse(NoticeExtraction):
    notice_id: str
