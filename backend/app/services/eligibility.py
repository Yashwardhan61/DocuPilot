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

def extract_canonical_years(text: str) -> set[str]:
    """
    Extracts canonical academic year representations ('1', '2', '3', '4') from free-form text.
    Recognizes university & MNNIT academic year terminology:
      - 3rd year = Pre-final year / Penultimate year
      - 4th year = Final year / Graduating batch
      - 2nd year = Second year / Sophomore
      - 1st year = First year / Fresher
    Guards against GPA decimals (3.5, 4.0) and calendar years (2024, 2026).
    """
    if not text:
        return set()

    cleaned = str(text).lower().strip()
    
    # Check for wildcards / open to all
    if any(w in cleaned for w in ["all", "any", "open to all", "every", "all years", "all batches"]):
        return {"1", "2", "3", "4"}

    matched_years = set()

    # Pre-final year / 3rd year patterns
    pre_final_regex = re.compile(
        r'(?<![\.\d])\b(?:pre[-\s]?final(?:\s*year)?|penultimate(?:\s*year)?|third(?:\s*year)?|3rd(?:\s*year)?|3(?:rd)?)\b(?![\.\d])',
        re.IGNORECASE
    )
    if pre_final_regex.search(cleaned):
        matched_years.add("3")

    # Final year / 4th year patterns (negative lookbehind ensures "pre-final" does not match "final")
    final_regex = re.compile(
        r'(?<!pre[-\s])(?<!pre)(?<![\.\d])\b(?:final(?:\s*year)?|graduating(?:\s*batch|\s*year)?|passing\s*out(?:\s*batch)?|fourth(?:\s*year)?|4th(?:\s*year)?|4(?:th)?)\b(?![\.\d])',
        re.IGNORECASE
    )
    if final_regex.search(cleaned):
        matched_years.add("4")

    # 2nd year patterns
    second_regex = re.compile(
        r'(?<![\.\d])\b(?:second(?:\s*year)?|2nd(?:\s*year)?|2(?:nd)?|sophomore(?:s)?)\b(?![\.\d])',
        re.IGNORECASE
    )
    if second_regex.search(cleaned):
        matched_years.add("2")

    # 1st year patterns
    first_regex = re.compile(
        r'(?<![\.\d])\b(?:first(?:\s*year)?|1st(?:\s*year)?|1(?:st)?|fresher(?:s)?|freshman)\b(?![\.\d])',
        re.IGNORECASE
    )
    if first_regex.search(cleaned):
        matched_years.add("1")

    return matched_years

def check_year_match(student_year: Any, allowed_years: List[Any]) -> bool:
    if not allowed_years or any("all" in str(y).lower() for y in allowed_years if y is not None):
        return True
    
    if student_year is None:
        return False

    student_str = str(student_year).strip()
    if not student_str:
        return False

    student_canonical = extract_canonical_years(student_str)
    if not student_canonical:
        cleaned_student = ''.join(c for c in student_str if c.isdigit())
        student_canonical = {cleaned_student} if cleaned_student else {student_str.lower()}

    for y in allowed_years:
        if y is None:
            continue
        y_str = str(y).strip()
        if not y_str:
            continue
        
        allowed_canonical = extract_canonical_years(y_str)
        if student_canonical.intersection(allowed_canonical):
            return True
        
        if student_str.lower() == y_str.lower():
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
