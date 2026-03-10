from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, func, col
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_auth
from app.core.database import get_session
from app.models.job import Job, JobResponse, JobDetailResponse, JobListResponse
from app.services.sheets_sync import trigger_sync, get_sync_status

router = APIRouter(prefix="/api/jobs", tags=["jobs"], dependencies=[Depends(require_auth)])


@router.get("", response_model=JobListResponse)
async def list_jobs(
    status: str | None = None,
    search: str | None = None,
    sort_by: str = Query("date_logged", pattern="^(score|date_logged|company|grade|title)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
):
    query = select(Job)

    if status:
        query = query.where(func.lower(Job.app_status) == status.lower())
    if search:
        term = f"%{search}%"
        query = query.where(
            col(Job.title).ilike(term)
            | col(Job.company).ilike(term)
            | col(Job.location).ilike(term)
        )

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_q)
    total = total_result.scalar() or 0

    # Sort
    sort_col = getattr(Job, sort_by, Job.date_logged)
    if sort_dir == "desc":
        query = query.order_by(col(sort_col).desc())
    else:
        query = query.order_by(col(sort_col).asc())

    # Paginate
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await session.execute(query)
    jobs = result.scalars().all()

    return JobListResponse(
        jobs=[JobResponse.model_validate(j) for j in jobs],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/sync-status")
async def sync_status():
    return get_sync_status()


@router.post("/sync")
async def manual_sync():
    await trigger_sync()
    return get_sync_status()


@router.get("/{job_id}", response_model=JobDetailResponse)
async def get_job(job_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobDetailResponse.model_validate(job)
