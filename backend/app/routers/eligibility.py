from fastapi import APIRouter, HTTPException
from app.schemas import EligibilityResultSchema
from app.services.eligibility import evaluate_eligibility
from app.database import get_notice, get_profile

router = APIRouter(prefix="/api/notices", tags=["Eligibility"])

@router.get("/{notice_id}/eligibility", response_model=EligibilityResultSchema)
async def check_notice_eligibility(notice_id: str):
    """
    Deterministically computes student eligibility for a specific notice.
    Compares student's branch, year, and CGPA with extracted rules.
    """
    notice = get_notice(notice_id)
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    profile = get_profile("default_user")
    if not profile:
        profile = {"branch": "CSE", "year": "3rd", "cgpa": 8.0}

    extraction = notice.get("extraction", {})
    rules = extraction.get("eligibility", {})

    result = evaluate_eligibility(profile, rules)
    return result

