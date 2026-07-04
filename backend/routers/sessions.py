from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from database import get_db, Session
from models.schemas import SessionCreate, SessionResponse
from services.session_manager import session_manager

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

VALID_ROLES = [
    "AI/ML Engineer",
    "Backend Engineer",
    "Data Scientist",
    "Full Stack Engineer",
]


@router.post("/", response_model=SessionResponse)
def create_session(data: SessionCreate, db: DBSession = Depends(get_db)):
    if data.role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {VALID_ROLES}",
        )
    session = session_manager.create_session(db, data.role, data.candidate_name)
    return session


@router.get("/roles/list")
def list_roles():
    return {
        "roles": [
            {
                "value": "AI/ML Engineer",
                "label": "AI / ML Engineer",
                "description": "Model development, RAG pipelines, embeddings, training infrastructure",
            },
            {
                "value": "Backend Engineer",
                "label": "Backend Engineer",
                "description": "APIs, databases, system design, scalability, distributed systems",
            },
            {
                "value": "Data Scientist",
                "label": "Data Scientist",
                "description": "Statistical modeling, feature engineering, applied machine learning",
            },
            {
                "value": "Full Stack Engineer",
                "label": "Full Stack Engineer",
                "description": "End-to-end product engineering, APIs, frontend, deployment",
            },
        ]
    }


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
