"""
Auth API Routes
POST /api/auth/sync - Sync Clerk user to our database
GET  /api/auth/profile - Get current user profile
"""
import os
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database.connection import get_db, SessionLocal
from app.schemas.user import UserSync, UserResponse
from app.services.auth_service import get_or_create_user, get_user_by_clerk_id
from app.utils.auth_middleware import get_current_user_id, get_current_db_user
from app.models.user import User
from app.utils.email import send_welcome_email

logger = logging.getLogger("app.api.auth")

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


async def send_welcome_email_background(user_id: int):
    """
    Background task to send a welcome email to the user.
    Only updates welcome_email_sent to True if the email is successfully sent.
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning(f"User ID {user_id} not found in background task for welcome email")
            return
        
        if not user.email or "@" not in user.email:
            logger.warning(f"User ID {user_id} does not have a valid email: {user.email}")
            return

        success = await send_welcome_email(user.email, user.name)
        if success:
            user.welcome_email_sent = True
            db.commit()
            logger.info(f"Marked welcome email as sent for user {user.id}")
        else:
            logger.error(f"Failed to send welcome email to user {user.id}, welcome_email_sent left as False")
    except Exception as e:
        logger.error(f"Exception in welcome email background task for user ID {user_id}: {str(e)}")
        db.rollback()
    finally:
        db.close()


@router.post("/sync")
async def sync_user(
    user_data: UserSync,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Sync Clerk user to our database.
    - New users: creates DB record and sends a welcome email.
    - Existing users: just updates last_login — no email sent.
    Returns is_new_user so the frontend can redirect existing users
    away from the signup page back to login.
    """
    if user_data.is_signup:
        # Prevent existing users from signing up
        existing_user = db.query(User).filter(
            (User.clerk_user_id == user_data.clerk_user_id) | (User.email == user_data.email)
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="User already registered. Please log in."
            )

    user, is_new_user = get_or_create_user(
        db=db,
        clerk_user_id=user_data.clerk_user_id,
        name=user_data.name,
        email=user_data.email,
        profile_image=user_data.profile_image,
    )

    # Welcome email is sent ONLY on signup
    if is_new_user and user.email and "@" in user.email:
        is_serverless = os.environ.get("VERCEL") is not None or os.environ.get("AWS_EXECUTION_ENV") is not None
        if is_serverless:
            logger.info("Serverless env detected — sending welcome email synchronously.")
            await send_welcome_email_background(user.id)
        else:
            background_tasks.add_task(send_welcome_email_background, user.id)

    user_dict = {
        "id": user.id,
        "clerk_user_id": user.clerk_user_id,
        "name": user.name,
        "email": user.email,
        "profile_image": user.profile_image,
        "registration_date": user.registration_date,
        "last_login": user.last_login,
        "welcome_email_sent": user.welcome_email_sent,
        "is_new_user": is_new_user,
    }
    return JSONResponse(content={
        k: (v.isoformat() if hasattr(v, 'isoformat') else v)
        for k, v in user_dict.items()
    })


@router.get("/profile", response_model=UserResponse)
async def get_profile(
    current_user: User = Depends(get_current_db_user)
):
    """
    Get current authenticated user's profile.
    """
    return current_user


@router.post("/test-email")
async def test_email(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_db_user)
):
    """
    Send a test welcome email to the current logged-in user.
    Helpful to verify SMTP configuration.
    """
    if not current_user.email or "@" not in current_user.email:
        raise HTTPException(status_code=400, detail="User has no valid email address")
    
    background_tasks.add_task(send_welcome_email, current_user.email, current_user.name)
    return {"message": f"Test welcome email scheduled for {current_user.email}"}


@router.post("/test-email-sync")
async def test_email_sync(
    current_user: User = Depends(get_current_db_user)
):
    """
    Send a test welcome email synchronously and return the direct result.
    Extremely helpful for debugging SMTP configuration in production (Vercel/Render).
    """
    if not current_user.email or "@" not in current_user.email:
        raise HTTPException(status_code=400, detail="User has no valid email address")
    
    success = await send_welcome_email(current_user.email, current_user.name)
    if success:
        return {
            "status": "success",
            "message": f"Test welcome email successfully sent to {current_user.email}"
        }
    else:
        raise HTTPException(
            status_code=500,
            detail="Failed to send email. Check your SMTP settings and server logs for details."
        )


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
