from fastapi import APIRouter
from app.schemas import StudentProfileSchema
from app.database import save_profile, get_profile

router = APIRouter(prefix="/api/profile", tags=["Profile"])

@router.post("", response_model=StudentProfileSchema)
async def update_student_profile(profile: StudentProfileSchema):
    """
    Saves student academic profile (branch, year, CGPA, active_backlogs).
    Used for instant eligibility evaluation across all notices.
    """
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
    """
    Retrieves currently saved student profile.
    """
    data = get_profile("default_user")
    if not data:
        return StudentProfileSchema(branch="CSE", year="3rd", cgpa=8.0, active_backlogs=False)
    return StudentProfileSchema(
        branch=data["branch"],
        year=data["year"],
        cgpa=data["cgpa"],
        active_backlogs=data.get("active_backlogs", False)
    )
