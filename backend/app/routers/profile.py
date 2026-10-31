from fastapi import APIRouter, HTTPException
from app.schemas import StudentProfileSchema
from app.database import save_profile, get_profile

router = APIRouter(prefix="/api/profile", tags=["Profile"])


@router.post("", response_model=StudentProfileSchema)
async def update_student_profile(profile: StudentProfileSchema):
    """Create or update the student's academic profile."""

    save_profile(
        profile_id="default_user",
        branch=profile.branch,
        year=profile.year,
        cgpa=profile.cgpa,
        active_backlogs=profile.active_backlogs
    )

    return profile


@router.get("", response_model=StudentProfileSchema)
async def retrieve_student_profile():
    """Retrieve the saved student profile."""

    data = get_profile("default_user")

    if not data:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found. Please create your profile first."
        )

    return StudentProfileSchema(
        branch=data["branch"],
        year=data["year"],
        cgpa=data["cgpa"],
        active_backlogs=data.get("active_backlogs", False)
    )