from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.connection import Base


class Analytics(Base):
    __tablename__ = "analytics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    monthly_progress = Column(JSON, nullable=True)    # {month: avg_score}
    technical_growth = Column(JSON, nullable=True)    # [{date, score}]
    communication_growth = Column(JSON, nullable=True) # [{date, score}]
    strongest_topics = Column(JSON, nullable=True)    # [topic names]
    weakest_topics = Column(JSON, nullable=True)      # [topic names]
    total_interviews = Column(Integer, default=0)
    avg_score = Column(Float, nullable=True)
    best_score = Column(Float, nullable=True)
    total_time_spent = Column(Integer, default=0)     # in seconds
    last_updated = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="analytics")

    def __repr__(self):
        return f"<Analytics user_id={self.user_id} total={self.total_interviews}>"
