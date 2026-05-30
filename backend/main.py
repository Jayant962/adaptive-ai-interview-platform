import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.db import engine, Base
from auth.routes import router as auth_router
from interview.routes import router as interview_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Mock Interview Platform", version="2.0.0")

# Allow comma-separated origins via env var for flexible deployment
raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173"
)
origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(interview_router, prefix="/api/interview", tags=["Interview"])

@app.get("/")
def root():
    return {"message": "AI Mock Interview Platform API v2 — Whisper-free build"}
