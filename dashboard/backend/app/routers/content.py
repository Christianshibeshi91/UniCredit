import asyncio
import sys
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_auth
from app.core.database import get_session
from app.core.config import PROJECT_ROOT, TMP_DIR
from app.models.job import Job

router = APIRouter(prefix="/api/content", tags=["content"], dependencies=[Depends(require_auth)])

# Add project root to path for importing automation modules
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


async def _run_in_executor(func, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, func, *args)


@router.get("/resume/{job_id}")
async def get_resume(job_id: int, session: AsyncSession = Depends(get_session)):
    """Return the Google Drive URL for the tailored resume."""
    result = await session.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.resume_url:
        raise HTTPException(status_code=404, detail="No resume link in Google Sheet for this job")
    return {"url": job.resume_url, "filename": job.resume_file}


@router.get("/cover-letter/{job_id}")
async def get_cover_letter(job_id: int, session: AsyncSession = Depends(get_session)):
    """Return the Google Drive URL for the tailored cover letter."""
    result = await session.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.cover_letter_url:
        raise HTTPException(status_code=404, detail="No cover letter link in Google Sheet for this job")
    return {"url": job.cover_letter_url, "filename": job.cover_letter_file}


@router.post("/follow-up-email/{job_id}")
async def generate_follow_up(job_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    try:
        from LinkedinAutomation.ollama_client import generate_text
        prompt = (
            f"Write a professional follow-up email for a {job.title} position at {job.company}. "
            f"I applied on {job.date_logged}. Keep it concise, professional, and express continued interest."
        )
        text = await _run_in_executor(generate_text, prompt)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_id}/pdf/{doc_type}")
async def download_pdf(job_id: int, doc_type: str, session: AsyncSession = Depends(get_session)):
    if doc_type not in ("resume", "cover_letter"):
        raise HTTPException(status_code=400, detail="Invalid doc_type")
    result = await session.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    file_field = job.resume_file if doc_type == "resume" else job.cover_letter_file
    if not file_field:
        raise HTTPException(status_code=404, detail="No file available")

    # Try to find the file in .tmp/
    for candidate_path in [TMP_DIR / file_field, Path(file_field)]:
        if candidate_path.exists():
            return FileResponse(str(candidate_path), media_type="application/pdf")

    raise HTTPException(status_code=404, detail="File not found on disk")
