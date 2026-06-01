from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .content import build_practice, load_catalog
from .models import AttemptIn, AttemptOut, ContentCatalog, PracticeQuestion, ProgressSummary
from .progress import init_db, record_attempt, summarize_progress

ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIST = ROOT / "frontend" / "dist"


@asynccontextmanager
async def lifespan(_: FastAPI):
    load_catalog()
    init_db()
    yield


app = FastAPI(title="Digital Sensei", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/content", response_model=ContentCatalog)
def content() -> ContentCatalog:
    return load_catalog()


@app.get("/api/practice/today", response_model=list[PracticeQuestion])
def practice_today(
    mode: str = Query(default="treinar_agora", pattern="^(treinar_agora|palavras|numeros|tipos|review)$"),
    limit: int = Query(default=8, ge=1, le=20),
) -> list[PracticeQuestion]:
    if mode == "review":
        progress = summarize_progress()
        weak_ids = [topic.item_id for topic in progress.weak_topics]
        questions = [question for question in build_practice("treinar_agora", 20) if question.item_id in weak_ids]
        return questions[:limit] or build_practice("treinar_agora", limit)
    return build_practice(mode, limit)


@app.post("/api/attempts", response_model=AttemptOut, status_code=201)
def attempts(attempt: AttemptIn) -> AttemptOut:
    catalog = load_catalog()
    if attempt.item_id not in {item.id for item in catalog.items}:
        raise HTTPException(status_code=404, detail="Unknown content item")
    return record_attempt(attempt)


@app.get("/api/progress", response_model=ProgressSummary)
def progress() -> ProgressSummary:
    return summarize_progress()


if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str) -> FileResponse:
        target = FRONTEND_DIST / path
        if target.is_file():
            return FileResponse(target)
        return FileResponse(FRONTEND_DIST / "index.html")
