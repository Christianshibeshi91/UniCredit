"""Export conversations and lessons as Markdown."""

import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.core import database as db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/session/{session_id}")
async def export_session(session_id: str):
    """Export a chat session as Markdown."""
    session = await db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = await db.get_messages(session_id)

    md = f"# {session['title']}\n\n"
    md += f"*Notebook: {session.get('notebook_id', 'N/A')}*  \n"
    md += f"*Date: {session['created_at'][:10]}*\n\n---\n\n"

    for msg in messages:
        if msg["role"] == "user":
            md += f"## You\n\n{msg['content']}\n\n"
        else:
            source = f" _{msg['source']}_" if msg.get("source") else ""
            md += f"## Assistant{source}\n\n{msg['content']}\n\n---\n\n"

    return Response(
        content=md,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{session["title"]}.md"'},
    )


class ExportLessonRequest(BaseModel):
    topic: str
    lesson_type: str
    content: str
    duration_minutes: int | None = None


@router.post("/lesson")
async def export_lesson(req: ExportLessonRequest):
    """Export a lesson as Markdown."""
    type_label = req.lesson_type.replace("_", " ").title()
    md = f"# {req.topic}\n\n"
    md += f"*Type: {type_label}*"
    if req.duration_minutes:
        md += f"  |  *Duration: {req.duration_minutes} minutes*"
    md += "\n\n---\n\n"
    md += req.content

    filename = f"{req.topic[:50]} - {type_label}.md".replace("/", "-").replace("\\", "-")
    return Response(
        content=md,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/quiz/{quiz_id}")
async def export_quiz(quiz_id: str):
    """Export a quiz as Markdown."""
    quiz = await db.get_quiz(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    md = f"# Quiz: {quiz['topic']}\n\n"
    md += f"*{len(quiz['questions'])} questions*  \n"
    md += f"*Created: {quiz['created_at'][:10]}*\n\n---\n\n"

    for i, q in enumerate(quiz["questions"], 1):
        md += f"### Question {i}\n\n{q['question']}\n\n"
        for j, opt in enumerate(q["options"]):
            letter = chr(65 + j)
            md += f"- **{letter}.** {opt}\n"
        md += f"\n**Answer:** {chr(65 + q['correct'])}. {q['options'][q['correct']]}\n\n"
        if q.get("explanation"):
            md += f"*{q['explanation']}*\n\n"
        md += "---\n\n"

    return Response(
        content=md,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="Quiz - {quiz["topic"][:50]}.md"'},
    )
