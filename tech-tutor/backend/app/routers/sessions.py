"""Chat session persistence — CRUD for sessions and messages."""

import uuid
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core import database as db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class CreateSessionRequest(BaseModel):
    title: str = "New Chat"
    notebook_id: str | None = None


class UpdateSessionRequest(BaseModel):
    title: str | None = None
    notebook_id: str | None = None


class AddMessageRequest(BaseModel):
    id: str | None = None
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1)
    source: str | None = None


@router.get("")
async def list_sessions(limit: int = 50):
    return {"sessions": await db.list_sessions(limit)}


@router.post("")
async def create_session(req: CreateSessionRequest):
    sid = uuid.uuid4().hex[:12]
    session = await db.create_session(sid, req.title, req.notebook_id)
    return session


@router.get("/{session_id}")
async def get_session(session_id: str):
    session = await db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = await db.get_messages(session_id)
    return {**session, "messages": messages}


@router.patch("/{session_id}")
async def update_session(session_id: str, req: UpdateSessionRequest):
    session = await db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    fields = {k: v for k, v in req.model_dump().items() if v is not None}
    if fields:
        await db.update_session(session_id, **fields)
    return {"ok": True}


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    await db.delete_session(session_id)
    return {"ok": True}


@router.post("/{session_id}/messages")
async def add_message(session_id: str, req: AddMessageRequest):
    session = await db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    msg_id = req.id or uuid.uuid4().hex[:12]
    msg = await db.add_message(msg_id, session_id, req.role, req.content, req.source)
    return msg
