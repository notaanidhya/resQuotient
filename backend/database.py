from sqlalchemy import create_engine, Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.types import JSON
from datetime import datetime
import uuid

from config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_name = Column(String, nullable=True)
    role = Column(String, nullable=False)
    resume_text = Column(Text, nullable=False, default="")
    resume_profile = Column(JSON, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    questions = relationship("Question", back_populates="session", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    text = Column(Text, nullable=False)
    source_chunks = Column(JSON, nullable=True)
    sequence_number = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="questions")
    answer = relationship(
        "Answer",
        back_populates="question",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Answer(Base):
    __tablename__ = "answers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id = Column(String, ForeignKey("questions.id"), nullable=False)
    session_id = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    question = relationship("Question", back_populates="answer")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
