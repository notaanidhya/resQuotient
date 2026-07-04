import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DBSession

from config import settings
from database import get_db, Session, Question
from models.schemas import QuestionResponse, AnswerSubmit, AnswerResponse, SessionSummary, QAPair
from services.session_manager import session_manager
from services.rag_pipeline import rag_pipeline
from services.question_generator import question_generator

router = APIRouter(prefix="/api/interview", tags=["interview"])


def _build_question_response(question: Question, total: int) -> QuestionResponse:
    return QuestionResponse(
        id=question.id,
        text=question.text,
        sequence_number=question.sequence_number,
        total_questions=total,
        is_last=question.sequence_number >= total,
    )


def _generate_next_question(db: DBSession, session: Session, question_number: int) -> Question:
    history = session_manager.get_qa_history(db, session.id)
    retrieval_query = rag_pipeline.build_retrieval_query(
        session.role,
        session.resume_profile or {},
        history,
    )
    chunks = rag_pipeline.retrieve(session.role, retrieval_query)

    question_text = question_generator.generate_question(
        role=session.role,
        resume_profile=session.resume_profile or {},
        retrieved_chunks=chunks,
        question_history=history,
        question_number=question_number,
        total_questions=settings.MAX_QUESTIONS_PER_SESSION,
    )

    source_info = [
        {"text": c["text"][:300], "metadata": c.get("metadata", {})}
        for c in chunks[:3]
    ]
    return session_manager.add_question(db, session.id, question_text, source_info)


@router.post("/{session_id}/start", response_model=QuestionResponse)
def start_interview(session_id: str, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "pending":
        raise HTTPException(status_code=400, detail="Upload a resume before starting the interview")
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="This interview session is already completed")

    unanswered = session_manager.get_unanswered_question(db, session_id)
    if unanswered:
        return _build_question_response(unanswered, settings.MAX_QUESTIONS_PER_SESSION)

    count = session_manager.get_question_count(db, session_id)
    if count >= settings.MAX_QUESTIONS_PER_SESSION:
        raise HTTPException(status_code=400, detail="All questions answered. Retrieve the session summary.")

    question = _generate_next_question(db, session, count + 1)
    return _build_question_response(question, settings.MAX_QUESTIONS_PER_SESSION)


@router.post("/{session_id}/answer/{question_id}", response_model=AnswerResponse)
def submit_answer(
    session_id: str,
    question_id: str,
    data: AnswerSubmit,
    db: DBSession = Depends(get_db),
):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Session already completed")

    question = (
        db.query(Question)
        .filter(Question.id == question_id, Question.session_id == session_id)
        .first()
    )
    if not question:
        raise HTTPException(status_code=404, detail="Question not found in this session")
    if question.answer:
        raise HTTPException(status_code=400, detail="This question has already been answered")

    if not data.answer_text.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty")

    session_manager.add_answer(db, question_id, session_id, data.answer_text.strip())

    answered_count = session_manager.get_question_count(db, session_id)

    if answered_count >= settings.MAX_QUESTIONS_PER_SESSION:
        session_manager.complete_session(db, session_id)
        return AnswerResponse(status="completed", session_id=session_id)

    next_question = _generate_next_question(db, session, answered_count + 1)
    return AnswerResponse(
        status="next_question",
        question=_build_question_response(next_question, settings.MAX_QUESTIONS_PER_SESSION),
        session_id=session_id,
    )


