"""SQLite database for Tech Tutor persistence."""

import aiosqlite
import json
import logging
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "tech_tutor.db"

_db: aiosqlite.Connection | None = None


async def init_db() -> None:
    """Initialize database and create tables."""
    global _db
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    _db = await aiosqlite.connect(str(DB_PATH))
    _db.row_factory = aiosqlite.Row

    await _db.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT 'New Chat',
            notebook_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            source TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS quizzes (
            id TEXT PRIMARY KEY,
            topic TEXT NOT NULL,
            notebook_id TEXT,
            questions TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id TEXT PRIMARY KEY,
            quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            answers TEXT NOT NULL,
            score INTEGER NOT NULL,
            total INTEGER NOT NULL,
            completed_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS study_sessions (
            id TEXT PRIMARY KEY,
            topic TEXT NOT NULL,
            activity_type TEXT NOT NULL,
            notebook_id TEXT,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            duration_seconds INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS review_cards (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            topic TEXT NOT NULL,
            ease_factor REAL NOT NULL DEFAULT 2.5,
            interval_days INTEGER NOT NULL DEFAULT 1,
            repetitions INTEGER NOT NULL DEFAULT 0,
            next_review TEXT NOT NULL,
            last_reviewed TEXT,
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
        CREATE INDEX IF NOT EXISTS idx_review_next ON review_cards(next_review);
        CREATE INDEX IF NOT EXISTS idx_study_started ON study_sessions(started_at);
    """)
    await _db.commit()
    logger.info(f"Database initialized at {DB_PATH}")


async def close_db() -> None:
    global _db
    if _db:
        await _db.close()
        _db = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_dict(row: aiosqlite.Row) -> dict:
    return dict(row)


# ── Sessions ──────────────────────────────────────────────────────────

async def create_session(session_id: str, title: str = "New Chat", notebook_id: str | None = None) -> dict:
    now = _now()
    await _db.execute(
        "INSERT INTO sessions (id, title, notebook_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (session_id, title, notebook_id, now, now),
    )
    await _db.commit()
    return {"id": session_id, "title": title, "notebook_id": notebook_id, "created_at": now, "updated_at": now}


async def list_sessions(limit: int = 50) -> list[dict]:
    cursor = await _db.execute(
        "SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?", (limit,)
    )
    rows = await cursor.fetchall()
    return [_row_to_dict(r) for r in rows]


async def get_session(session_id: str) -> dict | None:
    cursor = await _db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    row = await cursor.fetchone()
    return _row_to_dict(row) if row else None


async def update_session(session_id: str, **fields) -> None:
    fields["updated_at"] = _now()
    sets = ", ".join(f"{k} = ?" for k in fields)
    vals = list(fields.values()) + [session_id]
    await _db.execute(f"UPDATE sessions SET {sets} WHERE id = ?", vals)
    await _db.commit()


async def delete_session(session_id: str) -> None:
    await _db.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    await _db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    await _db.commit()


# ── Messages ──────────────────────────────────────────────────────────

async def add_message(msg_id: str, session_id: str, role: str, content: str, source: str | None = None) -> dict:
    now = _now()
    await _db.execute(
        "INSERT INTO messages (id, session_id, role, content, source, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (msg_id, session_id, role, content, source, now),
    )
    await _db.execute("UPDATE sessions SET updated_at = ? WHERE id = ?", (now, session_id))
    await _db.commit()
    return {"id": msg_id, "session_id": session_id, "role": role, "content": content, "source": source, "created_at": now}


async def get_messages(session_id: str) -> list[dict]:
    cursor = await _db.execute(
        "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC", (session_id,)
    )
    rows = await cursor.fetchall()
    return [_row_to_dict(r) for r in rows]


# ── Quizzes ───────────────────────────────────────────────────────────

async def save_quiz(quiz_id: str, topic: str, questions: list[dict], notebook_id: str | None = None) -> dict:
    now = _now()
    await _db.execute(
        "INSERT INTO quizzes (id, topic, notebook_id, questions, created_at) VALUES (?, ?, ?, ?, ?)",
        (quiz_id, topic, notebook_id, json.dumps(questions), now),
    )
    await _db.commit()
    return {"id": quiz_id, "topic": topic, "questions": questions, "created_at": now}


async def get_quiz(quiz_id: str) -> dict | None:
    cursor = await _db.execute("SELECT * FROM quizzes WHERE id = ?", (quiz_id,))
    row = await cursor.fetchone()
    if not row:
        return None
    d = _row_to_dict(row)
    d["questions"] = json.loads(d["questions"])
    return d


async def list_quizzes(limit: int = 20) -> list[dict]:
    cursor = await _db.execute("SELECT id, topic, notebook_id, created_at FROM quizzes ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = await cursor.fetchall()
    return [_row_to_dict(r) for r in rows]


async def save_quiz_attempt(attempt_id: str, quiz_id: str, answers: list[int], score: int, total: int) -> dict:
    now = _now()
    await _db.execute(
        "INSERT INTO quiz_attempts (id, quiz_id, answers, score, total, completed_at) VALUES (?, ?, ?, ?, ?, ?)",
        (attempt_id, quiz_id, json.dumps(answers), score, total, now),
    )
    await _db.commit()
    return {"id": attempt_id, "quiz_id": quiz_id, "score": score, "total": total, "completed_at": now}


async def get_quiz_attempts(quiz_id: str) -> list[dict]:
    cursor = await _db.execute(
        "SELECT * FROM quiz_attempts WHERE quiz_id = ? ORDER BY completed_at DESC", (quiz_id,)
    )
    rows = await cursor.fetchall()
    result = []
    for r in rows:
        d = _row_to_dict(r)
        d["answers"] = json.loads(d["answers"])
        result.append(d)
    return result


# ── Study Sessions ────────────────────────────────────────────────────

async def start_study_session(sid: str, topic: str, activity_type: str, notebook_id: str | None = None) -> dict:
    now = _now()
    await _db.execute(
        "INSERT INTO study_sessions (id, topic, activity_type, notebook_id, started_at) VALUES (?, ?, ?, ?, ?)",
        (sid, topic, activity_type, notebook_id, now),
    )
    await _db.commit()
    return {"id": sid, "topic": topic, "activity_type": activity_type, "started_at": now}


async def end_study_session(sid: str) -> dict | None:
    now = _now()
    cursor = await _db.execute("SELECT * FROM study_sessions WHERE id = ?", (sid,))
    row = await cursor.fetchone()
    if not row:
        return None
    d = _row_to_dict(row)
    started = datetime.fromisoformat(d["started_at"])
    ended = datetime.fromisoformat(now)
    duration = int((ended - started).total_seconds())
    await _db.execute(
        "UPDATE study_sessions SET ended_at = ?, duration_seconds = ? WHERE id = ?",
        (now, duration, sid),
    )
    await _db.commit()
    d["ended_at"] = now
    d["duration_seconds"] = duration
    return d


async def get_study_stats(days: int = 30) -> dict:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    cursor = await _db.execute(
        "SELECT * FROM study_sessions WHERE started_at >= ? ORDER BY started_at DESC", (cutoff,)
    )
    rows = await cursor.fetchall()
    sessions = [_row_to_dict(r) for r in rows]

    total_time = sum(s.get("duration_seconds") or 0 for s in sessions)
    topics: dict[str, int] = {}
    activities: dict[str, int] = {}
    daily: dict[str, int] = {}

    for s in sessions:
        dur = s.get("duration_seconds") or 0
        topics[s["topic"]] = topics.get(s["topic"], 0) + dur
        activities[s["activity_type"]] = activities.get(s["activity_type"], 0) + dur
        day = s["started_at"][:10]
        daily[day] = daily.get(day, 0) + dur

    return {
        "total_sessions": len(sessions),
        "total_time_seconds": total_time,
        "topics": topics,
        "activities": activities,
        "daily": daily,
        "sessions": sessions[-20:],
    }


# ── Spaced Repetition (SM-2) ─────────────────────────────────────────

async def create_review_card(card_id: str, question: str, answer: str, topic: str) -> dict:
    now = _now()
    await _db.execute(
        "INSERT INTO review_cards (id, question, answer, topic, next_review, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (card_id, question, answer, topic, now, now),
    )
    await _db.commit()
    return {"id": card_id, "question": question, "answer": answer, "topic": topic, "next_review": now, "created_at": now}


async def get_due_cards(limit: int = 20) -> list[dict]:
    now = _now()
    cursor = await _db.execute(
        "SELECT * FROM review_cards WHERE next_review <= ? ORDER BY next_review ASC LIMIT ?",
        (now, limit),
    )
    rows = await cursor.fetchall()
    return [_row_to_dict(r) for r in rows]


async def get_all_cards(topic: str | None = None) -> list[dict]:
    if topic:
        cursor = await _db.execute("SELECT * FROM review_cards WHERE topic = ? ORDER BY created_at DESC", (topic,))
    else:
        cursor = await _db.execute("SELECT * FROM review_cards ORDER BY created_at DESC")
    rows = await cursor.fetchall()
    return [_row_to_dict(r) for r in rows]


async def review_card(card_id: str, quality: int) -> dict:
    """Apply SM-2 algorithm. quality: 0-5 (0=blackout, 5=perfect)."""
    cursor = await _db.execute("SELECT * FROM review_cards WHERE id = ?", (card_id,))
    row = await cursor.fetchone()
    if not row:
        raise ValueError(f"Card not found: {card_id}")

    card = _row_to_dict(row)
    ef = card["ease_factor"]
    reps = card["repetitions"]
    interval = card["interval_days"]

    # SM-2 algorithm
    if quality >= 3:
        if reps == 0:
            interval = 1
        elif reps == 1:
            interval = 6
        else:
            interval = math.ceil(interval * ef)
        reps += 1
    else:
        reps = 0
        interval = 1

    ef = max(1.3, ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
    now = datetime.now(timezone.utc)
    next_review = (now + timedelta(days=interval)).isoformat()

    await _db.execute(
        "UPDATE review_cards SET ease_factor = ?, interval_days = ?, repetitions = ?, next_review = ?, last_reviewed = ? WHERE id = ?",
        (ef, interval, reps, next_review, now.isoformat(), card_id),
    )
    await _db.commit()

    return {"id": card_id, "ease_factor": ef, "interval_days": interval, "repetitions": reps, "next_review": next_review}


async def delete_card(card_id: str) -> None:
    await _db.execute("DELETE FROM review_cards WHERE id = ?", (card_id,))
    await _db.commit()


async def get_review_stats() -> dict:
    now = _now()
    cursor = await _db.execute("SELECT COUNT(*) as total FROM review_cards")
    total = (await cursor.fetchone())["total"]
    cursor = await _db.execute("SELECT COUNT(*) as due FROM review_cards WHERE next_review <= ?", (now,))
    due = (await cursor.fetchone())["due"]
    cursor = await _db.execute("SELECT topic, COUNT(*) as count FROM review_cards GROUP BY topic")
    topics = {r["topic"]: r["count"] for r in await cursor.fetchall()}
    return {"total_cards": total, "due_cards": due, "topics": topics}
