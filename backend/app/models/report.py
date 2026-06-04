from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.connection import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    interview_session_id = Column(Integer, ForeignKey("interview_sessions.id"), unique=True, nullable=False)
    overall_score = Column(Float, nullable=False, default=0.0)
    technical_score = Column(Float, nullable=False, default=0.0)
    communication_score = Column(Float, nullable=False, default=0.0)
    grammar_score = Column(Float, nullable=True)
    fluency_score = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    strengths_summary = Column(JSON, nullable=True)
    weaknesses_summary = Column(JSON, nullable=True)
    improvement_plan = Column(JSON, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    interview_session = relationship("InterviewSession", back_populates="report")

    def __repr__(self):
        return f"<Report id={self.id} session_id={self.interview_session_id} score={self.overall_score}>"
