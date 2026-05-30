import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from database.db import get_db
from models.models import User
from schemas.schemas import UserSignup, UserLogin, ForgotPassword, TokenResponse
from auth.utils import hash_password, verify_password, create_access_token
from services.email_service import send_welcome_email, send_password_email
from config import settings

router = APIRouter()


@router.post("/signup", status_code=201)
async def signup(data: UserSignup, db: Session = Depends(get_db)):
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(data.password)
    user = User(
        name=data.name,
        email=data.email,
        password=hashed,
        plain_password=data.password
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Fire-and-forget: email failure must NEVER block or crash signup
    async def _send_welcome():
        try:
            await send_welcome_email(data.email, data.name)
        except Exception as e:
            print(f"Welcome email failed (non-critical): {e}")

    asyncio.create_task(_send_welcome())

    return {"message": "Account created successfully. Please login."}


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_name=user.name,
        user_email=user.email
    )


@router.post("/forgot-password")
async def forgot_password(data: ForgotPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")

    try:
        await send_password_email(user.email, user.name, user.plain_password or "Please reset your password manually.")
    except Exception as e:
        print(f"Email sending failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email. Check SMTP configuration.")

    return {"message": "Password sent to your registered email"}