@router.get("/{session_id}/summary", response_model=SessionSummary)
def get_summary(session_id: str, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    history = session_manager.get_qa_history(db, session_id)
    answered = [h for h in history if h.get("answer")]

    if not answered:
        raise HTTPException(status_code=400, detail="No answers recorded for this session")

    insights_data = question_generator.generate_session_insights(
        role=session.role,
        resume_profile=session.resume_profile or {},
        qa_pairs=answered,
    )

    qa_pairs = [
        QAPair(
            question=pair["question"],
            answer=pair["answer"],
            sequence_number=i + 1,
        )
        for i, pair in enumerate(answered)
    ]

    return SessionSummary(
        session_id=session_id,
        role=session.role,
        candidate_name=session.candidate_name,
        qa_pairs=qa_pairs,
        insights=insights_data["insights"],
        overall_assessment=insights_data["overall_assessment"],
        topics_covered=insights_data["topics_covered"],
        created_at=session.created_at,
    )


def _sse_event(data: str, event: str = "chunk") -> str:
    return f"event: {event}\ndata: {data}\n\n"


@router.post("/{session_id}/stream-start")
def stream_start_interview(session_id: str, db: DBSession = Depends(get_db)):
    """Stream the first interview question token by token via SSE."""
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "pending":
        raise HTTPException(status_code=400, detail="Upload a resume before starting the interview")
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Session already completed")

    unanswered = session_manager.get_unanswered_question(db, session_id)
    if unanswered:
        # Already have a question — send it as a single chunk then done
        q = unanswered
        def _already_existing():
            yield _sse_event(q.text)
            meta = json.dumps({
                "id": q.id,
                "sequence_number": q.sequence_number,
                "total_questions": settings.MAX_QUESTIONS_PER_SESSION,
                "is_last": q.sequence_number >= settings.MAX_QUESTIONS_PER_SESSION,
            })
            yield _sse_event(meta, event="done")
        return StreamingResponse(_already_existing(), media_type="text/event-stream")

    count = session_manager.get_question_count(db, session_id)
    history = session_manager.get_qa_history(db, session_id)
    retrieval_query = rag_pipeline.build_retrieval_query(session.role, session.resume_profile or {}, history)
    chunks = rag_pipeline.retrieve(session.role, retrieval_query)
    question_number = count + 1

    full_text = []

    def _generate():
        for chunk in question_generator.generate_question_stream(
            role=session.role,
            resume_profile=session.resume_profile or {},
            retrieved_chunks=chunks,
            question_history=history,
            question_number=question_number,
            total_questions=settings.MAX_QUESTIONS_PER_SESSION,
        ):
            full_text.append(chunk)
            yield _sse_event(chunk)

        # Save the fully assembled question
        complete_text = "".join(full_text).strip()
        source_info = [{"text": c["text"][:300], "metadata": c.get("metadata", {})} for c in chunks[:3]]
        saved_q = session_manager.add_question(db, session_id, complete_text, source_info)
        meta = json.dumps({
            "id": saved_q.id,
            "sequence_number": saved_q.sequence_number,
            "total_questions": settings.MAX_QUESTIONS_PER_SESSION,
            "is_last": saved_q.sequence_number >= settings.MAX_QUESTIONS_PER_SESSION,
        })
        yield _sse_event(meta, event="done")

    return StreamingResponse(_generate(), media_type="text/event-stream")


@router.post("/{session_id}/stream-answer/{question_id}")
def stream_submit_answer(
    session_id: str,
    question_id: str,
    data: AnswerSubmit,
    db: DBSession = Depends(get_db),
):
    """Save an answer then stream the next question token by token via SSE."""
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Session already completed")

    question = (
        db.query(Question)
        .filter(Question.id == question_id, Question.session_id == session_id)
        .first()
    )
    if not question:
        raise HTTPException(status_code=404, detail="Question not found in this session")
    if question.answer:
        raise HTTPException(status_code=400, detail="This question has already been answered")
    if not data.answer_text.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty")

    session_manager.add_answer(db, question_id, session_id, data.answer_text.strip())
    answered_count = session_manager.get_question_count(db, session_id)

    if answered_count >= settings.MAX_QUESTIONS_PER_SESSION:
        session_manager.complete_session(db, session_id)

        def _completed():
            yield _sse_event(json.dumps({"status": "completed"}), event="done")

        return StreamingResponse(_completed(), media_type="text/event-stream")

    history = session_manager.get_qa_history(db, session_id)
    retrieval_query = rag_pipeline.build_retrieval_query(session.role, session.resume_profile or {}, history)
    chunks = rag_pipeline.retrieve(session.role, retrieval_query)
    question_number = answered_count + 1
    full_text = []

    def _generate():
        for chunk in question_generator.generate_question_stream(
            role=session.role,
            resume_profile=session.resume_profile or {},
            retrieved_chunks=chunks,
            question_history=history,
            question_number=question_number,
            total_questions=settings.MAX_QUESTIONS_PER_SESSION,
        ):
            full_text.append(chunk)
            yield _sse_event(chunk)

        complete_text = "".join(full_text).strip()
        source_info = [{"text": c["text"][:300], "metadata": c.get("metadata", {})} for c in chunks[:3]]
        saved_q = session_manager.add_question(db, session_id, complete_text, source_info)
        meta = json.dumps({
            "id": saved_q.id,
            "sequence_number": saved_q.sequence_number,
            "total_questions": settings.MAX_QUESTIONS_PER_SESSION,
            "is_last": saved_q.sequence_number >= settings.MAX_QUESTIONS_PER_SESSION,
            "status": "next_question",
        })
        yield _sse_event(meta, event="done")

    return StreamingResponse(_generate(), media_type="text/event-stream")
