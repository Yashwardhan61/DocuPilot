from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from app.schemas import GoogleAuthStatus
from app.services.google_auth import GoogleAuthService
from app.database import save_google_token, get_google_token, delete_google_token
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Google Authentication"])

@router.get("/google/login")
async def google_login():
    """
    Redirects user to Google OAuth 2.0 consent screen.
    """
    if not settings.GOOGLE_CLIENT_ID:
        # If client ID is missing, redirect back to frontend with demo note
        return RedirectResponse(url=f"{settings.FRONTEND_ORIGIN}?oauth=demo_mode")
    
    url = GoogleAuthService.get_authorization_url()
    return RedirectResponse(url=url)

@router.get("/google/callback")
async def google_callback(code: str = Query(...), state: str = Query(None)):
    """
    Handles Google OAuth redirect, exchanges code for access & refresh tokens,
    and stores them in SQLite.
    """
    tokens = await GoogleAuthService.exchange_code_for_tokens(code)
    if not tokens:
        raise HTTPException(status_code=400, detail="Failed to retrieve Google OAuth tokens")

    save_google_token(
        user_id="default_user",
        access_token=tokens["access_token"],
        refresh_token=tokens.get("refresh_token"),
        expiry=str(tokens.get("expires_in")),
        email=tokens.get("email")
    )

    return RedirectResponse(url=f"{settings.FRONTEND_ORIGIN}?auth_success=true")

@router.get("/status", response_model=GoogleAuthStatus)
async def auth_status():
    """
    Checks if student has connected their personal Google Account.
    """
    token_record = get_google_token("default_user")
    if token_record and token_record.get("access_token"):
        return GoogleAuthStatus(connected=True, email=token_record.get("email"))
    return GoogleAuthStatus(connected=False, email=None)

@router.post("/disconnect")
async def disconnect_google():
    """
    Disconnects stored Google credentials.
    """
    delete_google_token("default_user")
    return {"message": "Google Account disconnected successfully"}

