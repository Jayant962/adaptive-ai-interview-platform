from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    interview_session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    parent_question_id = Column(Integer, ForeignKey("questions.id"), nullable=True)  # for follow-ups
    question_text = Column(Text, nullable=False)
    question_order = Column(Integer, nullable=False)
    question_type = Column(String(20), nullable=False)  # main / followup

    # Relationships
    interview_session = relationship("InterviewSession", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")
    follow_ups = relationship("Question", foreign_keys=[parent_question_id])

    def __repr__(self):
        return f"<Question id={self.id} type={self.question_type} order={self.question_order}>"
