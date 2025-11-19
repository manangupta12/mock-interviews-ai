from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="in_progress")  # in_progress, completed
    current_stage = Column(String, default="explanation")  # explanation, coding, followup, complexity, optimization, complete
    code_solution = Column(Text, nullable=True)
    language = Column(String, nullable=True)
    stage_statistics = Column(JSON, nullable=True)  # Store time spent in each stage
    feedback = Column(Text, nullable=True)  # Store generated interview feedback
    test_results = Column(JSON, nullable=True)  # Store test case results: {passed: int, failed: int, total: int}
    
    transcripts = relationship("InterviewTranscript", back_populates="session", cascade="all, delete-orphan")


class InterviewTranscript(Base):
    __tablename__ = "interview_transcripts"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    speaker = Column(String, nullable=False)  # user or interviewer
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("InterviewSession", back_populates="transcripts")

