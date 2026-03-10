from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_auth
from app.core.database import get_session
from app.models.settings import ErrorLog

router = APIRouter(prefix="/api/errors", tags=["errors"], dependencies=[Depends(require_auth)])


@router.get("")
async def list_errors(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ErrorLog).order_by(ErrorLog.id.desc()))
    return result.scalars().all()


@router.post("/{error_id}/retry")
async def retry_error(error_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ErrorLog).where(ErrorLog.id == error_id))
    error = result.scalar_one_or_none()
    if not error:
        raise HTTPException(status_code=404, detail="Error not found")

    error.retried = True
    session.add(error)
    await session.commit()

    # Trigger automation for this specific job
    from app.services.automation_controller import start_automation
    import asyncio
    asyncio.create_task(start_automation(max_jobs=1))

    return {"status": "ok", "message": "Retry triggered"}
