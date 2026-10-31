import re
from typing import Dict, Any, List, Optional
from app.schemas import EligibilityResultSchema
from app.services.course_service import get_course_metadata

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
    
    # 1. Exact match check
    for canonical, aliases in BRANCH_ALIASES.items():
        if cleaned_norm == canonical or cleaned_norm in aliases:
            return canonical

    # 2. Whole phrase or word-boundary match
    for canonical, aliases in BRANCH_ALIASES.items():
        for a in aliases:
            a_norm = ' '.join(re.sub(r'[^a-z0-9\s]', '', a.replace("&", "and")).split())
            if a_norm == cleaned_norm or cleaned_norm == a_norm:
                return canonical
            if re.search(r'\b' + re.escape(a_norm) + r'\b', cleaned_norm):
                return canonical

    return cleaned_norm

def check_branch_match(student_branch: str, allowed_branches: List[str]) -> bool:
    if not allowed_branches or any("all" in b.lower() for b in allowed_branches if b):
        return True
    
    norm_student = normalize_branch(student_branch)
    for b in allowed_branches:
        if not b:
            continue
        norm_allowed = normalize_branch(b)
        if norm_student == norm_allowed:
            return True
    return False

def check_course_match(student_course: Optional[str], allowed_courses: Optional[List[str]]) -> bool:
    """
    Checks if student's course is eligible according to the allowed courses list.
    If allowed_courses is empty or contains wildcard ('all'/'any'), allows all courses.
    """
    if not allowed_courses:
        return True

    for c in allowed_courses:
        if not c:
            continue
        c_str = str(c).strip().lower()
        if c_str in ["all", "any", "all courses", "open to all"]:
            return True

    if not student_course:
        return True

    student_meta = get_course_metadata(student_course)
    student_canonical = student_meta["course"].lower()
    student_raw = student_course.strip().lower()

    for c in allowed_courses:
        if not c:
            continue
        c_meta = get_course_metadata(str(c))
        if c_meta["course"].lower() == student_canonical:
            return True
        c_raw = str(c).strip().lower()
        if c_raw in student_raw or student_raw in c_raw:
            return True

    return False

def extract_canonical_years(text: str) -> set[str]:
    """
    Extracts numeric academic year digits ('1', '2', '3', '4', '5') from free-form text.
    """
    if not text:
        return set()

    cleaned = str(text).lower().strip()
    
    if any(w in cleaned for w in ["all", "any", "open to all", "every", "all years", "all batches"]):
        return {"1", "2", "3", "4", "5"}

    matched_years = set()

    # Digits with ordinal suffixes or standalone (guarding against decimals and negative numbers)
    for y_num in range(1, 6):
        pattern = rf'(?<![\.\d\-])\b(?:{y_num}(?:st|nd|rd|th)?(?:\s*year)?)\b(?![\.\d])'
        if re.search(pattern, cleaned, re.IGNORECASE):
            matched_years.add(str(y_num))

    # Text representations
    word_map = {
        "1": [r'\bfirst(?:\s*year)?\b', r'\bfresher(?:s)?\b', r'\bfreshman\b'],
        "2": [r'\bsecond(?:\s*year)?\b', r'\bsophomore(?:s)?\b'],
        "3": [r'\bthird(?:\s*year)?\b'],
        "4": [r'\bfourth(?:\s*year)?\b'],
        "5": [r'\bfifth(?:\s*year)?\b']
    }
    for digit, patterns in word_map.items():
        for pat in patterns:
            if re.search(pat, cleaned, re.IGNORECASE):
                matched_years.add(digit)

    return matched_years

def is_final_year_expression(text: str) -> bool:
    cleaned = str(text).lower().strip()
    return bool(re.search(
        r'(?<!pre[-\s])(?<!pre)(?<![\.\d])\b(?:final(?:\s*year)?|graduating(?:\s*batch|\s*year)?|passing\s*out(?:\s*batch)?)\b(?![\.\d])',
        cleaned,
        re.IGNORECASE
    ))

def is_pre_final_year_expression(text: str) -> bool:
    cleaned = str(text).lower().strip()
    return bool(re.search(
        r'(?<![\.\d])\b(?:pre[-\s]?final(?:\s*year)?|penultimate(?:\s*year)?)\b(?![\.\d])',
        cleaned,
        re.IGNORECASE
    ))

