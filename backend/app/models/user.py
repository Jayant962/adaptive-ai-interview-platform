from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.connection import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    clerk_user_id = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    profile_image = Column(Text, nullable=True)
    registration_date = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    welcome_email_sent = Column(Boolean, default=False, nullable=False)

    # Relationships
    interview_sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")
    analytics = relationship("Analytics", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"
