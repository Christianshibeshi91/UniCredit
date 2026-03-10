from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_auth
from app.core.database import get_session
from app.models.settings import Setting

router = APIRouter(prefix="/api/settings", tags=["settings"], dependencies=[Depends(require_auth)])


@router.get("")
async def get_settings(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Setting))
    settings = result.scalars().all()
    return {s.key: s.value for s in settings}


@router.put("")
async def update_settings(body: dict, session: AsyncSession = Depends(get_session)):
    for key, value in body.items():
        result = await session.execute(select(Setting).where(Setting.key == key))
        setting = result.scalar_one_or_none()
        if setting:
            setting.value = str(value)
        else:
            setting = Setting(key=key, value=str(value))
        session.add(setting)
    await session.commit()
    return {"status": "ok"}


@router.get("/blocked-companies")
async def get_blocked(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Setting).where(Setting.key == "blocked_companies"))
    s = result.scalar_one_or_none()
    companies = s.value.split(",") if s and s.value else []
    return [c.strip() for c in companies if c.strip()]


@router.post("/blocked-companies")
async def add_blocked(body: dict, session: AsyncSession = Depends(get_session)):
    company = body.get("company", "").strip()
    if not company:
        return {"status": "error", "detail": "Company name required"}
    result = await session.execute(select(Setting).where(Setting.key == "blocked_companies"))
    s = result.scalar_one_or_none()
    current = s.value.split(",") if s and s.value else []
    current = [c.strip() for c in current if c.strip()]
    if company not in current:
        current.append(company)
    if s:
        s.value = ",".join(current)
    else:
        s = Setting(key="blocked_companies", value=",".join(current))
    session.add(s)
    await session.commit()
    return current


@router.delete("/blocked-companies/{company}")
async def remove_blocked(company: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Setting).where(Setting.key == "blocked_companies"))
    s = result.scalar_one_or_none()
    if s:
        current = [c.strip() for c in s.value.split(",") if c.strip() and c.strip() != company]
        s.value = ",".join(current)
        session.add(s)
        await session.commit()
    return {"status": "ok"}
