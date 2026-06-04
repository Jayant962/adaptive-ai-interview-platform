"""
Auth API Routes
POST /api/auth/sync - Sync Clerk user to our database
GET  /api/auth/profile - Get current user profile
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.user import UserSync, UserResponse
from app.services.auth_service import get_or_create_user, get_user_by_clerk_id
from app.utils.auth_middleware import get_current_user_id, get_current_db_user
from app.models.user import User
from app.utils.email import send_welcome_email

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/sync", response_model=UserResponse)
async def sync_user(
    user_data: UserSync,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Sync Clerk user to our PostgreSQL database.
    Called immediately after user signs in/up via Clerk.
    Creates user if not exists, updates last_login if exists.
    """
    user = get_or_create_user(
        db=db,
        clerk_user_id=user_data.clerk_user_id,
        name=user_data.name,
        email=user_data.email,
        profile_image=user_data.profile_image,
    )
    if user.email and "@" in user.email and not user.welcome_email_sent:
        user.welcome_email_sent = True
        db.commit()
        db.refresh(user)
        background_tasks.add_task(send_welcome_email, user.email, user.name)
    return user


@router.get("/profile", response_model=UserResponse)
async def get_profile(
    current_user: User = Depends(get_current_db_user)
):
    """
    Get current authenticated user's profile.
    """
    return current_user


@router.get("/check/{clerk_user_id}")
async def check_user_exists(
    clerk_user_id: str,
    db: Session = Depends(get_db)
):
    """
    Check if a user exists in our database.
    Used by frontend to determine if sync is needed.
    """
    user = get_user_by_clerk_id(db, clerk_user_id)
    return {"exists": user is not None, "user_id": user.id if user else None}
