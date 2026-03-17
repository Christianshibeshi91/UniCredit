"""Study session tracking and spaced repetition."""

import uuid
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core import database as db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/study", tags=["study"])


# ── Study Sessions ────────────────────────────────────────────────────

class StartStudyRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    activity_type: str = Field(default="ask", pattern="^(ask|lesson|quiz|review|upload)$")
    notebook_id: str | None = None


@router.post("/start")
async def start_study(req: StartStudyRequest):
    sid = uuid.uuid4().hex[:12]
    return await db.start_study_session(sid, req.topic, req.activity_type, req.notebook_id)


@router.post("/end/{session_id}")
async def end_study(session_id: str):
    result = await db.end_study_session(session_id)
    if not result:
        raise HTTPException(status_code=404, detail="Study session not found")
    return result


@router.get("/stats")
async def get_stats(days: int = 30):
    return await db.get_study_stats(days)


# ── Spaced Repetition ─────────────────────────────────────────────────

class CreateCardRequest(BaseModel):
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)
    topic: str = Field(..., min_length=1)


class ReviewCardRequest(BaseModel):
    card_id: str
    quality: int = Field(..., ge=0, le=5)


class BulkCreateCardsRequest(BaseModel):
    cards: list[CreateCardRequest]


@router.get("/cards")
async def get_cards(topic: str | None = None):
    cards = await db.get_all_cards(topic)
    return {"cards": cards}


@router.get("/cards/due")
async def get_due_cards(limit: int = 20):
    cards = await db.get_due_cards(limit)
    stats = await db.get_review_stats()
    return {"cards": cards, "stats": stats}


@router.post("/cards")
async def create_card(req: CreateCardRequest):
    card_id = uuid.uuid4().hex[:12]
    return await db.create_review_card(card_id, req.question, req.answer, req.topic)


@router.post("/cards/bulk")
async def bulk_create_cards(req: BulkCreateCardsRequest):
    results = []
    for card in req.cards:
        card_id = uuid.uuid4().hex[:12]
        result = await db.create_review_card(card_id, card.question, card.answer, card.topic)
        results.append(result)
    return {"cards": results, "count": len(results)}


@router.post("/cards/review")
async def review_card(req: ReviewCardRequest):
    try:
        return await db.review_card(req.card_id, req.quality)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/cards/{card_id}")
async def delete_card(card_id: str):
    await db.delete_card(card_id)
    return {"ok": True}


@router.get("/cards/stats")
async def get_review_stats():
    return await db.get_review_stats()
