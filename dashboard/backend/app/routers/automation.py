from fastapi import APIRouter, Depends

from app.core.auth import require_auth
from app.services.automation_controller import (
    get_status,
    start_automation,
    stop_automation,
    start_scheduler,
    stop_scheduler,
)
import asyncio

router = APIRouter(prefix="/api/automation", tags=["automation"], dependencies=[Depends(require_auth)])


@router.get("/status")
async def status():
    return {"status": get_status()}


@router.post("/start")
async def start(body: dict | None = None):
    max_jobs = 3
    if body and "max_jobs" in body:
        max_jobs = int(body["max_jobs"])
    asyncio.create_task(start_automation(max_jobs=max_jobs))
    return {"status": "ok", "message": "Automation started"}


@router.post("/stop")
async def stop():
    await stop_automation()
    return {"status": "ok", "message": "Automation stopped"}


@router.post("/scheduler/start")
async def sched_start():
    await start_scheduler()
    return {"status": "ok", "message": "Scheduler started"}


@router.post("/scheduler/stop")
async def sched_stop():
    await stop_scheduler()
    return {"status": "ok", "message": "Scheduler stopped"}
