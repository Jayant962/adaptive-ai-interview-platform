from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Auth Schemas
class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPassword(BaseModel):
    email: EmailStr

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_name: str
    user_email: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

# Interview Schemas
class StartInterviewRequest(BaseModel):
    topic: str
    difficulty: str

class StartInterviewResponse(BaseModel):
    interview_id: int
    question_id: int
    question_text: str
    topic: str
    difficulty: str

class SubmitAnswerResponse(BaseModel):
    question_id: int
    transcript: str
    grammar_score: float
    fluency_score: float
    confidence_score: float
    conceptual_score: float
    overall_score: float
    ai_feedback: str
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]
    next_question_id: Optional[int]
    next_question_text: Optional[str]
    is_follow_up: bool

class ScoreReport(BaseModel):
    grammar_score: float
    fluency_score: float
    confidence_score: float
    conceptual_score: float
    overall_score: float
    ai_feedback: str
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]
