from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.schemas import EligibilityResultSchema
from app.services.eligibility import evaluate_eligibility
from app.database import get_notice, get_profile

router = APIRouter(prefix="/api/notices", tags=["Eligibility"])

@router.get("/{notice_id}/eligibility", response_model=EligibilityResultSchema)
async def check_notice_eligibility(
    notice_id: str,
    branch: Optional[str] = Query(None),
    year: Optional[str] = Query(None),
    cgpa: Optional[float] = Query(None),
    active_backlogs: Optional[bool] = Query(None)
):
    """
    Deterministically computes student eligibility for a specific notice.
    Uses query parameters when supplied, otherwise uses the saved profile.
    """

    notice = get_notice(notice_id)

    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    saved_profile = get_profile("default_user")

    # Use the saved profile if available.
    profile = saved_profile or {}

    # Query parameters override saved profile values.
    if branch is not None:
        profile["branch"] = branch

    if year is not None:
        profile["year"] = year

    if cgpa is not None:
        profile["cgpa"] = cgpa

    if active_backlogs is not None:
        profile["active_backlogs"] = active_backlogs

    # Do not evaluate eligibility with incomplete or fictional details.
    required_fields = ["branch", "year", "cgpa", "active_backlogs"]
    missing_fields = [
        field for field in required_fields
        if field not in profile or profile[field] is None
    ]

    if missing_fields:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Please create your student profile before checking eligibility.",
                "missing_fields": missing_fields
            }
        )

    extraction = notice.get("extraction", {})
    rules = extraction.get("eligibility", {})

    result = evaluate_eligibility(profile, rules)
    return result
