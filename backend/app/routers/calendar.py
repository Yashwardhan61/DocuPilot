from fastapi import APIRouter, HTTPException, Response
from app.schemas import GoogleCalendarSyncResponse
from app.services.calendar_service import CalendarService
from app.database import get_notice, get_google_token

router = APIRouter(prefix="/api/notices", tags=["Calendar"])

@router.get("/{notice_id}/calendar.ics")
async def download_ics_calendar(notice_id: str):
    """
    Downloads an RFC 5545 compliant .ics calendar file containing all notice deadlines.
    Works offline with Apple Calendar, Google Calendar, and Microsoft Outlook.
    """
    notice = get_notice(notice_id)
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    extraction = notice.get("extraction", {})
    deadlines = extraction.get("deadlines", [])
    title = extraction.get("title", notice.get("title", "Notice"))

    ics_data = CalendarService.generate_ics_content(title, deadlines)

    return Response(
        content=ics_data,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f'attachment; filename="notice_{notice_id}_deadlines.ics"'
        }
    )

@router.post("/{notice_id}/sync-google-calendar", response_model=GoogleCalendarSyncResponse)
async def sync_notice_to_google_calendar(notice_id: str):
    """
    Directly pushes notice deadlines into the student's personal Google Calendar via Google Calendar API v3.
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
            token_record["access_token"],
            title,
            deadlines
        )
        return GoogleCalendarSyncResponse(
            success=True,
            synced_events_count=len(events),
            events=events,
            message=f"Successfully synced {len(events)} deadlines directly to your personal Google Calendar."
        )

    # Simulated demo response if OAuth has not been authenticated
    simulated_events = []
    for d in deadlines:
        if d.get("date"):
            simulated_events.append({
                "event_id": f"sim_{d['date'].replace('-', '')}",
                "summary": f"[DocuPilot] {d.get('label', 'Deadline')}",
                "htmlLink": "https://calendar.google.com"
            })

    return GoogleCalendarSyncResponse(
        success=True,
        synced_events_count=len(simulated_events),
        events=simulated_events,
        message="Demo Mode: Google Calendar events prepared. Connect your Google account for live sync."
    )

