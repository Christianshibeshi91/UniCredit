"""Textbook generation orchestrator — coordinates Manus, NotebookLM, Gemini, and Claude.

Flow:
  Phase 1 (parallel): Manus deep research + NotebookLM sources + Gemini outline
                       Each source has a 60s timeout so one slow source can't block the pipeline.
  Phase 2 (streaming): Claude CLI synthesizes all research into a textbook.
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from typing import AsyncIterator

from app.core import mcp_client, manus_client, claude_client

logger = logging.getLogger(__name__)

# Per-source timeout — if any single source takes longer, skip it gracefully
SOURCE_TIMEOUT_SECONDS = 120


@dataclass
class ResearchResults:
    """Collected research from all sources."""
    manus: str = ""
    notebooklm: str = ""
    gemini: str = ""
    errors: list[str] = field(default_factory=list)


# ── Research prompts (concise — less prompt = faster source response) ────

MANUS_RESEARCH_PROMPT = """Research this topic for a textbook. Cover key concepts, current best practices, major tools/frameworks, and real-world examples. Be thorough but concise.

Topic: {topic}"""

NOTEBOOKLM_QUERY = """Summarize everything relevant to this topic from the study materials. Include key details, examples, and citations.

Topic: {topic}"""

GEMINI_OUTLINE_PROMPT = """Create a textbook outline for this topic with 5-8 chapter titles, section headings, key concepts per section, and learning objectives.

Topic: {topic}"""


# ── Claude synthesis prompt (focused — produces faster, better output) ────

SYNTHESIS_PROMPT = """You are an expert technical author. Write a comprehensive textbook on the topic below using the provided research.

## Source Material

### Manus AI Research:
{manus_research}

### NotebookLM Sources:
{notebooklm_research}

### Gemini Outline:
{gemini_outline}

## Structure

Write 5-8 chapters. Each chapter needs:
- Title and learning objectives
- Core content with clear explanations and examples
- Code samples or practical demonstrations where relevant
- Key takeaways
- 2-3 review questions

Also include: Title Page, Preface, Table of Contents, and Glossary.

## Style
- University-level, accessible to motivated beginners
- Engaging prose with analogies and real-world examples
- Markdown formatting (headers, bold, code blocks, tables, lists)
- Cross-reference between chapters
- Build concepts progressively

## Topic: {topic}

Write the complete textbook now. Write actual content, not placeholders."""


async def _research_manus(topic: str) -> str:
    """Run Manus deep research on the topic."""
    if not manus_client.is_configured():
        return ""
    prompt = MANUS_RESEARCH_PROMPT.format(topic=topic)
    return await manus_client.run_research(prompt, timeout_seconds=SOURCE_TIMEOUT_SECONDS)


async def _research_notebooklm(topic: str, notebook_id: str | None) -> str:
    """Query NotebookLM for source-backed content."""
    query = NOTEBOOKLM_QUERY.format(topic=topic)
    args: dict = {"question": query}
    if notebook_id:
        args["notebook_id"] = notebook_id
    result = await mcp_client.call_tool("ask_question", args)
    try:
        parsed = json.loads(result)
        if isinstance(parsed, dict):
            if "data" in parsed and isinstance(parsed["data"], dict):
                return parsed["data"].get("answer", result)
            if "answer" in parsed:
                return parsed["answer"]
    except (json.JSONDecodeError, TypeError):
        pass
    return result


async def _research_gemini(topic: str) -> str:
    """Generate a structured outline via Gemini."""
    query = GEMINI_OUTLINE_PROMPT.format(topic=topic)
    result = await mcp_client.call_tool("gemini_query", {"query": query})
    try:
        parsed = json.loads(result)
        if isinstance(parsed, dict):
            if "data" in parsed and isinstance(parsed["data"], dict):
                return parsed["data"].get("answer", result)
            if "answer" in parsed:
                return parsed["answer"]
    except (json.JSONDecodeError, TypeError):
        pass
    return result


async def _with_timeout(coro, name: str, timeout: int = SOURCE_TIMEOUT_SECONDS) -> str:
    """Wrap a coroutine with a timeout. Returns empty string on timeout."""
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        logger.warning(f"{name} timed out after {timeout}s")
        raise TimeoutError(f"{name} timed out after {timeout}s")


async def research_phase(topic: str, notebook_id: str | None = None) -> ResearchResults:
    """Phase 1: Run all research sources in parallel with per-source timeouts."""
    results = ResearchResults()

    tasks = {
        "manus": _with_timeout(_research_manus(topic), "manus"),
        "notebooklm": _with_timeout(_research_notebooklm(topic, notebook_id), "notebooklm"),
        "gemini": _with_timeout(_research_gemini(topic), "gemini"),
    }

    gathered = await asyncio.gather(
        *tasks.values(),
        return_exceptions=True,
    )

    for name, result in zip(tasks.keys(), gathered):
        if isinstance(result, Exception):
            err = f"{name}: skipped ({type(result).__name__})"
            logger.warning(err)
            results.errors.append(err)
        else:
            setattr(results, name, result or "")

    return results


async def synthesis_phase(topic: str, research: ResearchResults, model: str = "qwen3:8b") -> str:
    """Phase 2: Ollama synthesizes all research into a textbook."""
    prompt = SYNTHESIS_PROMPT.format(
        topic=topic,
        manus_research=research.manus or "(unavailable)",
        notebooklm_research=research.notebooklm or "(unavailable)",
        gemini_outline=research.gemini or "(unavailable)",
    )
    return await claude_client.generate(prompt, model=model)


async def stream_synthesis(topic: str, research: ResearchResults, model: str = "qwen3:8b") -> AsyncIterator[str]:
    """Phase 2 (streaming): Ollama synthesizes with real-time output."""
    prompt = SYNTHESIS_PROMPT.format(
        topic=topic,
        manus_research=research.manus or "(unavailable)",
        notebooklm_research=research.notebooklm or "(unavailable)",
        gemini_outline=research.gemini or "(unavailable)",
    )
    async for chunk in claude_client.stream_generate(prompt, model=model):
        yield chunk
