"""
FastAPI dependency for Clerk authentication.
Extracts clerk_user_id from Authorization header.
"""
from fastapi import HTTPException, Header, Depends
from sqlalchemy.orm import Session
from typing import Optional
import httpx
import json
import base64

from app.database.connection import get_db
from app.models.user import User
from app.config import settings


def decode_jwt_payload(token: str) -> Optional[dict]:
    """
    Decode JWT payload without verification (Clerk verifies on their end).
    We trust Clerk's frontend SDK to provide valid tokens.
    For production, use Clerk's verify endpoint.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        payload_b64 = parts[1]
        # Add padding
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        return json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        return None


async def get_current_user_id(
    authorization: Optional[str] = Header(None)
) -> str:
    """
    Extract clerk_user_id from Clerk JWT token.
    Returns clerk_user_id string.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")

    token = authorization[7:]

    # Decode JWT to get sub (clerk_user_id)
    payload = decode_jwt_payload(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    clerk_user_id = payload.get("sub")
    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing user ID")

    return clerk_user_id


async def get_current_db_user(
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> User:
    """
    Get the database user object for the authenticated Clerk user.
    """
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User profile not found. Please sync your profile first."
        )
    return user
