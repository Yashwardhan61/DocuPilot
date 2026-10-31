from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Header, Depends, status
from fastapi.responses import RedirectResponse
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    AuthResponse
)
from app.schemas import GoogleAuthStatus
from app.services.google_auth import GoogleAuthService
from app.services.auth_service import AuthService
from app.database import save_google_token, get_google_token, delete_google_token
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def extract_token_from_header(authorization: Optional[str] = Header(None)) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Expected 'Bearer <token>'"
        )
    return parts[1]

async def get_current_user(token: str = Depends(extract_token_from_header)) -> dict:
    user = AuthService.get_user_from_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token"
        )
    return user

# User Registration & Login Endpoints

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegisterRequest):
    """
    Registers a new student account and returns an authenticated session token.
    """
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters"
        )
    try:
        user, token = AuthService.register(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            branch=payload.branch,
            year=payload.year,
            cgpa=payload.cgpa
        )
        return AuthResponse(user=UserResponse(**user), token=token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/login", response_model=AuthResponse)
async def login(payload: UserLoginRequest):
    """
    Authenticates student credentials and issues a session token.
    """
    try:
        user, token = AuthService.login(email=payload.email, password=payload.password)
        return AuthResponse(user=UserResponse(**user), token=token)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Retrieves the currently authenticated user's profile and settings.
    """
    return UserResponse(**current_user)

@router.post("/logout")
async def logout(token: str = Depends(extract_token_from_header)):
    """
    Revokes the current session token.
    """
    AuthService.logout(token)
    return {"message": "Logged out successfully"}

# Google OAuth 2.0 Calendar Integration Endpoints

@router.get("/google/login")
async def google_login():
    """
    Redirects user to Google OAuth 2.0 consent screen.
    """
    if not settings.GOOGLE_CLIENT_ID:
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
