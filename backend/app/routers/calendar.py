from typing import Optional
from fastapi import APIRouter, HTTPException, Response, Query
from app.schemas import GoogleCalendarSyncResponse
from app.services.calendar_service import CalendarService
from app.database import get_notice, get_google_token

router = APIRouter(prefix="/api/notices", tags=["Calendar"])

@router.get("/{notice_id}/calendar.ics")
@router.get("/{notice_id}/export-calendar")
async def download_ics_calendar(notice_id: str, email: Optional[str] = Query(None)):
    """
    Downloads an RFC 5545 compliant .ics calendar file containing all notice deadlines
    with automated 12-hour and 3-hour prior reminder alarms.
    Works offline with Apple Calendar, Google Calendar, and Microsoft Outlook.
    """
    notice = get_notice(notice_id)
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    extraction = notice.get("extraction", {})
    deadlines = extraction.get("deadlines", [])
    title = extraction.get("title", notice.get("title", "Notice"))

    ics_data = CalendarService.generate_ics_content(
        notice_title=title,
        deadlines=deadlines,
        student_email=email
    )

    return Response(
        content=ics_data,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f'attachment; filename="notice_{notice_id}_deadlines.ics"'
        }
    )

@router.post("/{notice_id}/sync-google-calendar", response_model=GoogleCalendarSyncResponse)
async def sync_notice_to_google_calendar(notice_id: str, email: Optional[str] = Query(None)):
    """
    Directly pushes notice deadlines into the student's personal Google Calendar via Google Calendar API v3
    with 12-hour and 3-hour prior reminder alarms, or generates direct 1-click Google Calendar links.
    """
    notice = get_notice(notice_id)
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    token_record = get_google_token("default_user")
    extraction = notice.get("extraction", {})
    deadlines = extraction.get("deadlines", [])
    title = extraction.get("title", notice.get("title", "Notice"))

    # If user has an active Google OAuth token, push to live Google Calendar API
    if token_record and token_record.get("access_token"):
        events = await CalendarService.sync_to_google_calendar(
            access_token=token_record["access_token"],
            notice_title=title,
            deadlines=deadlines,
            student_email=email
        )
        return GoogleCalendarSyncResponse(
            success=True,
            synced_events_count=len(events),
            events=events,
            message=f"Successfully synced {len(events)} deadlines with 12h & 3h reminders to your personal Google Calendar."
        )

    # 1-Click direct links and simulated demo response
    simulated_events = []
    for d in deadlines:
        if d.get("date"):
            direct_url = CalendarService.generate_google_calendar_url(
                notice_title=title,
                deadline_item=d,
                student_email=email
            )
            simulated_events.append({
                "event_id": f"sim_{d['date'].replace('-', '')}",
                "summary": f"[DocuPilot] {d.get('label', 'Deadline')}",
                "htmlLink": direct_url,
                "direct_calendar_url": direct_url
            })

    return GoogleCalendarSyncResponse(
        success=True,
        synced_events_count=len(simulated_events),
        events=simulated_events,
        message="12h & 3h reminders prepared. Click the direct link to save to your personal Google Calendar."
    )
