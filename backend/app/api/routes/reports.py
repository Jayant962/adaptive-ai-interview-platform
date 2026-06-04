"""
Reports API Routes
GET /api/reports/{session_id}    - Get report for a session
GET /api/reports/list            - Get all reports for user
GET /api/analytics               - Get user analytics
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.user import User
from app.models.report import Report
from app.models.interview import InterviewSession
from app.models.question import Question
from app.models.answer import Answer
from app.models.score import TechnicalScore, CommunicationScore
from app.models.analytics import Analytics
from app.utils.auth_middleware import get_current_db_user

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/list")
async def get_reports_list(
    current_user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db)
):
    """Get list of all reports for the current user."""
    reports = (
        db.query(Report)
        .join(InterviewSession)
        .filter(InterviewSession.user_id == current_user.id)
        .order_by(Report.generated_at.desc())
        .all()
    )

    result = []
    for r in reports:
        session = r.interview_session
        result.append({
            "report_id": r.id,
            "session_id": r.interview_session_id,
            "topic": session.topic if session else "Unknown",
            "difficulty": session.difficulty if session else "Unknown",
            "interview_date": session.interview_date if session else None,
            "overall_score": r.overall_score,
            "technical_score": r.technical_score,
            "communication_score": r.communication_score,
            "generated_at": r.generated_at,
        })
    return result


@router.get("/overall")
async def get_overall_report(
    current_user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db)
):
    """
    Get aggregated overall report metrics for the user across all completed sessions.
    Includes conceptual, communication scores, and recommended job role fits.
    """
    from app.services.groq_service import generate_job_fit
    
    # Get all completed interview sessions
    completed_sessions = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.user_id == current_user.id,
            InterviewSession.status == "completed"
        )
        .all()
    )
    
    total_interviews = len(completed_sessions)
    if total_interviews == 0:
        return {
            "total_interviews": 0,
            "overall_score": 0.0,
            "technical_score": 0.0,
            "communication_score": 0.0,
            "conceptual_score": 0.0,
            "grammar_score": 0.0,
            "fluency_score": 0.0,
            "confidence_score": 0.0,
            "topic_scores": {},
            "recommended_roles": [],
            "recent_sessions": []
        }
        
    # Aggregate scores
    overall_vals = [s.overall_score for s in completed_sessions if s.overall_score is not None]
    tech_vals = [s.technical_score for s in completed_sessions if s.technical_score is not None]
    comm_vals = [s.communication_score for s in completed_sessions if s.communication_score is not None]
    
    avg_overall = sum(overall_vals) / len(overall_vals) if overall_vals else 0.0
    avg_tech = sum(tech_vals) / len(tech_vals) if tech_vals else 0.0
    avg_comm = sum(comm_vals) / len(comm_vals) if comm_vals else 0.0
    
    # Calculate conceptual_score, grammar_score, fluency_score, confidence_score from Answers of completed sessions
    session_ids = [s.id for s in completed_sessions]
    
    conceptual_scores = (
        db.query(TechnicalScore.conceptual_score)
        .join(Answer)
        .join(Question)
        .filter(Question.interview_session_id.in_(session_ids))
        .all()
    )
    concept_vals = [c[0] for c in conceptual_scores if c[0] is not None]
    avg_concept = sum(concept_vals) / len(concept_vals) if concept_vals else 0.0
    
    communication_details = (
        db.query(
            CommunicationScore.grammar_score,
            CommunicationScore.fluency_score,
            CommunicationScore.confidence_score
        )
        .join(Answer)
        .join(Question)
        .filter(Question.interview_session_id.in_(session_ids))
        .all()
    )
    
    grammar_vals = [c[0] for c in communication_details if c[0] is not None]
    fluency_vals = [c[1] for c in communication_details if c[1] is not None]
    conf_vals = [c[2] for c in communication_details if c[2] is not None]
    
    avg_grammar = sum(grammar_vals) / len(grammar_vals) if grammar_vals else 0.0
    avg_fluency = sum(fluency_vals) / len(fluency_vals) if fluency_vals else 0.0
    avg_conf = sum(conf_vals) / len(conf_vals) if conf_vals else 0.0
    
    # Topic score averages
    topic_scores = {}
    topic_counts = {}
    for s in completed_sessions:
        if s.topic and s.overall_score is not None:
            topic_scores[s.topic] = topic_scores.get(s.topic, 0.0) + s.overall_score
            topic_counts[s.topic] = topic_counts.get(s.topic, 0) + 1
            
    avg_topic_scores = {topic: score / topic_counts[topic] for topic, score in topic_scores.items()}
    
    # Job role fit generation
    job_fit = generate_job_fit(
        topic_scores=avg_topic_scores,
        avg_tech=avg_tech,
        avg_concept=avg_concept,
        avg_comm=avg_comm
    )
    
    recent_sessions = [
        {
            "session_id": s.id,
            "topic": s.topic,
            "difficulty": s.difficulty,
            "overall_score": s.overall_score,
            "technical_score": s.technical_score,
            "communication_score": s.communication_score,
            "interview_date": s.interview_date.isoformat() if s.interview_date else None,
        }
        for s in completed_sessions[:10]
    ]
    
    return {
        "total_interviews": total_interviews,
        "overall_score": round(avg_overall, 1),
        "technical_score": round(avg_tech, 1),
        "communication_score": round(avg_comm, 1),
        "conceptual_score": round(avg_concept, 1),
        "grammar_score": round(avg_grammar, 1),
        "fluency_score": round(avg_fluency, 1),
        "confidence_score": round(avg_conf, 1),
        "topic_scores": {k: round(v, 1) for k, v in avg_topic_scores.items()},
        "recommended_roles": job_fit.get("recommended_roles", []),
        "recent_sessions": recent_sessions
    }


@router.get("/{session_id}")
async def get_report(
    session_id: int,
    current_user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db)
):
    """
    Get the full detailed report for an interview session.
    Includes per-question scores and feedback.
    """
    # Verify session belongs to user
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    report = db.query(Report).filter(
        Report.interview_session_id == session_id
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not generated yet")

    # Get all questions with answers and scores
    questions = db.query(Question).filter(
        Question.interview_session_id == session_id
    ).order_by(Question.question_order).all()

    question_items = []
    for q in questions:
        item = {
            "question_id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "question_order": q.question_order,
            "parent_question_id": q.parent_question_id,
        }

        if q.answers:
            ans = q.answers[0]
            item["transcript"] = ans.transcript
            item["duration"] = ans.duration
            item["timestamp"] = ans.timestamp.isoformat() if ans.timestamp else None

            if ans.technical_score:
                ts = ans.technical_score
                item["technical"] = {
                    "technical_score": ts.technical_score,
                    "conceptual_score": ts.conceptual_score,
                    "relevance_score": ts.relevance_score,
                    "strengths": ts.strengths or [],
                    "weaknesses": ts.weaknesses or [],
                    "suggestions": ts.suggestions or [],
                }
            else:
                item["technical"] = None

            if ans.communication_score:
                cs = ans.communication_score
                item["communication"] = {
                    "grammar_score": cs.grammar_score,
                    "fluency_score": cs.fluency_score,
                    "confidence_score": cs.confidence_score,
                    "communication_score": cs.communication_score,
                    "filler_count": cs.filler_count,
                    "filler_words": cs.filler_words or {},
                    "vocab_diversity": cs.vocab_diversity,
                }
            else:
                item["communication"] = None
        else:
            item["transcript"] = None

        question_items.append(item)

    return {
        "report_id": report.id,
        "session_id": session_id,
        "topic": session.topic,
        "difficulty": session.difficulty,
        "interview_date": session.interview_date.isoformat() if session.interview_date else None,
        "duration": session.duration,
        "overall_score": report.overall_score,
        "technical_score": report.technical_score,
        "communication_score": report.communication_score,
        "grammar_score": report.grammar_score,
        "fluency_score": report.fluency_score,
        "confidence_score": report.confidence_score,
        "strengths_summary": report.strengths_summary or [],
        "weaknesses_summary": report.weaknesses_summary or [],
        "improvement_plan": report.improvement_plan or [],
        "questions": question_items,
        "generated_at": report.generated_at.isoformat() if report.generated_at else None,
    }


@router.get("/analytics/me")
async def get_analytics(
    current_user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db)
):
    """Get user's analytics and progress data."""
    analytics = db.query(Analytics).filter(
        Analytics.user_id == current_user.id
    ).first()

    # Get recent sessions for chart data
    recent_sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == "completed"
    ).order_by(InterviewSession.interview_date.desc()).limit(10).all()

    recent_data = [
        {
            "id": s.id,
            "topic": s.topic,
            "difficulty": s.difficulty,
            "date": s.interview_date.isoformat() if s.interview_date else None,
            "overall_score": s.overall_score,
            "technical_score": s.technical_score,
            "communication_score": s.communication_score,
        }
        for s in recent_sessions
    ]

    if analytics:
        return {
            "total_interviews": analytics.total_interviews,
            "avg_score": analytics.avg_score,
            "best_score": analytics.best_score,
            "total_time_spent": analytics.total_time_spent,
            "monthly_progress": analytics.monthly_progress or {},
            "technical_growth": analytics.technical_growth or [],
            "communication_growth": analytics.communication_growth or [],
            "strongest_topics": analytics.strongest_topics or [],
            "weakest_topics": analytics.weakest_topics or [],
            "recent_sessions": recent_data,
        }

    # No analytics yet - return defaults
    return {
        "total_interviews": 0,
        "avg_score": None,
        "best_score": None,
        "total_time_spent": 0,
        "monthly_progress": {},
        "technical_growth": [],
        "communication_growth": [],
        "strongest_topics": [],
        "weakest_topics": [],
        "recent_sessions": recent_data,
    }
