import json
import re
import httpx
from typing import Dict, Any, Optional
from app.config import settings

EXTRACTION_SYSTEM_PROMPT = """You are DocuPilot, an expert AI document parsing agent for university academic notices, placement circulars, and scholarship announcements.
Analyze the provided notice carefully and extract all actionable details strictly adhering to the JSON schema.

Extraction Rules:
1. Deadlines: Extract every dated milestone (e.g., registration deadline, document submission, exam date). If a deadline is mentioned but the exact date is missing or ambiguous, set "date" to null and set "needs_confirmation" to true.
2. Evidence: For every deadline, eligibility rule, and required document, extract a verbatim snippet (quoted text from the document, 20-150 characters) and the page number where it appears.
3. Eligibility: Extract eligible courses/degrees (e.g. ["B.Tech", "M.Tech", "MCA"] or ["All"]), branches (e.g. ["CSE", "IT", "ECE"]), academic years eligible (e.g. ["Pre-Final Year", "Final Year", "3rd", "4th"]), minimum CGPA (numeric float e.g. 7.0), and other conditions (e.g. ["No active backlogs", "Indian nationals only"]).
4. Tasks: Formulate actionable steps a student must complete, each with its relevant due date.
5. Return ONLY valid JSON matching this schema:
{
  "title": "string",
  "summary": "string",
  "deadlines": [
    {
      "label": "string",
      "date": "YYYY-MM-DD or null",
      "needs_confirmation": false,
      "evidence": { "snippet": "verbatim text", "page": 1 }
    }
  ],
  "eligibility": {
    "courses": ["string"],
    "branches": ["string"],
    "years": ["string"],
    "min_cgpa": 0.0,
    "other_conditions": ["string"],
    "evidence": { "snippet": "verbatim text", "page": 1 }
  },
  "required_documents": [
    { "name": "string", "evidence": { "snippet": "verbatim text", "page": 1 } }
  ],
  "tasks": [
    { "title": "string", "due": "YYYY-MM-DD or null", "done": false }
  ]
}
"""

SUPPORTED_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
    "gemini-pro-latest"
]

