import re
import json
import httpx
from typing import Dict, Any, Optional, List
from app.config import settings

COURSE_CATALOG: Dict[str, Dict[str, Any]] = {
    "btech": {
        "canonical": "B.Tech",
        "name": "Bachelor of Technology",
        "duration": 4,
        "aliases": ["btech", "b.tech", "b tech", "bachelor of technology", "be", "b.e", "bachelor of engineering"]
    },
    "mtech": {
        "canonical": "M.Tech",
        "name": "Master of Technology",
        "duration": 2,
        "aliases": ["mtech", "m.tech", "m tech", "master of technology", "me", "m.e", "master of engineering"]
    },
    "mca": {
        "canonical": "MCA",
        "name": "Master of Computer Applications",
        "duration": 3,
        "aliases": ["mca", "m.c.a", "master of computer applications", "master in computer applications", "mca 3", "3 year mca"]
    },
    "mba": {
        "canonical": "MBA",
        "name": "Master of Business Administration",
        "duration": 2,
        "aliases": ["mba", "m.b.a", "master of business administration"]
    },
    "msc": {
        "canonical": "M.Sc",
        "name": "Master of Science",
        "duration": 2,
        "aliases": ["msc", "m.sc", "m sc", "master of science", "ms"]
    },
    "phd": {
        "canonical": "Ph.D.",
        "name": "Doctor of Philosophy",
        "duration": 5,
        "aliases": ["phd", "ph.d", "ph.d.", "doctor of philosophy", "doctorate", "research scholar"]
    },
    "barch": {
        "canonical": "B.Arch",
        "name": "Bachelor of Architecture",
        "duration": 5,
        "aliases": ["barch", "b.arch", "b arch", "bachelor of architecture"]
    },
    "dual": {
        "canonical": "Dual Degree",
        "name": "Integrated B.Tech + M.Tech Dual Degree",
        "duration": 5,
        "aliases": ["dual degree", "dual", "integrated mtech", "integrated btech", "btech mtech dual", "5 year dual"]
    }
}

YEAR_SUFFIXES = {
    1: "1st",
    2: "2nd",
    3: "3rd",
    4: "4th",
    5: "5th",
    6: "6th"
}

def format_year_id(year_num: int) -> str:
    return YEAR_SUFFIXES.get(year_num, f"{year_num}th")

def build_year_list(duration_years: int) -> List[Dict[str, Any]]:
    years = []
    pre_final_idx = max(1, duration_years - 1)
    final_idx = duration_years

    for y in range(1, duration_years + 1):
        y_id = format_year_id(y)
        is_pre_final = (y == pre_final_idx)
        is_final = (y == final_idx)

        if is_final:
            label = f"{y_id} Year (Final Year)"
        elif is_pre_final:
            label = f"{y_id} Year (Pre-Final Year)"
        else:
            label = f"{y_id} Year"

        years.append({
            "id": y_id,
            "year_number": y,
            "label": label,
            "is_pre_final": is_pre_final,
            "is_final": is_final
        })
    return years

def get_course_metadata(course_name: str, duration_override: Optional[int] = None) -> Dict[str, Any]:
    """
    Returns course duration, pre-final year, final year, and years list.
    """
    cleaned = str(course_name or "").strip().lower()
    cleaned_norm = re.sub(r'[^a-z0-9\s]', '', cleaned)

    matched_key = None
    for key, data in COURSE_CATALOG.items():
        if cleaned in [a.lower() for a in data["aliases"]] or cleaned_norm in [re.sub(r'[^a-z0-9\s]', '', a.lower()) for a in data["aliases"]]:
            matched_key = key
            break

    if not matched_key:
        for key, data in COURSE_CATALOG.items():
            if data["canonical"].lower() == cleaned:
                matched_key = key
                break

    if not matched_key:
        # Keyword / phrase detection priority
        if any(w in cleaned for w in ["dual degree", "dual", "integrated"]):
            matched_key = "dual"
        elif any(w in cleaned for w in ["ph.d", "phd", "doctorate"]):
            matched_key = "phd"
        elif any(w in cleaned for w in ["b.arch", "barch", "architecture"]):
            matched_key = "barch"
        elif "mca" in cleaned:
            matched_key = "mca"
        elif "mba" in cleaned:
            matched_key = "mba"
        elif any(w in cleaned for w in ["m.tech", "mtech"]):
            matched_key = "mtech"
        elif any(w in cleaned for w in ["m.sc", "msc"]):
            matched_key = "msc"
        elif any(w in cleaned for w in ["b.tech", "btech", "bachelor of technology"]):
            matched_key = "btech"

    if matched_key:
        catalog_entry = COURSE_CATALOG[matched_key]
        duration = duration_override or catalog_entry["duration"]
        canonical_name = catalog_entry["canonical"]
        full_name = catalog_entry["name"]
    else:
        # Default or heuristic derivation
        duration = duration_override or (2 if any(m in cleaned for m in ["master", "m.", "pg", "post graduate"]) else 4)
        canonical_name = course_name.strip() if course_name else "B.Tech"
        full_name = canonical_name

    pre_final_year = format_year_id(max(1, duration - 1))
    final_year = format_year_id(duration)
    years = build_year_list(duration)

    return {
        "course": canonical_name,
        "name": full_name,
        "duration_years": duration,
        "pre_final_year": pre_final_year,
        "final_year": final_year,
        "years": years
    }

async def analyze_course_with_ai(course_query: str) -> Dict[str, Any]:
    """
    Uses Gemini API to evaluate course duration, pre-final year, and final year
    for any novel or non-standard degree. Falls back seamlessly to rule-based engine.
    """
    cleaned = str(course_query or "").strip()
    if not cleaned:
        return get_course_metadata("B.Tech")

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return get_course_metadata(cleaned)

    system_prompt = (
        "You are an academic curriculum coordinator. Given an academic degree or course title, "
        "determine its standard duration in years (e.g. B.Tech is 4, M.Tech is 2, MCA is 3, MBA is 2, M.Sc is 2, B.Arch is 5, Ph.D. is 5). "
        "Return ONLY a JSON object with this exact structure: "
        '{"canonical_name": "string", "duration_years": 2, "description": "string"}'
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": f"Analyze degree/course: '{cleaned}'"}]}],
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {"response_mime_type": "application/json", "temperature": 0.0}
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates:
                    text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    parsed = json.loads(text)
                    duration = int(parsed.get("duration_years", 4))
                    meta = get_course_metadata(parsed.get("canonical_name", cleaned), duration_override=duration)
                    if parsed.get("description"):
                        meta["description"] = parsed["description"]
                    return meta
    except Exception:
        pass

    return get_course_metadata(cleaned)
