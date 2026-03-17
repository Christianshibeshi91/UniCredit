"""Interactive quiz generation and grading."""

import json
import uuid
import logging
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core import mcp_client, database as db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/quiz", tags=["quiz"])

QUIZ_PROMPT = """Generate a quiz on: '{topic}'.

Return ONLY a JSON array of question objects. No markdown, no explanation, just the JSON array.
Each object must have exactly these fields:
- "question": string (the question text)
- "options": array of exactly 4 strings (A, B, C, D choices)
- "correct": integer 0-3 (index of correct option)
- "explanation": string (why the correct answer is right)

Generate exactly {count} questions. Mix difficulty levels.
Return ONLY the JSON array, starting with [ and ending with ]."""


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


def _parse_questions(raw: str) -> list[dict]:
    """Parse quiz questions from AI response, handling various formats."""
    text = _extract_answer(raw)

    # Try to find JSON array in the response
    # First try direct parse
    try:
        questions = json.loads(text)
        if isinstance(questions, list):
            return _validate_questions(questions)
    except json.JSONDecodeError:
        pass

    # Try to extract JSON array from markdown code block or surrounding text
    patterns = [
        r'```(?:json)?\s*(\[[\s\S]*?\])\s*```',
        r'(\[[\s\S]*\])',
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            try:
                questions = json.loads(match.group(1))
                if isinstance(questions, list):
                    return _validate_questions(questions)
            except json.JSONDecodeError:
                continue

    raise ValueError("Could not parse quiz questions from AI response")


def _validate_questions(questions: list) -> list[dict]:
    """Validate and normalize question format."""
    validated = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        if "question" not in q or "options" not in q or "correct" not in q:
            continue
        options = q["options"]
        if not isinstance(options, list) or len(options) < 2:
            continue
        correct = q["correct"]
        if isinstance(correct, str):
            # Handle "A", "B", "C", "D" format
            correct = ord(correct.upper()) - ord('A')
        if not isinstance(correct, int) or correct < 0 or correct >= len(options):
            correct = 0
        validated.append({
            "question": str(q["question"]),
            "options": [str(o) for o in options[:4]],
            "correct": correct,
            "explanation": str(q.get("explanation", "")),
        })
    if not validated:
        raise ValueError("No valid questions found")
    return validated


class GenerateQuizRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=2000)
    count: int = Field(default=10, ge=3, le=30)
    notebook_id: str | None = None


class SubmitQuizRequest(BaseModel):
    quiz_id: str
    answers: list[int]


@router.post("/generate")
async def generate_quiz(req: GenerateQuizRequest):
    """Generate quiz questions using AI."""
    prompt = QUIZ_PROMPT.format(topic=req.topic, count=req.count)

    # Try NotebookLM first, fall back to Gemini
    raw = None
    for tool, args in [
        ("ask_question", {"question": prompt, **({"notebook_id": req.notebook_id} if req.notebook_id else {})}),
        ("gemini_query", {"query": prompt}),
    ]:
        try:
            raw = await mcp_client.call_tool(tool, args)
            questions = _parse_questions(raw)
            quiz_id = uuid.uuid4().hex[:12]
            await db.save_quiz(quiz_id, req.topic, questions, req.notebook_id)
            return {"quiz_id": quiz_id, "topic": req.topic, "questions": questions, "count": len(questions)}
        except Exception as e:
            logger.warning(f"Quiz generation with {tool} failed: {e}")
            continue

    raise HTTPException(status_code=502, detail="Failed to generate quiz from both NotebookLM and Gemini")


@router.post("/submit")
async def submit_quiz(req: SubmitQuizRequest):
    """Submit quiz answers and get score."""
    quiz = await db.get_quiz(req.quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = quiz["questions"]
    if len(req.answers) != len(questions):
        raise HTTPException(status_code=400, detail=f"Expected {len(questions)} answers, got {len(req.answers)}")

    score = sum(1 for a, q in zip(req.answers, questions) if a == q["correct"])
    attempt_id = uuid.uuid4().hex[:12]
    attempt = await db.save_quiz_attempt(attempt_id, req.quiz_id, req.answers, score, len(questions))

    # Build detailed results
    results = []
    for i, (answer, q) in enumerate(zip(req.answers, questions)):
        results.append({
            "question": q["question"],
            "options": q["options"],
            "your_answer": answer,
            "correct_answer": q["correct"],
            "is_correct": answer == q["correct"],
            "explanation": q["explanation"],
        })

    return {
        "attempt_id": attempt_id,
        "score": score,
        "total": len(questions),
        "percentage": round(score / len(questions) * 100),
        "results": results,
    }


@router.get("/{quiz_id}")
async def get_quiz(quiz_id: str):
    quiz = await db.get_quiz(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    attempts = await db.get_quiz_attempts(quiz_id)
    return {**quiz, "attempts": attempts}


@router.get("")
async def list_quizzes(limit: int = 20):
    return {"quizzes": await db.list_quizzes(limit)}
