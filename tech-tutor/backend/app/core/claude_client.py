"""Ollama client — streams textbook generation via the local Ollama API.

Uses qwen3:8b by default. No API keys needed — runs entirely local.
Keeps the module name as claude_client so existing imports don't break.
"""

import json
import logging
from typing import AsyncIterator

import httpx

logger = logging.getLogger(__name__)

OLLAMA_BASE = "http://localhost:11434"

# Map friendly names to Ollama model tags
MODEL_MAP = {
    "qwen3:8b": "qwen3:8b",
    "qwen3": "qwen3:8b",
    "gemma2": "gemma2:9b",
    "gemma2:9b": "gemma2:9b",
    "llama3.1": "llama3.1:8b",
    "llama3.1:8b": "llama3.1:8b",
    "sonnet": "gemma2:9b",
    "opus": "gemma2:9b",
}

DEFAULT_MODEL = "qwen3:8b"


def _resolve_model(model: str) -> str:
    """Resolve a friendly model name to an Ollama model tag."""
    return MODEL_MAP.get(model, model)


async def generate(prompt: str, model: str = DEFAULT_MODEL) -> str:
    """Run a single Ollama prompt and return the full response text."""
    resolved = _resolve_model(model)
    logger.info(f"Ollama generate: model={resolved}, prompt={len(prompt)} chars")

    async with httpx.AsyncClient(timeout=httpx.Timeout(600, connect=10)) as client:
        resp = await client.post(
            f"{OLLAMA_BASE}/api/generate",
            json={"model": resolved, "prompt": prompt, "stream": False},
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("response", "")


async def stream_generate(prompt: str, model: str = DEFAULT_MODEL) -> AsyncIterator[str]:
    """Stream Ollama output chunk-by-chunk as an async iterator."""
    resolved = _resolve_model(model)
    logger.info(f"Ollama stream: model={resolved}, prompt={len(prompt)} chars")

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(600, connect=10)) as client:
            async with client.stream(
                "POST",
                f"{OLLAMA_BASE}/api/generate",
                json={"model": resolved, "prompt": prompt, "stream": True},
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        chunk = data.get("response", "")
                        
                        # Check for common error messages in the output stream
                        lower_chunk = chunk.lower()
                        if "hit your limit" in lower_chunk or "quota exceeded" in lower_chunk or "insufficient credits" in lower_chunk:
                            raise RuntimeError(f"Ollama/CLI quota exceeded or limit hit: {chunk.strip()}")

                        if chunk:
                            yield chunk
                        if data.get("done", False):
                            break
                    except json.JSONDecodeError:
                        continue
                    except Exception as e:
                        logger.warning(f"Error processing Ollama stream line: {line}. Error: {e}")
                        continue
    except Exception as e:
        logger.error(f"Ollama connection failed: {e}")
        # Re-raise so orchestrator can handle fallback
        raise


def is_available() -> bool:
    """Check if Ollama is reachable."""
    try:
        resp = httpx.get(f"{OLLAMA_BASE}/api/tags", timeout=3)
        return resp.status_code == 200
    except Exception:
        return False
