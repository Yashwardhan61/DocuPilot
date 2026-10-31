import re
from typing import Dict, Any, List, Optional
from app.schemas import EligibilityResultSchema

BRANCH_ALIASES = {
    "cse": ["cse", "computer science", "computer science and engineering", "computer science & engineering", "cs"],
    "it": ["it", "information technology", "info tech"],
    "ece": ["ece", "electronics and communication", "electronics & communication", "electronics and communication engineering", "electronics & communication engineering", "electronics"],
    "ee": ["ee", "electrical engineering", "electrical"],
    "me": ["me", "mechanical engineering", "mechanical"],
    "ce": ["ce", "civil engineering", "civil"],
    "ch": ["ch", "chemical engineering", "chemical"],
    "bt": ["bt", "biotech", "biotechnology", "bio technology"],
    "mca": ["mca", "master of computer applications"]
}

def normalize_branch(b: str) -> str:
    cleaned = b.strip().lower().replace("&", "and")
    cleaned_alphanumeric = re.sub(r'[^a-z0-9\s]', '', cleaned)
    cleaned_norm = ' '.join(cleaned_alphanumeric.split())
    for canonical, aliases in BRANCH_ALIASES.items():
        if cleaned_norm == canonical or cleaned_norm in aliases:
            return canonical
        for a in aliases:
            a_norm = ' '.join(re.sub(r'[^a-z0-9\s]', '', a.replace("&", "and")).split())
            if a_norm == cleaned_norm or a_norm in cleaned_norm or cleaned_norm in a_norm:
                return canonical
    return cleaned_norm

def check_branch_match(student_branch: str, allowed_branches: List[str]) -> bool:
    if not allowed_branches or any("all" in b.lower() for b in allowed_branches):
        return True
    
    norm_student = normalize_branch(student_branch)
    for b in allowed_branches:
        norm_allowed = normalize_branch(b)
        if norm_student == norm_allowed:
            return True
    return False

def check_year_match(student_year: str, allowed_years: List[str]) -> bool:
    if not allowed_years or any("all" in y.lower() for y in allowed_years):
        return True
    
    # Extract digits: '3rd' -> '3', '3rd year' -> '3'
    cleaned_student = ''.join(c for c in student_year if c.isdigit())
    for y in allowed_years:
        cleaned_allowed = ''.join(c for c in y if c.isdigit())
        if cleaned_student and cleaned_allowed and cleaned_student == cleaned_allowed:
            return True
        if student_year.strip().lower() == y.strip().lower():
            return True
    return False

def evaluate_eligibility(profile: Dict[str, Any], eligibility_rules: Dict[str, Any]) -> EligibilityResultSchema:
    reasons = []
    
    student_branch = profile.get("branch", "")
    student_year = str(profile.get("year", ""))
    student_cgpa = float(profile.get("cgpa", 0.0))
    has_backlogs = bool(profile.get("active_backlogs", False))

    allowed_branches = eligibility_rules.get("branches", [])
    allowed_years = eligibility_rules.get("years", [])
    min_cgpa = eligibility_rules.get("min_cgpa")

    # 1. Branch check
    branch_ok = check_branch_match(student_branch, allowed_branches)
    if not branch_ok:
        reasons.append(f"Branch '{student_branch}' is not listed among eligible branches: {', '.join(allowed_branches)}.")

    # 2. Year check
    year_ok = check_year_match(student_year, allowed_years)
    if not year_ok:
        reasons.append(f"Academic year '{student_year}' is not eligible. Required year(s): {', '.join(allowed_years)}.")

    # 3. CGPA check
    cgpa_ok = True
    if min_cgpa is not None:
        if student_cgpa < float(min_cgpa):
            cgpa_ok = False
            reasons.append(f"Current CGPA {student_cgpa} is below the required cutoff of {min_cgpa}.")

    # 4. Active Backlogs check
    backlog_conditions = " ".join(eligibility_rules.get("other_conditions", [])).lower()
    if "no active backlog" in backlog_conditions and has_backlogs:
        reasons.append("This notice strictly requires students to have no active backlogs.")

    # Overall verdict
    is_eligible = branch_ok and year_ok and cgpa_ok and not (has_backlogs and "no active backlog" in backlog_conditions)
    if is_eligible:
        reasons.append("Your profile satisfies all branch, academic year, and CGPA requirements.")

    manual_checks = eligibility_rules.get("other_conditions", [])
    evidence_snippet = eligibility_rules.get("evidence", {}).get("snippet") if isinstance(eligibility_rules.get("evidence"), dict) else None

    return EligibilityResultSchema(
        eligible=is_eligible,
        branch_eligible=branch_ok,
        year_eligible=year_ok,
        cgpa_eligible=cgpa_ok,
        reasons=reasons,
        manual_checks=manual_checks,
        evidence_snippet=evidence_snippet
    )

def check_eligibility(notice: Any, profile: Any) -> dict:
    """
    Teammate compatibility function accepting NoticeResponse and StudentProfile models.
    """
    profile_dict = profile.model_dump() if hasattr(profile, "model_dump") else dict(profile)
    rules_dict = (
        notice.eligibility.model_dump()
        if hasattr(notice, "eligibility") and hasattr(notice.eligibility, "model_dump")
        else getattr(notice, "eligibility", {})
    )
    result = evaluate_eligibility(profile_dict, rules_dict)
    return {
        "status": "eligible" if result.eligible else "not_eligible",
        "matched_conditions": result.reasons if result.eligible else [],
        "reasons": result.reasons if not result.eligible else []
    }
