from pydantic import BaseModel, Field, field_validator


class StudentProfile(BaseModel):
    branch: str = Field(min_length=1, max_length=50)
    year: str = Field(min_length=1, max_length=30)
    cgpa: float = Field(ge=0, le=10)
    active_backlogs: bool = False

    @field_validator("branch", "year", mode="before")
    @classmethod
    def validate_text_fields(cls, value):
        if isinstance(value, str):
            value = value.strip()

            if not value:
                raise ValueError("This field cannot be blank.")

        return value


class ProfileResponse(StudentProfile):
    message: str = "Student profile saved successfully."