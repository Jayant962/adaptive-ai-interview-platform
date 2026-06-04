from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.connection import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic = Column(String(255), nullable=False)
    custom_topic = Column(String(255), nullable=True)  # for custom topics
    difficulty = Column(String(20), nullable=False)  # easy / medium / hard
    status = Column(String(20), default="in_progress")  # in_progress / completed
    interview_date = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True)  # in seconds
    total_questions = Column(Integer, default=0)
    overall_score = Column(Float, nullable=True)
    technical_score = Column(Float, nullable=True)
    communication_score = Column(Float, nullable=True)

    # Relationships
    user = relationship("User", back_populates="interview_sessions")
    questions = relationship("Question", back_populates="interview_session", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="interview_session", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<InterviewSession id={self.id} topic={self.topic} difficulty={self.difficulty}>"
