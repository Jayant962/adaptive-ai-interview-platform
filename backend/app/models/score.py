from sqlalchemy import Column, Integer, Float, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.connection import Base


class TechnicalScore(Base):
    __tablename__ = "technical_scores"

    id = Column(Integer, primary_key=True, index=True)
    answer_id = Column(Integer, ForeignKey("answers.id"), unique=True, nullable=False)
    technical_score = Column(Float, nullable=False, default=0.0)
    conceptual_score = Column(Float, nullable=False, default=0.0)
    relevance_score = Column(Float, nullable=False, default=0.0)
    strengths = Column(JSON, nullable=True)       # List of strength strings
    weaknesses = Column(JSON, nullable=True)      # List of weakness strings
    suggestions = Column(JSON, nullable=True)     # List of suggestion strings
    brief_overview = Column(Text, nullable=True)  # Overview description

    # Relationship
    answer = relationship("Answer", back_populates="technical_score")

    def __repr__(self):
        return f"<TechnicalScore answer_id={self.answer_id} score={self.technical_score}>"


class CommunicationScore(Base):
    __tablename__ = "communication_scores"

    id = Column(Integer, primary_key=True, index=True)
    answer_id = Column(Integer, ForeignKey("answers.id"), unique=True, nullable=False)
    grammar_score = Column(Float, nullable=False, default=0.0)
    fluency_score = Column(Float, nullable=False, default=0.0)
    confidence_score = Column(Float, nullable=False, default=0.0)
    communication_score = Column(Float, nullable=False, default=0.0)
    filler_count = Column(Integer, nullable=False, default=0)
    filler_words = Column(JSON, nullable=True)    # Dict of filler: count
    vocab_diversity = Column(Float, nullable=True)

    # Relationship
    answer = relationship("Answer", back_populates="communication_score")

    def __repr__(self):
        return f"<CommunicationScore answer_id={self.answer_id} grammar={self.grammar_score}>"
