import urllib.parse
import httpx
from typing import Dict, Any, Optional
from app.config import settings

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/calendar.events"
]

class GoogleAuthService:
    @staticmethod
    def get_authorization_url(state: str = "default_state") -> str:
        """
        Builds the Google OAuth 2.0 consent URL.
        """
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state
        }
        return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"

    @staticmethod
    async def exchange_code_for_tokens(code: str) -> Optional[Dict[str, Any]]:
        """
        Exchanges authorization code for access and refresh tokens.
        """
        data = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.GOOGLE_REDIRECT_URI
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(GOOGLE_TOKEN_URL, data=data)
                if res.status_code == 200:
                    token_data = res.json()
                    
                    # Fetch user email
                    access_token = token_data.get("access_token")
                    userinfo_res = await client.get(
                        GOOGLE_USERINFO_URL,
                        headers={"Authorization": f"Bearer {access_token}"}
                    )
                    email = None
                    if userinfo_res.status_code == 200:
                        email = userinfo_res.json().get("email")

                    token_data["email"] = email
                    return token_data
                else:
                    print(f"Token exchange error: {res.status_code} {res.text}")
        except Exception as e:
            print(f"Failed to exchange Google OAuth code: {e}")

        return None

