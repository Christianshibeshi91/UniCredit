"""Textbook generation endpoint — orchestrates Manus, NotebookLM, Gemini, and Claude CLI.

Streams real-time SSE events as each research source completes individually,
then streams Claude synthesis output chunk-by-chunk.
"""

import asyncio
import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core import textbook_orchestrator as orchestrator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/textbook", tags=["textbook"])


class TextbookRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=2000)
    notebook_id: str | None = None
    model: str = "sonnet"  # Claude model: "sonnet" (fast) or "opus" (thorough)


def _sse(event_type: str, **data) -> str:
    """Format a Server-Sent Event."""
    payload = {"type": event_type, **data}
    return f"data: {json.dumps(payload)}\n\n"


async def _generate_textbook(topic: str, notebook_id: str | None, model: str):
    """Full textbook generation pipeline streamed as SSE events.

    Research sources report individually as they complete (not batched).
    """
    yield _sse("start", topic=topic)
    yield _sse("phase", name="research", message="Starting parallel research across AI sources...")

    # ── Phase 1: Parallel research with real-time per-source reporting ──

    results = orchestrator.ResearchResults()
    source_names = ["manus", "notebooklm", "gemini"]

    # Create individual tasks
    tasks = {
        "manus": asyncio.create_task(
            orchestrator._with_timeout(orchestrator._research_manus(topic), "manus")
        ),
        "notebooklm": asyncio.create_task(
            orchestrator._with_timeout(
                orchestrator._research_notebooklm(topic, notebook_id), "notebooklm"
            )
        ),
        "gemini": asyncio.create_task(
            orchestrator._with_timeout(orchestrator._research_gemini(topic), "gemini")
        ),
    }

    # Report starts
    for name in source_names:
        yield _sse("source_start", source=name, message=f"{name} researching...")

    # Wait for each source individually and report as it completes
    pending = set(tasks.values())
    task_to_name = {v: k for k, v in tasks.items()}

    while pending:
        done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)

        for task in done:
            name = task_to_name[task]
            try:
                result = task.result()
                text = result or ""
                setattr(results, name, text)
                if text:
                    yield _sse("source_done", source=name, chars=len(text),
                               message=f"{name} complete ({len(text):,} chars)")
                else:
                    yield _sse("source_done", source=name, chars=0,
                               message=f"{name} returned empty")
            except Exception as e:
                err_msg = f"{name}: {type(e).__name__}"
                results.errors.append(err_msg)
                yield _sse("source_done", source=name, chars=0, message=err_msg)
                yield _sse("warning", message=str(e))

    total_research = len(results.manus) + len(results.notebooklm) + len(results.gemini)
    sources_ok = 3 - len(results.errors)
    yield _sse("phase", name="research_done",
               message=f"Research complete: {total_research:,} chars from {sources_ok} sources")

    # ── Phase 2: Claude synthesis (streaming) ───────────────────────

    yield _sse("phase", name="synthesis",
               message=f"Claude ({model}) is writing the textbook...")

    try:
        full_content = ""
        async for chunk in orchestrator.stream_synthesis(topic, results, model=model):
            full_content += chunk
            yield _sse("chunk", content=chunk)
    except Exception as e:
        logger.error(f"Synthesis failed: {e}")
        yield _sse("error", content=f"Claude synthesis failed: {e}")
        yield _sse("done")
        return

    yield _sse("phase", name="complete",
               message=f"Textbook complete! {len(full_content):,} characters generated")
    yield _sse("done", total_chars=len(full_content))


@router.post("/generate")
async def generate_textbook(req: TextbookRequest):
    """Generate a full multi-chapter textbook via SSE streaming."""
    return StreamingResponse(
        _generate_textbook(req.topic, req.notebook_id, req.model),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
