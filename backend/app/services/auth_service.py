import uuid
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, Dict, Any
from app.database import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    create_user_session,
    get_user_by_session_token,
    delete_user_session,
    save_profile,
    get_profile
)

SESSION_EXPIRY_DAYS = 30

class AuthService:
    @staticmethod
    def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
        """
        NIST SP 800-132 compliant PBKDF2-HMAC-SHA256 password hashing.
        Generates 128-bit cryptographically secure salt.
        """
        if not salt:
            salt = secrets.token_hex(16)
        hashed = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        ).hex()
        return hashed, salt

    @staticmethod
    def verify_password(password: str, password_hash: str, salt: str) -> bool:
        """
        Constant-time password comparison to prevent timing attacks.
        """
        computed_hash, _ = AuthService.hash_password(password, salt)
        return secrets.compare_digest(computed_hash, password_hash)

    @staticmethod
    def generate_token() -> str:
        """
        Generates 256-bit URL-safe session token.
        """
        return secrets.token_urlsafe(32)

    @staticmethod
    def register(email: str, password: str, full_name: str, branch: Optional[str] = None, year: Optional[str] = None, cgpa: Optional[float] = None) -> Tuple[Dict[str, Any], str]:
        """
        Registers a new user and creates their active session.
        """
        cleaned_email = email.lower().strip()
        existing = get_user_by_email(cleaned_email)
        if existing:
            raise ValueError("Email already registered")

        user_id = str(uuid.uuid4())
        password_hash, salt = AuthService.hash_password(password)
        user = create_user(user_id, cleaned_email, full_name, password_hash, salt)

        # Initialize student profile
        if branch or year or cgpa is not None:
            save_profile(
                profile_id=user_id,
                branch=branch or "CSE",
                year=year or "3rd",
                cgpa=cgpa if cgpa is not None else 8.0
            )

        token = AuthService.generate_token()
        expires_at = (datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRY_DAYS)).isoformat()
        create_user_session(token, user_id, expires_at)

        profile = get_profile(user_id)
        user["profile"] = profile
        return user, token

    @staticmethod
    def login(email: str, password: str) -> Tuple[Dict[str, Any], str]:
        """
        Authenticates user credentials and generates a new session token.
        """
        cleaned_email = email.lower().strip()
        user_record = get_user_by_email(cleaned_email)
        if not user_record:
            raise PermissionError("Invalid email or password")

        if not AuthService.verify_password(password, user_record["password_hash"], user_record["salt"]):
            raise PermissionError("Invalid email or password")

        user_id = user_record["id"]
        token = AuthService.generate_token()
        expires_at = (datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRY_DAYS)).isoformat()
        create_user_session(token, user_id, expires_at)

        profile = get_profile(user_id)
        user = {
            "id": user_id,
            "email": user_record["email"],
            "full_name": user_record["full_name"],
            "created_at": user_record["created_at"],
            "profile": profile
        }
        return user, token

    @staticmethod
    def get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
        """
        Validates token and returns current user with their profile.
        """
        user = get_user_by_session_token(token)
        if not user:
            return None
        user["profile"] = get_profile(user["id"])
        return user

    @staticmethod
    def logout(token: str):
        """
        Revokes user session token.
        """
        delete_user_session(token)

