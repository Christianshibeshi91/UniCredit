"""Manages the automation pipeline as a subprocess."""
import asyncio
import logging
import sys
from datetime import datetime, timezone

from app.core.config import AUTOMATION_ENTRY, SCHEDULER_ENTRY, PROJECT_ROOT

logger = logging.getLogger(__name__)

_automation_proc: asyncio.subprocess.Process | None = None
_scheduler_proc: asyncio.subprocess.Process | None = None
_status = "idle"  # idle | running | stopped
_event_callback = None


def set_event_callback(cb):
    global _event_callback
    _event_callback = cb


def _emit(event_type: str, data: dict):
    if _event_callback:
        _event_callback(event_type, data)


async def _stream_output(proc: asyncio.subprocess.Process, label: str):
    """Stream subprocess stdout to event bus."""
    global _status
    if proc.stdout is None:
        return
    while True:
        line = await proc.stdout.readline()
        if not line:
            break
        text = line.decode("utf-8", errors="replace").strip()
        if text:
            _emit("automation_log", {
                "message": text,
                "source": label,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })


async def start_automation(max_jobs: int = 3):
    global _automation_proc, _status
    if _status == "running":
        raise RuntimeError("Automation already running")

    _status = "running"
    _emit("automation_status", {"status": "running"})

    try:
        _automation_proc = await asyncio.create_subprocess_exec(
            sys.executable, str(AUTOMATION_ENTRY), "--max-jobs", str(max_jobs),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=str(PROJECT_ROOT),
        )
        asyncio.create_task(_stream_output(_automation_proc, "automation"))
        await _automation_proc.wait()
    except Exception as e:
        logger.error(f"Automation failed: {e}")
        _emit("automation_error", {"error": str(e)})
    finally:
        _status = "idle"
        _automation_proc = None
        _emit("automation_status", {"status": "idle"})


async def stop_automation():
    global _automation_proc, _status
    if _automation_proc and _automation_proc.returncode is None:
        _automation_proc.terminate()
        try:
            await asyncio.wait_for(_automation_proc.wait(), timeout=5)
        except asyncio.TimeoutError:
            _automation_proc.kill()
    _automation_proc = None
    _status = "stopped"
    _emit("automation_status", {"status": "stopped"})


async def start_scheduler():
    global _scheduler_proc, _status
    if _scheduler_proc and _scheduler_proc.returncode is None:
        raise RuntimeError("Scheduler already running")

    _status = "running"
    _emit("automation_status", {"status": "running"})

    _scheduler_proc = await asyncio.create_subprocess_exec(
        sys.executable, str(SCHEDULER_ENTRY),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=str(PROJECT_ROOT),
    )
    asyncio.create_task(_stream_output(_scheduler_proc, "scheduler"))


async def stop_scheduler():
    global _scheduler_proc, _status
    if _scheduler_proc and _scheduler_proc.returncode is None:
        _scheduler_proc.terminate()
        try:
            await asyncio.wait_for(_scheduler_proc.wait(), timeout=5)
        except asyncio.TimeoutError:
            _scheduler_proc.kill()
    _scheduler_proc = None
    _status = "idle"
    _emit("automation_status", {"status": "idle"})


def get_status() -> str:
    global _status
    # Check if processes are still alive
    if _automation_proc and _automation_proc.returncode is None:
        return "running"
    if _scheduler_proc and _scheduler_proc.returncode is None:
        return "running"
    if _status == "running":
        _status = "idle"
    return _status
