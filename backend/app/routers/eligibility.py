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
    Compares student's branch, year, CGPA, and backlogs with extracted notice rules.
    """
    notice = get_notice(notice_id)
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    saved_profile = get_profile("default_user") or {}
    profile = {
        "branch": branch if branch is not None else saved_profile.get("branch", "CSE"),
        "year": year if year is not None else saved_profile.get("year", "3rd"),
        "cgpa": cgpa if cgpa is not None else saved_profile.get("cgpa", 8.0),
        "active_backlogs": active_backlogs if active_backlogs is not None else saved_profile.get("active_backlogs", False)
    }

    extraction = notice.get("extraction", {})
    rules = extraction.get("eligibility", {})

    result = evaluate_eligibility(profile, rules)
    return result