def check_year_match(student_year: Any, allowed_years: List[Any], student_course: Optional[str] = None) -> bool:
    """
    Evaluates whether the student's academic year meets the allowed requirements.
    Dynamically maps relative standing (Final Year / Pre-Final Year) based on course duration:
      - B.Tech (4 years): 3rd = Pre-Final, 4th = Final
      - M.Tech / MBA / M.Sc (2 years): 1st = Pre-Final, 2nd = Final
      - MCA (2 years): 1st = Pre-Final, 2nd = Final
      - Ph.D. (5 years): 4th = Pre-Final, 5th = Final
    """
    if not allowed_years or any("all" in str(y).lower() for y in allowed_years if y is not None):
        return True
    
    if student_year is None:
        return False

    student_str = str(student_year).strip()
    if not student_str:
        return False

    # Guard against invalid or negative numbers
    if re.search(r'-\s*\d', student_str):
        return False

    # Retrieve course metadata to know duration, pre-final year, and final year
    course_name = student_course or "B.Tech"
    meta = get_course_metadata(course_name)
    course_duration = meta["duration_years"]
    course_pre_final_year = meta["pre_final_year"]
    course_final_year = meta["final_year"]

    # Determine student's numeric year digits
    student_canonical = extract_canonical_years(student_str)
    if not student_canonical:
        cleaned_num = ''.join(c for c in student_str if c.isdigit())
        if cleaned_num:
            student_canonical = {cleaned_num}

    pre_final_digit = str(max(1, course_duration - 1))
    final_digit = str(course_duration)

    student_is_final = False
    student_is_pre_final = False

    if student_canonical:
        if final_digit in student_canonical:
            student_is_final = True
        if pre_final_digit in student_canonical:
            student_is_pre_final = True
    else:
        norm_std = student_str.lower()
        if "final" in norm_std and "pre" not in norm_std:
            student_is_final = True
        elif "pre" in norm_std and "final" in norm_std:
            student_is_pre_final = True

    for y in allowed_years:
        if y is None:
            continue
        y_str = str(y).strip()
        if not y_str:
            continue

        if any(w in y_str.lower() for w in ["all", "any", "open to all", "all years"]):
            return True

        # Check relative indicators
        if is_pre_final_year_expression(y_str):
            if student_is_pre_final:
                return True

        if is_final_year_expression(y_str):
            if student_is_final:
                return True

        # Check absolute year match
        allowed_canonical = extract_canonical_years(y_str)
        if student_canonical and student_canonical.intersection(allowed_canonical):
            return True

        if student_str.lower() == y_str.lower():
            return True

    return False

def evaluate_eligibility(profile: Dict[str, Any], eligibility_rules: Dict[str, Any]) -> EligibilityResultSchema:
    reasons = []
    
    student_course = profile.get("course") or "B.Tech"
    student_branch = profile.get("branch", "")
    student_year = str(profile.get("year", ""))
    student_cgpa = float(profile.get("cgpa", 0.0))
    has_backlogs = bool(profile.get("active_backlogs", False))

    allowed_courses = eligibility_rules.get("courses", [])
    allowed_branches = eligibility_rules.get("branches", [])
    allowed_years = eligibility_rules.get("years", [])
    min_cgpa = eligibility_rules.get("min_cgpa")

    # 1. Course check
    course_ok = check_course_match(student_course, allowed_courses)
    if not course_ok:
        reasons.append(f"Course '{student_course}' is not eligible. Allowed course(s): {', '.join(allowed_courses)}.")

    # 2. Branch check
    branch_ok = check_branch_match(student_branch, allowed_branches)
    if not branch_ok:
        reasons.append(f"Branch '{student_branch}' is not listed among eligible branches: {', '.join(allowed_branches)}.")

    # 3. Year check (relative to course duration)
    year_ok = check_year_match(student_year, allowed_years, student_course=student_course)
    if not year_ok:
        course_meta = get_course_metadata(student_course)
        reasons.append(
            f"Academic year '{student_year}' ({student_course}, {course_meta['duration_years']} years) is not eligible. "
            f"Required: {', '.join(allowed_years)}."
        )

    # 4. CGPA check
    cgpa_ok = True
    if min_cgpa is not None:
        if student_cgpa < float(min_cgpa):
            cgpa_ok = False
            reasons.append(f"Current CGPA {student_cgpa} is below the required cutoff of {min_cgpa}.")

    # 5. Active Backlogs check
    backlog_conditions = " ".join(eligibility_rules.get("other_conditions", [])).lower()
    if "no active backlog" in backlog_conditions and has_backlogs:
        reasons.append("This notice strictly requires students to have no active backlogs.")

    # Overall verdict
    is_eligible = course_ok and branch_ok and year_ok and cgpa_ok and not (has_backlogs and "no active backlog" in backlog_conditions)
    if is_eligible:
        reasons.append(f"Your profile ({student_course} {student_year} Year, {student_branch}) satisfies all eligibility requirements.")

    manual_checks = eligibility_rules.get("other_conditions", [])
    evidence_snippet = eligibility_rules.get("evidence", {}).get("snippet") if isinstance(eligibility_rules.get("evidence"), dict) else None

    return EligibilityResultSchema(
        eligible=is_eligible,
        course_eligible=course_ok,
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