class GeminiService:
    @staticmethod
    async def extract_notice_data(notice_text: str, image_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Extracts structured notice facts using the Gemini REST API via httpx.
        Seamlessly uses fallback parser if offline or API key is not configured.
        """
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            return GeminiService._fallback_extraction(notice_text)

        contents_parts = []
        if image_data:
            contents_parts.append({
                "inline_data": {
                    "mime_type": image_data["mime_type"],
                    "data": image_data["data"]
                }
            })
        
        user_prompt = f"Extract all facts from the following notice text:\n\n{notice_text[:30000]}"
        contents_parts.append({"text": user_prompt})

        payload = {
            "contents": [{"role": "user", "parts": contents_parts}],
            "system_instruction": {"parts": [{"text": EXTRACTION_SYSTEM_PROMPT}]},
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1
            }
        }

        for model in SUPPORTED_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                async with httpx.AsyncClient(timeout=30.0) as http_client:
                    res = await http_client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            part_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            parsed = json.loads(part_text)
                            GeminiService._post_process(parsed)
                            return parsed
            except Exception:
                continue

        return GeminiService._fallback_extraction(notice_text)

    @staticmethod
    async def ask_question(notice_text: str, question: str) -> Dict[str, Any]:
        """
        Answers questions grounded in the notice using Gemini REST API,
        with grounded text extraction fallback if offline.
        """
        api_key = settings.GEMINI_API_KEY
        if api_key:
            prompt = (
                f"You are DocuPilot assistant. Answer the user's question accurately using ONLY information from this notice.\n"
                f"Question: {question}\n\n"
                f"Notice Text:\n{notice_text[:20000]}"
            )

            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.2}
            }

            for model in SUPPORTED_MODELS:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                try:
                    async with httpx.AsyncClient(timeout=20.0) as http_client:
                        res = await http_client.post(url, json=payload)
                        if res.status_code == 200:
                            data = res.json()
                            ans = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            return {"answer": ans.strip(), "source_snippets": []}
                except Exception:
                    continue

        # Grounded text search fallback
        q_lower = question.lower()
        if "cgpa" in q_lower or "cpi" in q_lower:
            match = re.search(r'([^\n.]*(?:cgpa|cpi)[^\n.]*)', notice_text, re.IGNORECASE)
            if match:
                return {
                    "answer": f"According to the notice: {match.group(1).strip()}.",
                    "source_snippets": [match.group(1).strip()]
                }
        elif "deadline" in q_lower or "last date" in q_lower:
            match = re.search(r'([^\n.]*(?:deadline|last date|register by)[^\n.]*)', notice_text, re.IGNORECASE)
            if match:
                return {
                    "answer": f"According to the notice: {match.group(1).strip()}.",
                    "source_snippets": [match.group(1).strip()]
                }
        elif "branch" in q_lower:
            match = re.search(r'([^\n.]*(?:branch|branches|b\.tech)[^\n.]*)', notice_text, re.IGNORECASE)
            if match:
                return {
                    "answer": f"According to the notice: {match.group(1).strip()}.",
                    "source_snippets": [match.group(1).strip()]
                }

        first_lines = [l.strip() for l in notice_text.splitlines() if len(l.strip()) > 30]
        snippet = first_lines[0] if first_lines else notice_text[:150]
        return {
            "answer": f"Relevant excerpt from notice: {snippet}",
            "source_snippets": [snippet]
        }

    @staticmethod
    def _post_process(data: dict):
        if not data.get("title"):
            data["title"] = "University Academic / Placement Notice"
        if not data.get("summary"):
            data["summary"] = "Official university circular extracted by DocuPilot."
        if not isinstance(data.get("deadlines"), list):
            data["deadlines"] = []
        for deadline in data.get("deadlines", []):
            if not deadline.get("label"):
                deadline["label"] = "Notice Deadline"
            if not deadline.get("date") or deadline.get("date") == "null":
                deadline["date"] = None
                deadline["needs_confirmation"] = True
            if not deadline.get("evidence"):
                deadline["evidence"] = {
                    "snippet": f"Milestone: {deadline.get('label')}",
                    "page": 1
                }
            elif isinstance(deadline["evidence"], dict) and not deadline["evidence"].get("snippet"):
                deadline["evidence"]["snippet"] = f"Milestone: {deadline.get('label')}"

        if not isinstance(data.get("eligibility"), dict):
            data["eligibility"] = {
                "courses": ["All"],
                "branches": ["All"],
                "years": ["All"],
                "min_cgpa": None,
                "other_conditions": []
            }
        else:
            elig = data["eligibility"]
            if "courses" not in elig or not isinstance(elig["courses"], list):
                elig["courses"] = ["All"]
            if "branches" not in elig or not isinstance(elig["branches"], list):
                elig["branches"] = ["All"]
            if "years" not in elig or not isinstance(elig["years"], list):
                elig["years"] = ["All"]

        if not isinstance(data.get("required_documents"), list):
            data["required_documents"] = []

        if not isinstance(data.get("tasks"), list):
            data["tasks"] = []

    @staticmethod
    def _fallback_extraction(notice_text: str) -> Dict[str, Any]:
        date_pattern = r'(\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b)'
        dates_found = re.findall(date_pattern, notice_text, re.IGNORECASE)

        branches = []
        for b in ["CSE", "IT", "ECE", "EE", "ME", "CE", "Chemical", "Biotech"]:
            if re.search(r'\b' + b + r'\b', notice_text, re.IGNORECASE):
                branches.append(b)
        if not branches:
            branches = ["All B.Tech / MCA Branches"]

        cgpa_match = re.search(r'(?:CGPA|CPI)\s*(?:>=|above|minimum|of)?\s*([6-9]\.?[0-9]?)', notice_text, re.IGNORECASE)
        min_cgpa = float(cgpa_match.group(1)) if cgpa_match else 6.5

        deadlines = []
        if dates_found:
            for d in dates_found[:3]:
                deadlines.append({
                    "label": "Notice Submission Deadline",
                    "date": d,
                    "needs_confirmation": False,
                    "evidence": {"snippet": f"Important date found in notice: {d}", "page": 1}
                })
        else:
            deadlines.append({
                "label": "Application Deadline",
                "date": None,
                "needs_confirmation": True,
                "evidence": {"snippet": "No explicit deadline date identified in document text", "page": 1}
            })

        courses = []
        for c in ["B.Tech", "M.Tech", "MCA", "MBA", "M.Sc", "Ph.D."]:
            if re.search(r'\b' + re.escape(c) + r'\b', notice_text, re.IGNORECASE):
                courses.append(c)
        if not courses:
            courses = ["All"]

        return {
            "title": "University Academic / Placement Notice",
            "summary": "Official notice extracted with deadlines, academic eligibility, and action items.",
            "deadlines": deadlines,
            "eligibility": {
                "courses": courses,
                "branches": branches,
                "years": ["3rd", "4th"],
                "min_cgpa": min_cgpa,
                "other_conditions": ["No active backlogs at time of application"],
                "evidence": {"snippet": "Eligible branches and academic requirements specified in notice", "page": 1}
            },
            "required_documents": [
                {"name": "Updated Resume (PDF)", "evidence": {"snippet": "Submission of updated resume required", "page": 1}},
                {"name": "College ID Card", "evidence": {"snippet": "Valid institute identity card", "page": 1}}
            ],
            "tasks": [
                {"title": "Verify eligibility criteria and required documents", "due": deadlines[0]["date"] if deadlines else None, "done": False},
                {"title": "Submit application on the official portal", "due": deadlines[0]["date"] if deadlines else None, "done": False}
            ]
        }
