from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    clerk_user_id: str
    name: str
    email: str
    profile_image: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    profile_image: Optional[str] = None
    last_login: Optional[datetime] = None


class UserResponse(BaseModel):
    id: int
    clerk_user_id: str
    name: str
    email: str
    profile_image: Optional[str] = None
    registration_date: datetime
    last_login: datetime
    welcome_email_sent: bool = False

    class Config:
        from_attributes = True


class UserSync(BaseModel):
    """Used for Clerk webhook user sync"""
    clerk_user_id: str
    name: str
    email: str
    profile_image: Optional[str] = None
