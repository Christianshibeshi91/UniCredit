from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlmodel import select, func, col
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_auth
from app.core.database import get_session
from app.models.job import Job

router = APIRouter(prefix="/api/analytics", tags=["analytics"], dependencies=[Depends(require_auth)])


@router.get("/summary")
async def summary(session: AsyncSession = Depends(get_session)):
    all_jobs = (await session.execute(select(Job))).scalars().all()
    today = datetime.now().strftime("%m/%d")

    today_jobs = [j for j in all_jobs if today in (j.date_logged or "")]
    applied = [j for j in all_jobs if (j.applied or "").lower() in ("yes", "true", "applied")]
    scores = [j.score for j in all_jobs if j.score > 0]
    follow_ups_due = [
        j for j in all_jobs
        if j.follow_up_status == "" and j.applied and j.date_logged
    ]

    return {
        "total_jobs": len(all_jobs),
        "today_found": len(today_jobs),
        "total_applied": len(applied),
        "avg_score": round(sum(scores) / max(len(scores), 1)),
        "follow_ups_due": len(follow_ups_due),
    }


@router.get("/trends")
async def trends(session: AsyncSession = Depends(get_session)):
    all_jobs = (await session.execute(select(Job))).scalars().all()
    # Group by date
    by_date: dict[str, int] = {}
    for j in all_jobs:
        date_str = (j.date_logged or "")[:8]  # MM/DD/YY
        if date_str:
            by_date[date_str] = by_date.get(date_str, 0) + 1

    # Sort and return last 30 entries
    sorted_dates = sorted(by_date.items())[-30:]
    return [{"date": d, "count": c} for d, c in sorted_dates]


@router.get("/platforms")
async def platforms(session: AsyncSession = Depends(get_session)):
    all_jobs = (await session.execute(select(Job))).scalars().all()
    by_type: dict[str, int] = {}
    for j in all_jobs:
        t = j.app_type or "Unknown"
        by_type[t] = by_type.get(t, 0) + 1
    return [{"platform": k, "count": v} for k, v in sorted(by_type.items(), key=lambda x: -x[1])]


@router.get("/scores")
async def score_distribution(session: AsyncSession = Depends(get_session)):
    all_jobs = (await session.execute(select(Job))).scalars().all()
    buckets = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    for j in all_jobs:
        s = j.score
        if s <= 20: buckets["0-20"] += 1
        elif s <= 40: buckets["21-40"] += 1
        elif s <= 60: buckets["41-60"] += 1
        elif s <= 80: buckets["61-80"] += 1
        else: buckets["81-100"] += 1
    return [{"range": k, "count": v} for k, v in buckets.items()]
