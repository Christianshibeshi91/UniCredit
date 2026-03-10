import json
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core import mcp_client

logger = logging.getLogger(__name__)


def _extract_content(raw: str) -> str:
    """Extract the answer text from MCP tool JSON response."""
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

router = APIRouter(prefix="/api/lessons", tags=["lessons"])


class LessonRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=2000)
    lesson_type: str = Field(
        default="study_plan",
        pattern="^(study_plan|textbook_chapter|practice_exam|lab|gap_analysis)$",
    )
    notebook_id: str | None = None
    duration_minutes: int = Field(default=60, ge=15, le=480)


LESSON_PROMPTS = {
    "study_plan": (
        "Create a detailed daily study plan for the topic: '{topic}'. "
        "Duration: {duration} minutes. Include:\n"
        "1. Theory Session (specific sources and key concepts)\n"
        "2. Practice Problems (5-10 questions with answers)\n"
        "3. Hands-on Lab (practical steps with expected outcomes)\n"
        "4. Review & Reflect (15-min spaced repetition review)\n"
        "Format as structured markdown with time allocations."
    ),
    "textbook_chapter": (
        "Generate a comprehensive textbook chapter on: '{topic}'. Include:\n"
        "1. Learning Objectives (3-5 bullet points)\n"
        "2. Introduction with real-world context\n"
        "3. Core Concepts (with code examples where applicable)\n"
        "4. Key Takeaways summary\n"
        "5. Review Questions (5 questions with answers)\n"
        "Cite sources from the notebook. Format as structured markdown."
    ),
    "practice_exam": (
        "Generate a practice exam on: '{topic}'. Include:\n"
        "1. 15 multiple-choice questions with 4 options each\n"
        "2. 5 scenario-based questions\n"
        "3. Answer key with detailed explanations\n"
        "4. Score interpretation guide\n"
        "Cite exact source sections. Format as structured markdown."
    ),
    "lab": (
        "Create a hands-on lab exercise for: '{topic}'. Include:\n"
        "1. Lab Objectives\n"
        "2. Prerequisites and setup steps\n"
        "3. Step-by-step instructions (numbered)\n"
        "4. Expected output at each step\n"
        "5. Troubleshooting tips\n"
        "6. Challenge extensions\n"
        "Format as structured markdown with code blocks."
    ),
    "gap_analysis": (
        "Perform a knowledge gap analysis for: '{topic}'. Include:\n"
        "1. Core competencies required\n"
        "2. Key knowledge areas with proficiency assessment\n"
        "3. Identified gaps (priority-ranked)\n"
        "4. Recommended study resources for each gap\n"
        "5. Suggested study timeline\n"
        "Format as structured markdown with tables."
    ),
}


@router.post("")
async def generate_lesson(req: LessonRequest):
    """Generate a structured lesson. Tries NotebookLM browser, falls back to Gemini."""
    prompt_template = LESSON_PROMPTS[req.lesson_type]
    prompt = prompt_template.format(
        topic=req.topic, duration=req.duration_minutes
    )

    # Try NotebookLM browser-based query first
    try:
        args: dict = {"question": prompt}
        if req.notebook_id:
            args["notebook_id"] = req.notebook_id

        result = await mcp_client.call_tool("ask_question", args)

        # Check if MCP returned an error in JSON
        try:
            parsed = json.loads(result)
            if parsed.get("success") is False:
                raise ValueError(parsed.get("error", "NotebookLM query failed"))
        except (json.JSONDecodeError, TypeError):
            pass

        return {
            "lesson_type": req.lesson_type,
            "topic": req.topic,
            "content": _extract_content(result),
            "duration_minutes": req.duration_minutes,
        }
    except Exception as e:
        logger.warning(f"NotebookLM failed for lesson: {e}. Falling back to Gemini.")

    # Fallback: Gemini API
    try:
        result = await mcp_client.call_tool("gemini_query", {"query": prompt})
        return {
            "lesson_type": req.lesson_type,
            "topic": req.topic,
            "content": _extract_content(result),
            "duration_minutes": req.duration_minutes,
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Both NotebookLM and Gemini failed: {e}")
