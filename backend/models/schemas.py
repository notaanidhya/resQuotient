from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SessionCreate(BaseModel):
    role: str
    candidate_name: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    role: str
    candidate_name: Optional[str]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ResumeProfile(BaseModel):
    skills: List[str]
    domain_exposure: List[str]
    experience_level: str


class ResumeUploadResponse(BaseModel):
    session_id: str
    profile: ResumeProfile
    message: str


class QuestionResponse(BaseModel):
    id: str
    text: str
    sequence_number: int
    total_questions: int
    is_last: bool


class AnswerSubmit(BaseModel):
    answer_text: str


class AnswerResponse(BaseModel):
    status: str
    question: Optional[QuestionResponse] = None
    session_id: str


class QAPair(BaseModel):
    question: str
    answer: str
    sequence_number: int


class SessionSummary(BaseModel):
    session_id: str
    role: str
    candidate_name: Optional[str]
    qa_pairs: List[QAPair]
    insights: str
    overall_assessment: str
    topics_covered: List[str]
    created_at: datetime
