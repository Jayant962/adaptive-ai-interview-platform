"""
Interview Service
Core business logic for managing interviews.
Coordinates between Groq, NLP, ML, and Database.
"""
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models import (
    User, InterviewSession, Question, Answer,
    TechnicalScore, CommunicationScore, Report, Analytics
)
from app.services.groq_service import (
    generate_question, generate_follow_up,
    evaluate_technical, generate_report_summary
)
from app.nlp.analyzer import run_nlp_analysis, run_language_tool_check
from app.ml.scorer import compute_all_communication_scores


# Number of main questions per interview
QUESTIONS_PER_INTERVIEW = {"easy": 5, "medium": 7, "hard": 8}


def start_interview(
    db: Session,
    user_id: int,
    topic: str,
    difficulty: str,
    custom_topic: Optional[str] = None
) -> Dict:
    """
    Start a new interview session.
    Creates session, generates first question.
    """
    # Use custom topic if provided
    effective_topic = custom_topic if custom_topic else topic

    # Create interview session
    session = InterviewSession(
        user_id=user_id,
        topic=effective_topic,
        custom_topic=custom_topic,
        difficulty=difficulty.lower(),
        status="in_progress",
        interview_date=datetime.utcnow(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Generate first question
    first_question_text = generate_question(
        topic=effective_topic,
        difficulty=difficulty,
        previous_questions=[]
    )

    # Save question to DB
    question = Question(
        interview_session_id=session.id,
        question_text=first_question_text,
        question_order=1,
        question_type="main",
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    total_qs = QUESTIONS_PER_INTERVIEW.get(difficulty.lower(), 5)

    return {
        "session_id": session.id,
        "first_question": first_question_text,
        "question_id": question.id,
        "topic": effective_topic,
        "difficulty": difficulty,
        "total_questions": total_qs,
    }


def submit_answer_and_evaluate(
    db: Session,
    session_id: int,
    question_id: int,
    transcript: str,
    duration: Optional[float] = None
) -> Dict:
    """
    Submit answer, run full evaluation pipeline.
    Returns technical + communication feedback.
    """
    # Get question
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise ValueError(f"Question {question_id} not found")

    # Get session
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise ValueError(f"Session {session_id} not found")

    # Save answer
    answer = Answer(
        question_id=question_id,
        transcript=transcript,
        duration=duration,
        timestamp=datetime.utcnow(),
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)

    # ── TECHNICAL EVALUATION (Groq) ──
    tech_result = evaluate_technical(
        question=question.question_text,
        answer=transcript,
        topic=session.topic,
        difficulty=session.difficulty,
    )

    # Save technical score
    tech_score = TechnicalScore(
        answer_id=answer.id,
        technical_score=tech_result["technical_score"],
        conceptual_score=tech_result["conceptual_score"],
        relevance_score=tech_result["relevance_score"],
        strengths=tech_result["strengths"],
        weaknesses=tech_result["weaknesses"],
        suggestions=tech_result["suggestions"],
        brief_overview=tech_result.get("brief_overview"),
    )
    db.add(tech_score)

    # ── COMMUNICATION EVALUATION (NLP + ML) ──
    nlp_data = run_nlp_analysis(transcript)
    lt_data = run_language_tool_check(transcript)
    comm_result = compute_all_communication_scores(nlp_data, lt_data, duration=duration)

    # Save communication score
    comm_score = CommunicationScore(
        answer_id=answer.id,
        grammar_score=comm_result["grammar_score"],
        fluency_score=comm_result["fluency_score"],
        confidence_score=comm_result["confidence_score"],
        communication_score=comm_result["communication_score"],
        filler_count=comm_result["filler_count"],
        filler_words=comm_result["filler_words"],
        vocab_diversity=comm_result["vocab_diversity"],
    )
    db.add(comm_score)
    db.commit()

    return {
        "answer_id": answer.id,
        "technical_feedback": {
            "technical_score": tech_result["technical_score"],
            "conceptual_score": tech_result["conceptual_score"],
            "relevance_score": tech_result["relevance_score"],
            "strengths": tech_result["strengths"],
            "weaknesses": tech_result["weaknesses"],
            "suggestions": tech_result["suggestions"],
            "brief_overview": tech_result.get("brief_overview"),
        },
        "communication_feedback": {
            "grammar_score": comm_result["grammar_score"],
            "fluency_score": comm_result["fluency_score"],
            "confidence_score": comm_result["confidence_score"],
            "communication_score": comm_result["communication_score"],
            "filler_count": comm_result["filler_count"],
            "filler_words": comm_result["filler_words"],
            "speaking_suggestions": comm_result.get("speaking_suggestions", []),
            "stop_word_count": nlp_data.get("stop_word_count", 0),
            "stop_word_ratio": nlp_data.get("stop_word_analysis", {}).get("stop_word_ratio", 0.0),
        },
    }


def get_next_question(
    db: Session,
    session_id: int,
    difficulty: str,
    topic: str
) -> Optional[Dict]:
    """
    Generate the next main question for the interview.
    Returns None if interview should end.
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        return None

    # Count existing main questions
    main_questions = db.query(Question).filter(
        Question.interview_session_id == session_id,
        Question.question_type == "main"
    ).all()

    total_qs = QUESTIONS_PER_INTERVIEW.get(difficulty.lower(), 5)

    if len(main_questions) >= total_qs:
        return None  # Interview complete

    # Get all previous question texts
    all_questions = db.query(Question).filter(
        Question.interview_session_id == session_id
    ).all()
    previous_texts = [q.question_text for q in all_questions]

    # Generate new question
    new_question_text = generate_question(
        topic=topic,
        difficulty=difficulty,
        previous_questions=previous_texts
    )

    question = Question(
        interview_session_id=session_id,
        question_text=new_question_text,
        question_order=len(main_questions) + 1,
        question_type="main",
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    return {
        "question_id": question.id,
        "question_text": question.question_text,
        "question_number": len(main_questions) + 1,
        "total_questions": total_qs,
    }


def get_adaptive_follow_up(
    db: Session,
    session_id: int,
    question_id: int,
    user_answer: str,
    follow_up_count: int
) -> Dict:
    """
    Generate adaptive follow-up based on user answer.
    """
    question = db.query(Question).filter(Question.id == question_id).first()
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()

    if not question or not session:
        return {"has_follow_up": False}

    # Strict check: If answer is generic, evasive or has a technical score of 0.0, bypass follow-up
    ans_lower = user_answer.lower()
    word_count = len(user_answer.split())
    generic_phrases = [
        "i don't know", "i do not know", "i am not sure", "no idea", "not sure",
        "let me think", "i forgot", "pass", "no comment", "don't know", "skip"
    ]
    is_generic = any(phrase in ans_lower for phrase in generic_phrases) or word_count < 8
    
    if not user_answer or len(user_answer.strip()) < 8 or is_generic:
        return {
            "has_follow_up": False,
            "reason": "Generic, off-topic, or evasive answer provided."
        }

    # Retrieve TechnicalScore for the last answer to this question
    last_answer = db.query(Answer).filter(Answer.question_id == question_id).order_by(Answer.id.desc()).first()
    if last_answer:
        tech_score_obj = db.query(TechnicalScore).filter(TechnicalScore.answer_id == last_answer.id).first()
        if tech_score_obj and tech_score_obj.technical_score == 0.0:
            return {
                "has_follow_up": False,
                "reason": "Generic or off-topic answer provided (Score is 0.0)."
            }

    result = generate_follow_up(
        original_question=question.question_text,
        user_answer=user_answer,
        topic=session.topic,
        difficulty=session.difficulty,
        follow_up_number=follow_up_count,
    )

    if result["generate_follow_up"] and result["follow_up_question"]:
        # Save follow-up question
        follow_up_q = Question(
            interview_session_id=session_id,
            parent_question_id=question_id,
            question_text=result["follow_up_question"],
            question_order=follow_up_count + 1,
            question_type="followup",
        )
        db.add(follow_up_q)
        db.commit()
        db.refresh(follow_up_q)

        return {
            "has_follow_up": True,
            "follow_up_question": result["follow_up_question"],
            "follow_up_question_id": follow_up_q.id,
            "reason": result.get("reason", ""),
        }

    return {
        "has_follow_up": False,
        "reason": result.get("reason", ""),
    }


def end_interview_and_generate_report(
    db: Session,
    session_id: int
) -> Dict:
    """
    End interview, compute final scores, generate report.
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise ValueError(f"Session {session_id} not found")

    # Get all questions and answers
    questions = db.query(Question).filter(
        Question.interview_session_id == session_id
    ).order_by(Question.question_order).all()

    # Compute average scores
    tech_scores = []
    comm_scores = []
    grammar_scores = []
    fluency_scores = []
    confidence_scores = []

    question_summaries_text = ""
    question_report_items = []

    for q in questions:
        if q.answers:
            ans = q.answers[0]
            ts = ans.technical_score
            cs = ans.communication_score

            if ts:
                # Weight: follow-up good answers improve the score
                weight = 1.0 if q.question_type == "main" else 0.8
                avg_tech = (ts.technical_score + ts.conceptual_score + ts.relevance_score) / 3
                tech_scores.append((avg_tech, weight))

                question_summaries_text += (
                    f"Q: {q.question_text}\n"
                    f"A: {ans.transcript[:200]}...\n"
                    f"Tech Score: {avg_tech:.0f}/100\n\n"
                )

            if cs:
                comm_scores.append(cs.communication_score)
                grammar_scores.append(cs.grammar_score)
                fluency_scores.append(cs.fluency_score)
                confidence_scores.append(cs.confidence_score)

            item = {
                "question_id": q.id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "question_order": q.question_order,
                "transcript": ans.transcript if ans else None,
                "duration": ans.duration if ans else None,
            }
            if ts:
                item["technical"] = {
                    "technical_score": ts.technical_score,
                    "conceptual_score": ts.conceptual_score,
                    "relevance_score": ts.relevance_score,
                    "strengths": ts.strengths or [],
                    "weaknesses": ts.weaknesses or [],
                    "suggestions": ts.suggestions or [],
                    "brief_overview": getattr(ts, "brief_overview", None) or "No overview available.",
                }
            if cs:
                item["communication"] = {
                    "grammar_score": cs.grammar_score,
                    "fluency_score": cs.fluency_score,
                    "confidence_score": cs.confidence_score,
                    "communication_score": cs.communication_score,
                    "filler_count": cs.filler_count,
                    "filler_words": cs.filler_words or {},
                }
            question_report_items.append(item)

    # Weighted average for technical (follow-up improvements boost score)
    if tech_scores:
        total_weight = sum(w for _, w in tech_scores)
        avg_tech = sum(s * w for s, w in tech_scores) / total_weight
    else:
        avg_tech = 0.0

    avg_comm = sum(comm_scores) / len(comm_scores) if comm_scores else 0.0
    avg_grammar = sum(grammar_scores) / len(grammar_scores) if grammar_scores else 0.0
    avg_fluency = sum(fluency_scores) / len(fluency_scores) if fluency_scores else 0.0
    avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0

    overall_score = (avg_tech * 0.60 + avg_comm * 0.40)

    # Update session
    session.status = "completed"
    session.completed_at = datetime.utcnow()
    session.total_questions = len([q for q in questions if q.question_type == "main"])
    session.overall_score = round(overall_score, 1)
    session.technical_score = round(avg_tech, 1)
    session.communication_score = round(avg_comm, 1)

    if session.interview_date:
        delta = datetime.utcnow() - session.interview_date
        session.duration = int(delta.total_seconds())

    # Generate report summary via Groq
    summary = generate_report_summary(
        topic=session.topic,
        difficulty=session.difficulty,
        technical_score=avg_tech,
        communication_score=avg_comm,
        total_questions=session.total_questions,
        question_summaries=question_summaries_text,
    )

    # Create/update report
    existing_report = db.query(Report).filter(
        Report.interview_session_id == session_id
    ).first()

    if existing_report:
        report = existing_report
    else:
        report = Report(interview_session_id=session_id)
        db.add(report)

    report.overall_score = round(overall_score, 1)
    report.technical_score = round(avg_tech, 1)
    report.communication_score = round(avg_comm, 1)
    report.grammar_score = round(avg_grammar, 1)
    report.fluency_score = round(avg_fluency, 1)
    report.confidence_score = round(avg_confidence, 1)
    report.strengths_summary = summary.get("strengths_summary", [])
    report.weaknesses_summary = summary.get("weaknesses_summary", [])
    report.improvement_plan = summary.get("improvement_plan", [])
    report.generated_at = datetime.utcnow()

    db.commit()
    db.refresh(report)

    # Update analytics
    _update_analytics(db, session.user_id, session)

    return {
        "session_id": session_id,
        "report_id": report.id,
        "overall_score": report.overall_score,
        "technical_score": report.technical_score,
        "communication_score": report.communication_score,
        "grammar_score": report.grammar_score,
        "fluency_score": report.fluency_score,
        "confidence_score": report.confidence_score,
        "strengths_summary": report.strengths_summary,
        "weaknesses_summary": report.weaknesses_summary,
        "improvement_plan": report.improvement_plan,
        "questions": question_report_items,
    }


def _update_analytics(db: Session, user_id: int, session: InterviewSession):
    """Update user analytics after interview completion."""
    analytics = db.query(Analytics).filter(Analytics.user_id == user_id).first()

    if not analytics:
        analytics = Analytics(user_id=user_id)
        db.add(analytics)

    # Get all completed sessions for this user
    all_sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == user_id,
        InterviewSession.status == "completed",
        InterviewSession.overall_score.isnot(None)
    ).all()

    analytics.total_interviews = len(all_sessions)

    if all_sessions:
        scores = [s.overall_score for s in all_sessions if s.overall_score]
        analytics.avg_score = round(sum(scores) / len(scores), 1) if scores else None
        analytics.best_score = round(max(scores), 1) if scores else None
        total_time = sum(s.duration or 0 for s in all_sessions)
        analytics.total_time_spent = total_time

        # Topic performance
        topic_scores = {}
        for s in all_sessions:
            if s.topic and s.overall_score:
                if s.topic not in topic_scores:
                    topic_scores[s.topic] = []
                topic_scores[s.topic].append(s.overall_score)

        topic_avg = {t: sum(sc) / len(sc) for t, sc in topic_scores.items()}
        sorted_topics = sorted(topic_avg.items(), key=lambda x: x[1], reverse=True)

        analytics.strongest_topics = [t for t, _ in sorted_topics[:3]]
        analytics.weakest_topics = [t for t, _ in sorted_topics[-3:]]

        # Growth data
        tech_growth = [
            {"date": s.completed_at.isoformat(), "score": s.technical_score}
            for s in all_sessions if s.technical_score and s.completed_at
        ]
        comm_growth = [
            {"date": s.completed_at.isoformat(), "score": s.communication_score}
            for s in all_sessions if s.communication_score and s.completed_at
        ]
        analytics.technical_growth = tech_growth
        analytics.communication_growth = comm_growth

    analytics.last_updated = datetime.utcnow()
    db.commit()
