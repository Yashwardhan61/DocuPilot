import uuid
from datetime import datetime, timezone, timedelta
import urllib.parse
from typing import Dict, Any, List, Optional

try:
    import httpx
except ImportError:
    httpx = None

class CalendarService:
    @staticmethod
    def generate_google_calendar_url(
        notice_title: str,
        deadline_item: Dict[str, Any],
        student_email: Optional[str] = None
    ) -> str:
        """
        Generates a direct Google Calendar Web Intent URL for 1-click reminder creation.
        Pre-populates title, dates, evidence, and attendee email.
        """
        date_val = deadline_item.get("date")
        d_obj = None
        if date_val:
            for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
                try:
                    d_obj = datetime.strptime(str(date_val)[:10], fmt)
                    break
                except ValueError:
                    pass
        if not d_obj:
            d_obj = datetime.now(timezone.utc)
        
        start_date = d_obj.strftime("%Y%m%d")
        end_date = (d_obj + timedelta(days=1)).strftime("%Y%m%d")
        dates_param = f"{start_date}/{end_date}"

        label = deadline_item.get("label", "Deadline")
        summary = f"[DocuPilot] {label} - {notice_title}"
        
        snippet = deadline_item.get("evidence", {}).get("snippet", "Notice deadline verified by DocuPilot")
        page = deadline_item.get("evidence", {}).get("page", 1)
        description = (
            f"Notice: {notice_title}\n"
            f"Milestone: {label}\n"
            f"Evidence: {snippet} (Page {page})\n\n"
            "DocuPilot Automated Notice-to-Action Reminder (12h & 3h prior notification enabled)."
        )

        params: Dict[str, str] = {
            "action": "TEMPLATE",
            "text": summary,
            "dates": dates_param,
            "details": description,
        }

        if student_email and "@" in student_email:
            params["add"] = student_email

        query_string = urllib.parse.urlencode(params)
        return f"https://calendar.google.com/calendar/render?{query_string}"

    @staticmethod
    def build_google_calendar_event_body(
        notice_title: str,
        deadline_item: Dict[str, Any],
        student_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Builds a single event payload for Google Calendar API v3 with both 12-hour and 3-hour prior reminder overrides.
        """
        date_val = deadline_item.get("date")
        date_str = str(date_val)[:10] if date_val else datetime.now(timezone.utc).strftime("%Y-%m-%d")
        label = deadline_item.get("label", "Deadline")

        evidence = deadline_item.get("evidence", {}).get("snippet", "")
        page = deadline_item.get("evidence", {}).get("page", 1)

        # Timed event at 23:59:00 on the deadline day
        start_iso = f"{date_str}T23:59:00+05:30"
        end_iso = f"{date_str}T23:59:00+05:30"

        event_body: Dict[str, Any] = {
            "summary": f"[DocuPilot] {label} - {notice_title}",
            "description": (
                f"Notice: {notice_title}\n"
                f"Milestone: {label}\n"
                f"Evidence: {evidence} (Page {page})\n\n"
                "Automated reminder synchronized by DocuPilot.\n"
                "Configured alarms: 12 hours prior and 3 hours prior."
            ),
            "start": {
                "dateTime": start_iso,
                "timeZone": "Asia/Kolkata"
            },
            "end": {
                "dateTime": end_iso,
                "timeZone": "Asia/Kolkata"
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "popup", "minutes": 720}, # 12 hours prior
                    {"method": "popup", "minutes": 180}  # 3 hours prior
                ]
            }
        }

        return event_body

    @staticmethod
    def generate_ics_content(
        notice_title: str,
        deadlines: List[Dict[str, Any]],
        student_email: Optional[str] = None
    ) -> str:
        """
        Generates RFC 5545 compliant iCalendar (.ics) string with 12h and 3h reminder alarms.
        Compatible with Google Calendar, Apple Calendar, and Microsoft Outlook.
        """
        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//DocuPilot//ActionLens Calendar Generator//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH"
        ]

        now_str = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

        for item in deadlines:
            date_val = item.get("date")
            if not date_val:
                continue

            clean_date = "".join(c for c in str(date_val) if c.isdigit())
            if len(clean_date) >= 8:
                dt_start = clean_date[:8]
            else:
                dt_start = datetime.now(timezone.utc).strftime("%Y%m%d")

            event_uid = f"{uuid.uuid4()}@docupilot.local"
            summary = f"[DocuPilot] {item.get('label', 'Deadline')} - {notice_title}"
            evidence = item.get("evidence", {}).get("snippet", "Extracted via DocuPilot")
            description = f"Notice: {notice_title}\\nEvidence: {evidence}\\nDocuPilot reminder alarms: 12h & 3h prior."

            event_lines = [
                "BEGIN:VEVENT",
                f"UID:{event_uid}",
                f"DTSTAMP:{now_str}",
                f"DTSTART;VALUE=DATE:{dt_start}",
                f"SUMMARY:{summary}",
                f"DESCRIPTION:{description}",
                "STATUS:CONFIRMED"
            ]

            if student_email and "@" in student_email:
                event_lines.append(f"ATTENDEE;CN=Student;ROLE=REQ-PARTICIPANT:mailto:{student_email}")

            # 12-hour prior alarm (-PT12H)
            event_lines.extend([
                "BEGIN:VALARM",
                "TRIGGER:-PT12H",
                "ACTION:DISPLAY",
                "DESCRIPTION:DocuPilot Reminder: Upcoming deadline in 12 hours",
                "END:VALARM"
            ])

            # 3-hour prior alarm (-PT3H)
            event_lines.extend([
                "BEGIN:VALARM",
                "TRIGGER:-PT3H",
                "ACTION:DISPLAY",
                "DESCRIPTION:DocuPilot Final Alert: Upcoming deadline in 3 hours",
                "END:VALARM",
                "END:VEVENT"
            ])

            lines.extend(event_lines)

        lines.append("END:VCALENDAR")
        return "\r\n".join(lines) + "\r\n"

    @staticmethod
    async def sync_to_google_calendar(
        access_token: str,
        notice_title: str,
        deadlines: List[Dict[str, Any]],
        student_email: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Inserts events directly into the student's personal Google Calendar using Google Calendar API v3.
        """
        if httpx is None:
            raise RuntimeError("httpx package is required for direct Google Calendar API sync.")

        created_events = []
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        async with httpx.AsyncClient(timeout=20.0) as client:
            for item in deadlines:
                date_val = item.get("date")
                if not date_val:
                    continue

                # Omit past deadlines
                date_str = str(date_val)[:10]
                if date_str < today_str:
                    continue

                event_body = CalendarService.build_google_calendar_event_body(
                    notice_title=notice_title,
                    deadline_item=item,
                    student_email=student_email
                )

                url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
                resp = await client.post(url, headers=headers, json=event_body)
                if resp.status_code in [200, 201]:
                    ev = resp.json()
                    created_events.append({
                        "event_id": ev.get("id"),
                        "summary": event_body["summary"],
                        "htmlLink": ev.get("htmlLink", "")
                    })
                else:
                    try:
                        err_data = resp.json()
                        err_msg = err_data.get("error", {}).get("message", resp.text)
                    except Exception:
                        err_msg = resp.text
                    if resp.status_code in [401, 403]:
                        raise RuntimeError(f"Google Calendar authorization rejected ({resp.status_code}): {err_msg}")

        return created_events
