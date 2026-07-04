import sys
sys.modules["google._upb._message"] = None

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db
from routers import sessions, resume, interview

app = FastAPI(
    title="Candidate Screening API",
    description="AI-powered role-based candidate screening system with RAG-grounded interview questions",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    init_db()


app.include_router(sessions.router)
app.include_router(resume.router)
app.include_router(interview.router)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "version": "1.0.0"}
