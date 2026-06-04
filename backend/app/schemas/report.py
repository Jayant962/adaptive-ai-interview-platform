from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any


class TechnicalScoreResponse(BaseModel):
    technical_score: float
    conceptual_score: float
    relevance_score: float
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]

    class Config:
        from_attributes = True


class CommunicationScoreResponse(BaseModel):
    grammar_score: float
    fluency_score: float
    confidence_score: float
    communication_score: float
    filler_count: int
    filler_words: Optional[Dict[str, int]] = None
    vocab_diversity: Optional[float] = None

    class Config:
        from_attributes = True


class QuestionReportItem(BaseModel):
    question_id: int
    question_text: str
    question_type: str
    question_order: int
    transcript: Optional[str] = None
    duration: Optional[float] = None
    technical: Optional[TechnicalScoreResponse] = None
    communication: Optional[CommunicationScoreResponse] = None


class ReportResponse(BaseModel):
    id: int
    session_id: int
    topic: str
    difficulty: str
    interview_date: datetime
    duration: Optional[int] = None
    overall_score: float
    technical_score: float
    communication_score: float
    grammar_score: Optional[float] = None
    fluency_score: Optional[float] = None
    confidence_score: Optional[float] = None
    strengths_summary: Optional[List[str]] = None
    weaknesses_summary: Optional[List[str]] = None
    improvement_plan: Optional[List[str]] = None
    questions: List[QuestionReportItem] = []
    generated_at: datetime

    class Config:
        from_attributes = True


class AnalyticsResponse(BaseModel):
    total_interviews: int
    avg_score: Optional[float] = None
    best_score: Optional[float] = None
    total_time_spent: int
    monthly_progress: Optional[Dict[str, float]] = None
    technical_growth: Optional[List[Dict]] = None
    communication_growth: Optional[List[Dict]] = None
    strongest_topics: Optional[List[str]] = None
    weakest_topics: Optional[List[str]] = None

    class Config:
        from_attributes = True
