"""
AI Interview Platform - FastAPI Backend
Main application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database.connection import create_tables
from app.api.routes import auth, interview, reports, contact


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: create all database tables
    print("Starting AI Interview Platform Backend...")
    create_tables()
    print("Database ready")
    yield
    # Shutdown
    print("Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="AI Interview Platform API",
    description="Adaptive AI-powered mock interview platform backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware - allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all API routers
app.include_router(auth.router)
app.include_router(interview.router)
app.include_router(reports.router)
app.include_router(contact.router)


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "AI Interview Platform",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


# Run with: uvicorn app.main:app --reload --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
