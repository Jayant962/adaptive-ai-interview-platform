from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import json

from database.db import get_db
from models.models import User, Interview, Question
from schemas.schemas import StartInterviewRequest, StartInterviewResponse
from auth.utils import get_current_user
from ai_engine.groq_service import generate_first_question, evaluate_answer, generate_next_question

router = APIRouter()


# ── Request body for text-based answer submission ─────────────────────────
class SubmitTextAnswerRequest(BaseModel):
    interview_id: int
    question_id: int
    transcript: str          # sent from browser Web Speech API


# ── Start Interview ────────────────────────────────────────────────────────
@router.post("/start", response_model=StartInterviewResponse)
def start_interview(
    data: StartInterviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    interview = Interview(
        user_id=current_user.id,
        topic=data.topic,
        difficulty=data.difficulty
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    question_text = generate_first_question(data.topic, data.difficulty)

    question = Question(
        interview_id=interview.id,
        question_text=question_text
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    return StartInterviewResponse(
        interview_id=interview.id,
        question_id=question.id,
        question_text=question_text,
        topic=data.topic,
        difficulty=data.difficulty
    )


# ── Submit Answer (TEXT — no audio, no Whisper) ────────────────────────────
@router.post("/submit-answer")
def submit_answer(
    data: SubmitTextAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify interview belongs to user
    interview = db.query(Interview).filter(
        Interview.id == data.interview_id,
        Interview.user_id == current_user.id
    ).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    # Get current question
    question = db.query(Question).filter(Question.id == data.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    transcript = data.transcript.strip() if data.transcript else ""

    # Evaluate answer using Groq
    evaluation = evaluate_answer(
        question=question.question_text,
        answer=transcript,
        topic=interview.topic,
        difficulty=interview.difficulty
    )

    # Persist scores
    question.user_answer = transcript
    question.ai_feedback = evaluation["ai_feedback"]
    question.grammar_score = evaluation["grammar_score"]
    question.fluency_score = evaluation["fluency_score"]
    question.confidence_score = evaluation["confidence_score"]
    question.conceptual_score = evaluation["conceptual_score"]
    question.overall_score = evaluation["overall_score"]
    question.strengths = json.dumps(evaluation["strengths"])
    question.weaknesses = json.dumps(evaluation["weaknesses"])
    question.suggestions = json.dumps(evaluation["suggestions"])
    db.commit()

    # Count answered questions
    question_count = db.query(Question).filter(
        Question.interview_id == data.interview_id
    ).count()

    # Generate next adaptive question
    next_q = generate_next_question(
        topic=interview.topic,
        difficulty=interview.difficulty,
        previous_question=question.question_text,
        previous_answer=transcript,
        answer_quality=evaluation.get("answer_quality", "average"),
        question_count=question_count
    )

    # Update difficulty if adapted
    if next_q["new_difficulty"] != interview.difficulty:
        interview.difficulty = next_q["new_difficulty"]
        db.commit()

    # Save next question
    new_question = Question(
        interview_id=data.interview_id,
        question_text=next_q["question_text"]
    )
    db.add(new_question)
    db.commit()
    db.refresh(new_question)

    return {
        "question_id": question.id,
        "transcript": transcript,
        "grammar_score": evaluation["grammar_score"],
        "fluency_score": evaluation["fluency_score"],
        "confidence_score": evaluation["confidence_score"],
        "conceptual_score": evaluation["conceptual_score"],
        "overall_score": evaluation["overall_score"],
        "ai_feedback": evaluation["ai_feedback"],
        "strengths": evaluation["strengths"],
        "weaknesses": evaluation["weaknesses"],
        "suggestions": evaluation["suggestions"],
        "next_question_id": new_question.id,
        "next_question_text": next_q["question_text"],
        "is_follow_up": next_q["is_follow_up"]
    }


# ── Score Report ───────────────────────────────────────────────────────────
@router.get("/score-report/{interview_id}")
def get_score_report(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    interview = db.query(Interview).filter(
        Interview.id == interview_id,
        Interview.user_id == current_user.id
    ).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    questions = db.query(Question).filter(
        Question.interview_id == interview_id,
        Question.user_answer.isnot(None)
    ).all()

    if not questions:
        raise HTTPException(status_code=404, detail="No completed questions found")

    avg = lambda key: round(sum(getattr(q, key) or 0 for q in questions) / len(questions), 1)

    return {
        "interview_id": interview_id,
        "topic": interview.topic,
        "difficulty": interview.difficulty,
        "total_questions": len(questions),
        "grammar_score": avg("grammar_score"),
        "fluency_score": avg("fluency_score"),
        "confidence_score": avg("confidence_score"),
        "conceptual_score": avg("conceptual_score"),
        "overall_score": avg("overall_score"),
    }
