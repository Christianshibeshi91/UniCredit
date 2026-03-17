import json
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core import mcp_client, manus_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ask", tags=["ask"])


def _extract_answer(raw: str) -> str:
    """Extract the answer text from MCP tool JSON response."""
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            # Gemini/NotebookLM responses: {"success": true, "data": {"answer": "..."}}
            if "data" in parsed and isinstance(parsed["data"], dict):
                return parsed["data"].get("answer", raw)
            # Direct answer field
            if "answer" in parsed:
                return parsed["answer"]
    except (json.JSONDecodeError, TypeError):
        pass
    return raw


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


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=5000)
    notebook_id: str | None = None
    notebook_url: str | None = None
    show_browser: bool = False
    use_gemini: bool = False
    deep: bool = False
    manus: bool = False


class AskResponse(BaseModel):
    answer: str
    notebook_id: str | None = None
    source: str = "notebooklm"


@router.post("", response_model=AskResponse)
async def ask_question(req: AskRequest):
    """Ask a question. Tries Manus, deep research, NotebookLM, then Gemini — all with detailed prompting."""
    enriched = DETAILED_PROMPT.format(question=req.question)

    # Manus AI Research mode
    if req.manus and manus_client.is_configured():
        try:
            result = await manus_client.run_research(enriched)
            return AskResponse(answer=result, notebook_id=req.notebook_id, source="manus")
        except Exception as e:
            logger.warning(f"Manus research failed: {e}. Falling back.")

    # Deep Research mode
    if req.deep:
        try:
            result = await mcp_client.call_tool("deep_research", {"query": enriched})
            return AskResponse(answer=_extract_answer(result), notebook_id=req.notebook_id, source="deep_research")
        except Exception as e:
            logger.warning(f"Deep research failed: {e}. Falling back.")

    # Try NotebookLM browser
    if not req.use_gemini:
        try:
            args: dict = {"question": enriched}
            if req.notebook_url:
                args["notebook_url"] = req.notebook_url
            elif req.notebook_id:
                args["notebook_id"] = req.notebook_id
            if req.show_browser:
                args["show_browser"] = True

            result = await mcp_client.call_tool("ask_question", args)
            try:
                parsed = json.loads(result)
                if parsed.get("success") is False:
                    raise ValueError(parsed.get("error", "NotebookLM query failed"))
            except (json.JSONDecodeError, TypeError):
                pass

            return AskResponse(answer=_extract_answer(result), notebook_id=req.notebook_id, source="notebooklm")
        except Exception as e:
            logger.warning(f"NotebookLM ask_question failed: {e}. Falling back to Gemini API.")

    # Fallback: Gemini with detailed prompt
    try:
        result = await mcp_client.call_tool("gemini_query", {"query": enriched})
        return AskResponse(answer=_extract_answer(result), notebook_id=req.notebook_id, source="gemini")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"All sources failed: {e}")


class DeepResearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=5000)


@router.post("/deep-research")
async def deep_research(req: DeepResearchRequest):
    """Run a deep research query using Gemini API with web grounding."""
    try:
        result = await mcp_client.call_tool(
            "deep_research", {"query": req.query}
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"MCP error: {e}")
