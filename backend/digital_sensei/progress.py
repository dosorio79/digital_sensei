from __future__ import annotations

import os
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from .content import get_item
from .models import AttemptIn, AttemptOut, ProgressSummary, WeakTopic

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = ROOT / "data" / "digital_sensei.sqlite3"


def db_path() -> Path:
    configured = os.environ.get("DIGITAL_SENSEI_DB")
    return Path(configured) if configured else DEFAULT_DB_PATH


def connect() -> sqlite3.Connection:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                selected_answer TEXT NOT NULL,
                correct INTEGER NOT NULL,
                mode TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_attempts_item
            ON attempts (item_id)
            """
        )


def record_attempt(attempt: AttemptIn) -> AttemptOut:
    init_db()
    created_at = datetime.now(UTC).replace(microsecond=0)
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO attempts (question_id, item_id, selected_answer, correct, mode, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                attempt.question_id,
                attempt.item_id,
                attempt.selected_answer,
                int(attempt.correct),
                attempt.mode,
                created_at.isoformat(),
            ),
        )
        attempt_id = int(cursor.lastrowid)

    return AttemptOut(
        id=attempt_id,
        question_id=attempt.question_id,
        item_id=attempt.item_id,
        selected_answer=attempt.selected_answer,
        correct=attempt.correct,
        mode=attempt.mode,
        created_at=created_at,
    )


def summarize_progress() -> ProgressSummary:
    init_db()
    with connect() as conn:
        row = conn.execute(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END) AS correct_count,
                SUM(CASE WHEN correct = 0 THEN 1 ELSE 0 END) AS incorrect_count,
                COUNT(DISTINCT date(created_at)) AS sessions
            FROM attempts
            """
        ).fetchone()
        topic_rows = conn.execute(
            """
            SELECT
                item_id,
                SUM(CASE WHEN correct = 0 THEN 1 ELSE 0 END) AS incorrect_count,
                SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END) AS correct_count
            FROM attempts
            GROUP BY item_id
            HAVING incorrect_count > 0
            ORDER BY incorrect_count DESC, correct_count ASC
            LIMIT 5
            """
        ).fetchall()

    total = int(row["total"] or 0)
    correct = int(row["correct_count"] or 0)
    incorrect = int(row["incorrect_count"] or 0)
    weak_topics: list[WeakTopic] = []
    for topic in topic_rows:
        item = get_item(topic["item_id"])
        if not item:
            continue
        weak_topics.append(
            WeakTopic(
                item_id=item.id,
                japanese=item.japanese,
                portuguese=item.portuguese,
                category=item.category,
                incorrect=int(topic["incorrect_count"] or 0),
                correct=int(topic["correct_count"] or 0),
            )
        )

    return ProgressSummary(
        total_attempts=total,
        correct_attempts=correct,
        incorrect_attempts=incorrect,
        accuracy=round(correct / total, 2) if total else 0.0,
        completed_sessions=int(row["sessions"] or 0),
        weak_topics=weak_topics,
    )
