from sqlalchemy import Column, Integer, Text, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.connection import Base


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    transcript = Column(Text, nullable=False)
    audio_path = Column(String(500), nullable=True)
    duration = Column(Float, nullable=True)  # in seconds
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    question = relationship("Question", back_populates="answers")
    technical_score = relationship("TechnicalScore", back_populates="answer", uselist=False, cascade="all, delete-orphan")
    communication_score = relationship("CommunicationScore", back_populates="answer", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Answer id={self.id} question_id={self.question_id}>"
