"""
Auth Service - Clerk Integration
Verifies JWT tokens from Clerk, syncs users to our database.
"""
import httpx
from typing import Optional, Dict
from sqlalchemy.orm import Session
from app.config import settings
from app.models.user import User


CLERK_API_BASE = "https://api.clerk.com/v1"


async def verify_clerk_token(token: str) -> Optional[Dict]:
    """
    Verify a Clerk JWT token and return user info.
    Uses Clerk's /oauth/token/info endpoint.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{CLERK_API_BASE}/sessions/verify",
                headers={
                    "Authorization": f"Bearer {settings.CLERK_SECRET_KEY}",
                    "Content-Type": "application/json",
                },
                params={"token": token}
            )
            if response.status_code == 200:
                return response.json()
            return None
    except Exception:
        return None


async def get_clerk_user(clerk_user_id: str) -> Optional[Dict]:
    """
    Fetch user details from Clerk API.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{CLERK_API_BASE}/users/{clerk_user_id}",
                headers={
                    "Authorization": f"Bearer {settings.CLERK_SECRET_KEY}",
                }
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    "clerk_user_id": data.get("id"),
                    "name": f"{data.get('first_name', '')} {data.get('last_name', '')}".strip(),
                    "email": data.get("email_addresses", [{}])[0].get("email_address", ""),
                    "profile_image": data.get("image_url"),
                }
            return None
    except Exception:
        return None


def get_or_create_user(
    db: Session,
    clerk_user_id: str,
    name: str,
    email: str,
    profile_image: Optional[str] = None
) -> User:
    """
    Get existing user or create new one.
    Called after Clerk authentication.
    """
    from datetime import datetime

    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()

    if user:
        # Update last login
        user.last_login = datetime.utcnow()
        if name and name != user.name:
            user.name = name
        if email and email != user.email:
            user.email = email
        if profile_image:
            user.profile_image = profile_image
        db.commit()
        db.refresh(user)
        return user

    # Create new user
    user = User(
        clerk_user_id=clerk_user_id,
        name=name,
        email=email,
        profile_image=profile_image,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_clerk_id(db: Session, clerk_user_id: str) -> Optional[User]:
    """Get user by Clerk user ID."""
    return db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
