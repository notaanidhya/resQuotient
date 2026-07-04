from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session as DBSession

from database import get_db
from models.schemas import ResumeUploadResponse, ResumeProfile
from services.resume_parser import parse_resume
from services.session_manager import session_manager

router = APIRouter(prefix="/api/resume", tags=["resume"])

ALLOWED_EXTENSIONS = {".pdf", ".txt"}
MAX_FILE_SIZE = 5 * 1024 * 1024


@router.post("/upload/{session_id}", response_model=ResumeUploadResponse)
async def upload_resume(
    session_id: str,
    file: UploadFile = File(...),
    db: DBSession = Depends(get_db),
):
    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and plain text (.txt) files are accepted",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size must be under 5 MB")

    try:
        parsed = parse_resume(content, filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=422, detail="Failed to parse resume. Ensure the file is readable.")

    profile_data = {
        "skills": parsed["skills"],
        "domain_exposure": parsed["domain_exposure"],
        "experience_level": parsed["experience_level"],
    }

    try:
        session_manager.update_resume(db, session_id, parsed["raw_text"], profile_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return ResumeUploadResponse(
        session_id=session_id,
        profile=ResumeProfile(**profile_data),
        message="Resume parsed and attached to session",
    )
