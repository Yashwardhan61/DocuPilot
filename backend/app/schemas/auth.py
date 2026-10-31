from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class UserRegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=6, description="Password must be at least 6 characters")
    full_name: str
    branch: Optional[str] = None
    year: Optional[str] = None
    cgpa: Optional[float] = None

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: str
    profile: Optional[Dict[str, Any]] = None

class AuthResponse(BaseModel):
    user: UserResponse
    token: str
    token_type: str = "Bearer"

