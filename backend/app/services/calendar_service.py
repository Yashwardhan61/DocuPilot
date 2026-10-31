import uuid
from datetime import datetime, timezone
import httpx
from typing import Dict, Any, List

class CalendarService:
    @staticmethod
    def generate_ics_content(notice_title: str, deadlines: List[Dict[str, Any]]) -> str:
        """
        Generates RFC 5545 compliant iCalendar (.ics) string.
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

            # Standardize date to YYYYMMDD
            clean_date = "".join(c for c in str(date_val) if c.isdigit())
            if len(clean_date) >= 8:
                dt_start = clean_date[:8]
            else:
                dt_start = datetime.now(timezone.utc).strftime("%Y%m%d")

            event_uid = f"{uuid.uuid4()}@docupilot.local"
            summary = f"[DocuPilot] {item.get('label', 'Deadline')} - {notice_title}"
            evidence = item.get("evidence", {}).get("snippet", "Extracted via DocuPilot")
            description = f"Notice: {notice_title}\\nEvidence: {evidence}\\nAutomated deadline created by DocuPilot."

            lines.extend([
                "BEGIN:VEVENT",
                f"UID:{event_uid}",
                f"DTSTAMP:{now_str}",
                f"DTSTART;VALUE=DATE:{dt_start}",
                f"SUMMARY:{summary}",
                f"DESCRIPTION:{description}",
                "STATUS:CONFIRMED",
                "BEGIN:VALARM",
                "TRIGGER:-P1D",
                "ACTION:DISPLAY",
                "DESCRIPTION:Reminder: Upcoming deadline tomorrow",
                "END:VALARM",
                "END:VEVENT"
            ])

        lines.append("END:VCALENDAR")
        return "\r\n".join(lines) + "\r\n"

    @staticmethod
    async def sync_to_google_calendar(access_token: str, notice_title: str, deadlines: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Inserts events directly into the student's primary Google Calendar using Google Calendar API v3.
        """
        created_events = []
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            for item in deadlines:
                date_val = item.get("date")
                if not date_val:
                    continue

                event_body = {
                    "summary": f"[DocuPilot] {item.get('label', 'Deadline')} - {notice_title}",
                    "description": (
                        f"Notice: {notice_title}\n"
                        f"Evidence: {item.get('evidence', {}).get('snippet', '')}\n"
                        f"Page: {item.get('evidence', {}).get('page', 1)}\n\n"
                        "Automated deadline synchronized by DocuPilot."
                    ),
                    "start": {"date": str(date_val)[:10]},
                    "end": {"date": str(date_val)[:10]},
                    "reminders": {
                        "useDefault": False,
                        "overrides": [
                            {"method": "popup", "minutes": 24 * 60},  # 1 day before
                            {"method": "popup", "minutes": 3 * 60}    # 3 hours before
                        ]
                    }
                }

                url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
                resp = await client.post(url, headers=headers, json=event_body)
                if resp.status_code in [200, 201]:
                    ev = resp.json()
                    created_events.append({
                        "event_id": ev.get("id"),
                        "htmlLink": ev.get("htmlLink"),
                        "summary": ev.get("summary")
                    })
                else:
                    print(f"Google Calendar event insertion error {resp.status_code}: {resp.text}")

        return created_events
