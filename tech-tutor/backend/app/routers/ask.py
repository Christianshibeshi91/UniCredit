import json
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core import mcp_client

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


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=5000)
    notebook_id: str | None = None
    notebook_url: str | None = None
    show_browser: bool = False
    use_gemini: bool = False


class AskResponse(BaseModel):
    answer: str
    notebook_id: str | None = None
    source: str = "notebooklm"


@router.post("", response_model=AskResponse)
async def ask_question(req: AskRequest):
    """Ask a question. Tries NotebookLM browser first, falls back to Gemini API."""
    # If user explicitly wants Gemini, skip browser attempt
    if not req.use_gemini:
        try:
            args: dict = {"question": req.question}
            if req.notebook_url:
                args["notebook_url"] = req.notebook_url
            elif req.notebook_id:
                args["notebook_id"] = req.notebook_id
            if req.show_browser:
                args["show_browser"] = True

            result = await mcp_client.call_tool("ask_question", args)
            # Check if the result indicates an error from the MCP tool
            try:
                parsed = json.loads(result)
                if parsed.get("success") is False:
                    raise ValueError(parsed.get("error", "NotebookLM query failed"))
            except (json.JSONDecodeError, TypeError):
                pass  # Not JSON, treat as successful text response

            return AskResponse(answer=_extract_answer(result), notebook_id=req.notebook_id, source="notebooklm")
        except Exception as e:
            logger.warning(f"NotebookLM ask_question failed: {e}. Falling back to Gemini API.")

    # Fallback: use gemini_query
    try:
        result = await mcp_client.call_tool("gemini_query", {"query": req.question})
        return AskResponse(answer=_extract_answer(result), notebook_id=req.notebook_id, source="gemini")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Both NotebookLM and Gemini failed: {e}")


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
