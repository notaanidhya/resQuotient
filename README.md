# Nexus — AI-Powered Candidate Screening System

An intelligent, role-based technical interview system that generates contextual questions grounded in domain-specific knowledge using a RAG pipeline.

## Architecture Overview

```
┌──────────────┐     HTTP/REST     ┌──────────────────────────────────────┐
│   Next.js    │◄─────────────────►│          FastAPI Backend             │
│  (Frontend)  │                   │                                      │
│  Port: 3000  │                   │  ┌────────────┐  ┌────────────────┐  │
└──────────────┘                   │  │  Routers   │  │    Services    │  │
                                   │  │ /sessions  │  │ resume_parser  │  │
                                   │  │ /resume    │  │ rag_pipeline   │  │
                                   │  │ /interview │  │ question_gen   │  │
                                   │  └────────────┘  └────────────────┘  │
                                   │        │                 │            │
                                   │  ┌─────▼────────────────▼──────────┐ │
                                   │  │        SQLite Database           │ │
                                   │  │  sessions / questions / answers  │ │
                                   │  └─────────────────────────────────┘ │
                                   │                 │                     │
                                   │  ┌──────────────▼──────────────────┐ │
                                   │  │   ChromaDB (Vector Store)       │ │
                                   │  │  ai_ml / backend / data_science │ │
                                   │  └─────────────────────────────────┘ │
                                   └──────────────────────────────────────┘
```

## System Flow

1. **Candidate Entry** — User selects a role and uploads a resume (PDF or .txt)
2. **Resume Parsing** — Extracts skills, domain exposure, and experience level
3. **Session Creation** — A new interview session is stored in SQLite
4. **RAG Retrieval** — A query is built from the resume profile and sent to ChromaDB; top-5 semantically relevant chunks from the role-scoped knowledge base are retrieved
5. **Question Generation** — Gemini 1.5 Flash generates a contextual question grounded in the retrieved chunks, adapted to the candidate's background and interview progression
6. **Interactive Interview** — Candidate answers questions through the UI; each answer triggers retrieval and generation of the next question
7. **Session Storage** — All questions, answers, and source chunks are persisted in SQLite with full traceability
8. **Summary** — After all questions are answered, Gemini generates structured insights: analysis, overall assessment, and topics covered

## Key Design Decisions

### RAG Pipeline
- **Separate collections per role** — Retrieval stays scoped and relevant without cross-role noise
- **Sliding-window chunking** (400 tokens, 50 overlap) — Preserves context across paragraph boundaries
- **Dynamic query construction** — Queries are built from resume profile + recent interview history, so retrieval adapts as the interview progresses
- **all-MiniLM-L6-v2** — Compact, fast embedding model with strong semantic similarity performance; runs fully locally

### Question Adaptation
- Difficulty guidance is applied per experience level (junior / mid-level / senior)
- Progression prompts change the tone at early, middle, and final questions
- Previous Q&A history (last 3 exchanges) is injected into the generation prompt to prevent repetition and allow probing of weak areas

### Persistence & Traceability
- Each `questions` row stores `source_chunks` as JSON — you can trace exactly which KB passages informed each question
- Session status transitions: `pending → active → completed`

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Gemini API key (already configured in `backend/.env`)

### Backend

```bash
cd backend
pip install -r requirements.txt
python knowledge_base/ingest.py
uvicorn main:app --reload --port 8000
```

The first run of `ingest.py` downloads the `all-MiniLM-L6-v2` model (~90 MB) and populates ChromaDB. Subsequent runs skip already-ingested collections.

API docs available at: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Project Structure

```
.
├── backend/
│   ├── main.py                     # FastAPI app, CORS, startup
│   ├── config.py                   # Pydantic settings from .env
│   ├── database.py                 # SQLAlchemy models: Session, Question, Answer
│   ├── models/
│   │   └── schemas.py              # Pydantic request/response schemas
│   ├── routers/
│   │   ├── sessions.py             # POST /api/sessions/, GET /api/sessions/roles/list
│   │   ├── resume.py               # POST /api/resume/upload/{session_id}
│   │   └── interview.py            # POST /start, POST /answer, GET /summary
│   ├── services/
│   │   ├── resume_parser.py        # PDF/text extraction + profile building
│   │   ├── rag_pipeline.py         # ChromaDB client + retrieval
│   │   ├── question_generator.py   # Gemini API + prompt engineering
│   │   └── session_manager.py      # DB mutations for sessions/questions/answers
│   └── knowledge_base/
│       └── ingest.py               # One-time KB population script
└── frontend/
    ├── app/
    │   ├── page.tsx                # Landing: role select + resume upload
    │   ├── interview/[id]/page.tsx # Interview session UI
    │   └── results/[id]/page.tsx  # Summary: assessment + transcript
    ├── components/
    │   └── ResumeUpload.tsx        # Drag-and-drop file upload
    └── lib/
        └── api.ts                  # Typed fetch client
```

## Environment Variables

### Backend (`backend/.env`)
| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | — | Google Gemini API key |
| `DATABASE_URL` | `sqlite:///./screening.db` | SQLAlchemy connection string |
| `CHROMA_PERSIST_DIR` | `./chroma_db` | ChromaDB storage path |
| `MAX_QUESTIONS_PER_SESSION` | `8` | Questions per interview |

### Frontend (`frontend/.env.local`)
| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |
