"""Server-Sent Events streaming for real-time AI responses."""

import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core import mcp_client, manus_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stream", tags=["stream"])


class StreamAskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=5000)
    notebook_id: str | None = None
    deep: bool = False
    manus: bool = False


DETAILED_PROMPT = """You are an expert technical tutor. The student has asked the following question.
Provide a COMPREHENSIVE, DETAILED, and HOLISTIC response that covers:

1. **Direct Answer** — Address the question head-on with a clear, authoritative explanation
2. **Deep Context** — Explain the underlying concepts, architecture, and "why" behind the answer
3. **Comparisons & Trade-offs** — Compare relevant approaches, tools, or methods; explain when to use what
4. **Real-World Application** — Provide practical examples, scenarios, and implementation guidance
5. **Common Pitfalls** — Warn about mistakes, misconfigurations, and edge cases
6. **Best Practices** — Industry-standard recommendations and Microsoft/vendor guidance
7. **Related Topics** — Briefly connect to adjacent concepts the student should also understand

Use structured markdown with headers, bullet points, tables where helpful, and code blocks for any technical steps.
Be thorough — aim for textbook-quality depth, not a quick summary.

Student's Question: {question}"""


def _extract_answer(raw: str) -> str:
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            if "data" in parsed and isinstance(parsed["data"], dict):
                return parsed["data"].get("answer", raw)
            if "answer" in parsed:
                return parsed["answer"]
    except (json.JSONDecodeError, TypeError):
        pass
    return raw


async def _stream_response(question: str, notebook_id: str | None, deep: bool = False, manus: bool = False):
    """Stream AI response as SSE events."""
    yield f"data: {json.dumps({'type': 'start'})}\n\n"

    enriched_query = DETAILED_PROMPT.format(question=question)
    answer = None
    source = "notebooklm"

    # Manus AI Research mode — creates an async research task and polls for result
    if manus and manus_client.is_configured():
        yield f"data: {json.dumps({'type': 'chunk', 'content': '*Manus AI is researching this topic — this may take a minute...*\\n\\n'})}\n\n"
        try:
            result = await manus_client.run_research(enriched_query)
            answer = result
            source = "manus"
        except TimeoutError:
            yield f"data: {json.dumps({'type': 'chunk', 'content': '*Manus research timed out, falling back...*\\n\\n'})}\n\n"
            logger.warning("Manus research timed out, falling back")
        except Exception as e:
            yield f"data: {json.dumps({'type': 'chunk', 'content': '*Manus unavailable, falling back...*\\n\\n'})}\n\n"
            logger.warning(f"Manus research failed: {e}, falling back")

    # Deep Research mode — uses Gemini Deep Research with web grounding
    if answer is None and deep:
        yield f"data: {json.dumps({'type': 'chunk', 'content': '*Running deep research with web grounding...*\\n\\n'})}\n\n"
        try:
            result = await mcp_client.call_tool("deep_research", {"query": enriched_query})
            answer = _extract_answer(result)
            source = "deep_research"
        except Exception as e:
            logger.warning(f"Deep research failed: {e}, falling back to gemini_query")

    # Standard mode — try NotebookLM first, then Gemini with detailed prompt
    if answer is None:
        try:
            args: dict = {"question": enriched_query}
            if notebook_id:
                args["notebook_id"] = notebook_id
            result = await mcp_client.call_tool("ask_question", args)
            parsed = json.loads(result) if isinstance(result, str) else result
            if isinstance(parsed, dict) and parsed.get("success") is False:
                raise ValueError(parsed.get("error", "NotebookLM failed"))
            answer = _extract_answer(result)
            source = "notebooklm"
        except Exception as e:
            logger.warning(f"NotebookLM streaming failed: {e}, falling back to Gemini")

    # Gemini fallback with detailed prompt
    if answer is None:
        try:
            result = await mcp_client.call_tool("gemini_query", {"query": enriched_query})
            answer = _extract_answer(result)
            source = "gemini"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': f'All sources failed: {e}'})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return

    # Stream the response in chunks
    chunks = answer.split("\n\n")
    for i, chunk in enumerate(chunks):
        text = chunk if i == 0 else "\n\n" + chunk
        yield f"data: {json.dumps({'type': 'chunk', 'content': text})}\n\n"

    yield f"data: {json.dumps({'type': 'done', 'source': source})}\n\n"


@router.post("/ask")
async def stream_ask(req: StreamAskRequest):
    """Stream an AI response via SSE."""
    return StreamingResponse(
        _stream_response(req.question, req.notebook_id, req.deep, req.manus),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
