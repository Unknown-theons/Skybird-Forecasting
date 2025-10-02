"""Pydantic schemas for authentication endpoints."""
from pydantic import BaseModel, EmailStr, validator
from typing import Optional


class UserRegister(BaseModel):
    """User registration schema."""
    email: EmailStr
    password: str
    
    @validator("password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLogin(BaseModel):
    """User login schema."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response schema."""
    id: int
    email: str
    
    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Authentication response schema."""
    access_token: str
    token_type: str = "bearer"


class ErrorResponse(BaseModel):
    """Error response schema."""
    error: str
    detail: Optional[str] = None
