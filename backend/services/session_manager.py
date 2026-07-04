from sqlalchemy.orm import Session as DBSession
from database import Session, Question, Answer
from typing import List, Dict, Optional
import uuid


class SessionManager:
    def create_session(
        self,
        db: DBSession,
        role: str,
        candidate_name: Optional[str] = None,
    ) -> Session:
        session = Session(
            id=str(uuid.uuid4()),
            role=role,
            candidate_name=candidate_name,
            resume_text="",
            status="pending",
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def update_resume(
        self,
        db: DBSession,
        session_id: str,
        resume_text: str,
        resume_profile: dict,
    ) -> Session:
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            raise ValueError(f"Session {session_id} not found")
        session.resume_text = resume_text
        session.resume_profile = resume_profile
        session.status = "active"
        db.commit()
        db.refresh(session)
        return session

    def add_question(
        self,
        db: DBSession,
        session_id: str,
        question_text: str,
        source_chunks: list,
    ) -> Question:
        count = db.query(Question).filter(Question.session_id == session_id).count()
        question = Question(
            id=str(uuid.uuid4()),
            session_id=session_id,
            text=question_text,
            source_chunks=source_chunks,
            sequence_number=count + 1,
        )
        db.add(question)
        db.commit()
        db.refresh(question)
        return question

    def add_answer(
        self,
        db: DBSession,
        question_id: str,
        session_id: str,
        answer_text: str,
    ) -> Answer:
        answer = Answer(
            id=str(uuid.uuid4()),
            question_id=question_id,
            session_id=session_id,
            text=answer_text,
        )
        db.add(answer)
        db.commit()
        db.refresh(answer)
        return answer

    def get_qa_history(self, db: DBSession, session_id: str) -> List[Dict]:
        questions = (
            db.query(Question)
            .filter(Question.session_id == session_id)
            .order_by(Question.sequence_number)
            .all()
        )
        history = []
        for q in questions:
            history.append({
                "question": q.text,
                "answer": q.answer.text if q.answer else "",
            })
        return history

    def get_unanswered_question(self, db: DBSession, session_id: str) -> Optional[Question]:
        questions = (
            db.query(Question)
            .filter(Question.session_id == session_id)
            .order_by(Question.sequence_number)
            .all()
        )
        for q in questions:
            if not q.answer:
                return q
        return None

    def complete_session(self, db: DBSession, session_id: str) -> None:
        session = db.query(Session).filter(Session.id == session_id).first()
        if session:
            session.status = "completed"
            db.commit()

    def get_question_count(self, db: DBSession, session_id: str) -> int:
        return db.query(Question).filter(Question.session_id == session_id).count()


session_manager = SessionManager()
