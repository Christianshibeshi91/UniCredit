"""Standalone Ollama AI client for the web_scraper package.

Replaces the LinkedinAutomation.ollama_client dependency so the
web_scraper package can be installed and used independently.

Uses OLLAMA_URL and OLLAMA_MODEL environment variables.
"""

from __future__ import annotations

import json
import logging
import os
import re

import requests  # pyre-ignore[21]

log = logging.getLogger(__name__)

# Persistent session for connection pooling (reuses TCP connections)
_session = requests.Session()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:4b")

# Cache the availability check for the session lifetime
_available_cache: bool | None = None


def is_available() -> bool:
    """Check if Ollama is running and reachable."""
    global _available_cache
    if _available_cache is not None:
        return _available_cache
    try:
        r = _session.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        _available_cache = r.status_code == 200
        return _available_cache
    except Exception:
        _available_cache = False
        return False


def generate(prompt: str, model: str | None = None, max_tokens: int = 2000) -> str | None:
    """Send a prompt to Ollama and return the response text.

    Returns None if Ollama is unavailable or the request fails.
    """
    model = model or OLLAMA_MODEL

    try:
        r = _session.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "keep_alive": "10m",
                "options": {
                    "num_predict": max_tokens,
                    "temperature": 0.7,
                },
            },
            timeout=300,
        )
        if r.status_code == 200:
            return r.json().get("response", "")
        else:
            log.warning("Ollama HTTP %d: %s", r.status_code, r.text[:200])
            return None
    except Exception as e:
        log.warning("Ollama not available: %s", e)
        return None


def generate_json(prompt: str, model: str | None = None) -> dict | list | None:
    """Send a prompt to Ollama and parse JSON from the response.

    Returns None if Ollama is unavailable or response isn't valid JSON.
    """
    raw = generate(prompt, model=model, max_tokens=1500)
    if not raw:
        return None

    text = raw.strip()

    # Remove thinking tags (qwen3 models)
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

    # Remove markdown code blocks if present
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            try:
                return json.loads(part)
            except (json.JSONDecodeError, ValueError):
                continue

    # Try parsing the whole response
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        pass

    # Try finding JSON object/array in the text
    for start_char, end_char in [("{", "}"), ("[", "]")]:
        start = text.find(start_char)
        end = text.rfind(end_char) + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except (json.JSONDecodeError, ValueError):
                pass

    return None
