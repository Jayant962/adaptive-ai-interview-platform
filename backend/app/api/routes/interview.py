"""
Interview API Routes
POST /api/interview/start           - Start new interview
POST /api/interview/submit-answer   - Submit answer + get evaluation
POST /api/interview/follow-up       - Get adaptive follow-up question
POST /api/interview/next-question   - Get next main question
POST /api/interview/end             - End interview + generate report
GET  /api/interview/history         - Get interview history
GET  /api/interview/{session_id}    - Get specific session
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.connection import get_db
from app.models.user import User
from app.models.interview import InterviewSession
from app.models.question import Question
from app.schemas.interview import (
    StartInterviewRequest, StartInterviewResponse,
    SubmitAnswerRequest, SubmitAnswerResponse,
    GenerateFollowUpRequest, GenerateFollowUpResponse,
    EndInterviewRequest, InterviewHistoryItem,
)
from app.services.interview_service import (
    start_interview, submit_answer_and_evaluate,
    get_adaptive_follow_up, get_next_question,
    end_interview_and_generate_report,
)
from app.utils.auth_middleware import get_current_db_user

router = APIRouter(prefix="/api/interview", tags=["Interview"])


@router.post("/start")
async def start_new_interview(
    request: StartInterviewRequest,
    current_user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db)
):
    """
    Start a new interview session.
    Generates first question immediately.
    """
    try:
        result = start_interview(
            db=db,
            user_id=current_user.id,
            topic=request.topic,
            difficulty=request.difficulty,
            custom_topic=request.custom_topic,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/submit-answer")
async def submit_answer(
    request: SubmitAnswerRequest,
    current_user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db)
):
    """
    Submit user's answer and receive evaluation.
    Returns both technical (Groq) and communication (NLP+ML) feedback.
    """
    # Verify session belongs to user
    session = db.query(InterviewSession).filter(
        InterviewSession.id == request.session_id,
        InterviewSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if not request.transcript or len(request.transcript.strip()) < 5:
        raise HTTPException(status_code=400, detail="Answer transcript is required")

    try:
        result = submit_answer_and_evaluate(
            db=db,
            session_id=request.session_id,
            question_id=request.question_id,
            transcript=request.transcript,
            duration=request.duration,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/follow-up")
async def get_follow_up(
    request: GenerateFollowUpRequest,
    current_user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db)
):
    """
    Get an adaptive follow-up question based on user's answer.
    Follow-up is generated ONLY if the answer needs deeper probing.
    """
    try:
        result = get_adaptive_follow_up(
            db=db,
            session_id=request.session_id,
            question_id=request.question_id,
            user_answer=request.user_answer,
            follow_up_count=request.follow_up_count,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/next-question")
async def next_question(
    data: dict,
    current_user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db)
):
    """
    Generate next main question.
    Returns null question_id when interview should end.
    """
    session_id = data.get("session_id")
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = get_next_question(
        db=db,
        session_id=session_id,
        difficulty=session.difficulty,
        topic=session.topic,
    )

    if result is None:
        return {"has_next": False, "question_id": None, "question_text": None}

    return {"has_next": True, **result}


@router.post("/end")
async def end_interview(
    request: EndInterviewRequest,
    current_user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db)
):
    """
    End interview and generate final report.
    Computes all aggregate scores and saves report.
    """
    session = db.query(InterviewSession).filter(
        InterviewSession.id == request.session_id,
        InterviewSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        result = end_interview_and_generate_report(db=db, session_id=request.session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=List[InterviewHistoryItem])
async def get_history(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db)
):
    """
    Get user's interview history, newest first.
    """
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id
    ).order_by(
        InterviewSession.interview_date.desc()
    ).offset(offset).limit(limit).all()

    return sessions


@router.get("/{session_id}")
async def get_session(
    session_id: int,
    current_user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db)
):
    """Get specific interview session details."""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "id": session.id,
        "topic": session.topic,
        "difficulty": session.difficulty,
        "status": session.status,
        "interview_date": session.interview_date,
        "overall_score": session.overall_score,
        "technical_score": session.technical_score,
        "communication_score": session.communication_score,
        "total_questions": session.total_questions,
        "duration": session.duration,
    }
