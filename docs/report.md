# DocuPilot - Project Status Report

Hacktoberfest Hack Day Prayagraj x CC Club MNNIT  
Track 1: Applied AI and Next-Gen Agents  
Date: October 31, 2026  

---

## 1. Executive Summary

DocuPilot (ActionLens) is a specialized Notice-to-Action agent built for MNNIT Allahabad students. Official university circulars, academic notices, and placement drives frequently arrive as complex, multi-page PDFs with scattered deadlines, rigid eligibility criteria, and critical action items.

DocuPilot ingests notices (PDF or raw text), extracts structured intelligence using Google Gemini API, deterministically verifies student eligibility (CPI, active backlogs, department matching), and generates actionable calendar events (direct Google Calendar sync or offline RFC 5545 `.ics` export).

---

## 2. What Is Done (Backend Complete)

### A. Document Ingestion and Parsing (`backend/app/services/document.py`, `document_parser.py`)
- Dual-engine PDF extraction using `pypdf` with robust error handling and page boundary tracking.
- Plain text ingestion with automated sectioning and chunking.
- File validation (PDF format check, 10MB size limit enforcement, empty file protection).
- Temporary file lifecycle management with guaranteed cleanup.

### B. Persistent SQLite Storage Layer (`backend/app/database.py`, `backend/app/services/storage.py`)
- Zero-external-dependency SQLite engine using Python's standard `sqlite3`.
- Auto-migration mechanism on startup (e.g., automated column patching for `active_backlogs`).
- Storage services for:
  - Extracted notices (`notices` table) with JSON-serialized metadata, deadlines, and eligibility criteria.
  - Student profiles (`student_profiles` table) storing roll number, branch, degree, CPI, and active backlogs.
- Full CRUD operations with clean parameter binding preventing SQL injection.

### C. Deterministic Eligibility Engine (`backend/app/services/eligibility.py`)
- Accurate comparison logic for:
  - CPI / CGPA cutoff checks (e.g., student CPI >= required CPI).
  - Active backlog constraint evaluation (`allow_backlogs` flag vs student `active_backlogs`).
  - Degree level verification (B.Tech, M.Tech, MCA, MBA).
  - Department alias mapping for MNNIT (e.g., "CSE" matches "Computer Science and Engineering", "ECE" matches "Electronics and Communication Engineering").
- Explicit reason generation detailing why a student is eligible or ineligible for any given notice.

### D. Gemini AI Intelligence Service (`backend/app/services/gemini.py`, `gemini_service.py`)
- Clean REST API integration using `httpx` without heavy SDKs.
- Automatic fallback cascade across models (`gemini-3.5-flash-lite`, `gemini-flash-latest`).
- Structured JSON output parsing guaranteed against markdown code fencing.
- Regex and document-grounded offline fallback when network is unavailable or rate limits trigger.
- Grounded contextual Q&A endpoint allowing students to ask specific questions about any notice.

### E. Calendar Sync and Offline Export (`backend/app/services/calendar_service.py`, `google_auth.py`)
- Google OAuth 2.0 flow for student calendar authorization.
- Direct Google Calendar API v3 event insertion with RFC 3339 timestamps and automated refresh token support.
- Offline RFC 5545 standard `.ics` file generator requiring zero external calendar libraries.
- One-click calendar download endpoint for easy import into Outlook, Apple Calendar, or Google Calendar.

### F. REST API Routers and Middleware (`backend/app/main.py`, `backend/app/routers/`)
- Modern FastAPI lifespan context manager.
- CORS middleware configured for cross-origin frontend communication.
- Comprehensive REST endpoints:
  - `POST /notices/extract`: Ingest notice file/text and extract intelligence.
  - `GET /notices/{id}`: Retrieve parsed notice metadata.
  - `GET /notices`: List recent notices.
  - `POST /notices/{id}/ask`: Ask grounded questions about a specific notice.
  - `POST /profile`: Save or update student academic profile.
  - `GET /profile/{roll_number}`: Fetch student profile.
  - `GET /notices/{id}/eligibility/{roll_number}`: Check eligibility for notice.
  - `POST /calendar/sync`: Push notice deadlines to Google Calendar.
  - `GET /notices/{id}/export-calendar`: Download RFC 5545 `.ics` file.
  - `GET /auth/google/url`: Generate Google OAuth sign-in URL.
  - `GET /auth/google/callback`: Handle OAuth callback code.
  - `GET /health`: System health and service configuration status.

---

## 3. What Is Left (Pending Work)

1. Frontend User Interface
   - Web interface built with React / Vite / Tailwind CSS.
   - Student profile onboarding form (Roll number, Department, Degree, CPI, Backlogs).
   - Notice upload drag-and-drop zone with instant PDF preview.
   - Eligibility status card (green/red indicator with itemized reasons).
   - Interactive Q&A chat drawer grounded in the active notice.
   - One-click Google Calendar sync button and `.ics` file download link.

2. College Notice Testing and Calibration
   - Ingest 5 to 10 sample notices from MNNIT (training and placement circulars, exam schedule notifications, fee submission deadlines, club recruitment circulars).
   - Calibrate regex fallback patterns for local MNNIT circular header formats.

3. Final Presentation and Demo
   - Record a 2-3 minute demonstration video showcasing end-to-end user journey: PDF upload -> instant extraction -> student eligibility check -> calendar sync.
   - Prepare presentation slides covering problem statement, system architecture, and tech stack.

---

## 4. Git Branching and Contribution Structure

The backend development was divided across discrete feature branches to maintain clean separation of concerns and clear contribution histories between team members:

1. `feature/schemas-and-parser`
   - Requirements, schema definitions (`notice.py`, `profile.py`), and PDF/text parsing logic.
   - Contributor: Aditi Gupta

2. `feature/sqlite-storage`
   - SQLite database configuration, table initialization, and storage service layer.
   - Contributor: Yashwardhan Singh

3. `feature/eligibility-engine`
   - Deterministic criteria evaluation engine with MNNIT branch aliases and backlog checks.
   - Contributor: Aditi Gupta

4. `feature/gemini-intelligence`
   - Gemini REST API client, structured extraction, fallback cascade, and grounded Q&A.
   - Contributor: Aditi Gupta

5. `feature/calendar-sync`
   - Google Calendar OAuth 2.0 integration, event sync, and RFC 5545 `.ics` file generation.
   - Contributor: Yashwardhan Singh

6. `feature/api-routers`
   - FastAPI routers, route mounting, lifespan management, and health endpoints.
   - Contributor: Yashwardhan Singh

7. `feature/documentation`
   - System documentation, API specifications, and project report.
   - Contributor: Yashwardhan Singh
