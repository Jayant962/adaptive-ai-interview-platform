from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class StartInterviewRequest(BaseModel):
    topic: str
    difficulty: str  # easy / medium / hard
    custom_topic: Optional[str] = None


class StartInterviewResponse(BaseModel):
    session_id: int
    first_question: str
    question_id: int
    topic: str
    difficulty: str
    total_questions: int


class GenerateFollowUpRequest(BaseModel):
    session_id: int
    question_id: int
    user_answer: str
    question_text: Optional[str] = None
    follow_up_count: int = 0


class GenerateFollowUpResponse(BaseModel):
    has_follow_up: bool
    follow_up_question: Optional[str] = None
    follow_up_question_id: Optional[int] = None
    reason: Optional[str] = None  # why follow-up was generated


class SubmitAnswerRequest(BaseModel):
    session_id: int
    question_id: int
    transcript: str
    duration: Optional[float] = None


class SubmitAnswerResponse(BaseModel):
    answer_id: int
    technical_feedback: dict
    communication_feedback: dict
    next_action: str  # "follow_up" / "next_question" / "end_interview"


class EndInterviewRequest(BaseModel):
    session_id: int


class InterviewSessionResponse(BaseModel):
    id: int
    topic: str
    difficulty: str
    status: str
    interview_date: datetime
    total_questions: int
    overall_score: Optional[float] = None
    technical_score: Optional[float] = None
    communication_score: Optional[float] = None

    class Config:
        from_attributes = True


class InterviewHistoryItem(BaseModel):
    id: int
    topic: str
    difficulty: str
    interview_date: datetime
    overall_score: Optional[float] = None
    technical_score: Optional[float] = None
    communication_score: Optional[float] = None
    total_questions: int
    duration: Optional[int] = None

    class Config:
        from_attributes = True
