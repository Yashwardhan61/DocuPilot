from pydantic import BaseModel, Field


class StudentProfile(BaseModel):
    branch: str
    year: str
    cgpa: float = Field(ge=0, le=10)
    active_backlogs: bool = False


class ProfileResponse(StudentProfile):
    message: str = "Student profile saved successfully."