from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, col
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_auth
from app.core.database import get_session
from app.models.job import Job

router = APIRouter(prefix="/api/follow-ups", tags=["follow-ups"], dependencies=[Depends(require_auth)])


@router.get("")
async def list_follow_ups(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Job).where(
            col(Job.applied).ilike("%yes%") | col(Job.applied).ilike("%true%"),
            Job.follow_up_status == "",
        )
    )
    jobs = result.scalars().all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "company": j.company,
            "date_logged": j.date_logged,
            "app_status": j.app_status,
            "follow_up_date": j.follow_up_date,
        }
        for j in jobs
    ]


@router.post("/{job_id}/complete")
async def mark_complete(job_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.follow_up_status = "Followed Up"
    session.add(job)
    await session.commit()
    return {"status": "ok"}
