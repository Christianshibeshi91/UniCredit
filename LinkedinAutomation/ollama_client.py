"""Shared Ollama client for free local LLM inference.

Uses Ollama's REST API at localhost:11434. Falls back gracefully
if Ollama isn't running.
"""

import json
import os

import requests  # pyre-ignore[21]

# Persistent session for connection pooling (reuses TCP connections)
_session = requests.Session()

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:4b")
OLLAMA_WRITING_MODEL = os.getenv("OLLAMA_WRITING_MODEL", "qwen3:4b")


# Cache the availability check for the session lifetime
_available_cache = None


def is_available():
    """Check if Ollama is running and has a model loaded."""
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


def generate(prompt, model=None, max_tokens=2000):
    """Send a prompt to Ollama and return the response text.

    Returns None if Ollama is unavailable.
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
            alert("Ollama", f"HTTP {r.status_code}: {r.text[:200]}", "warning")
            return None
    except Exception as e:
        alert("Ollama", f"Not available: {e}", "warning")
        return None


def generate_json(prompt, model=None):
    """Send a prompt to Ollama and parse JSON from the response.

    Returns None if Ollama is unavailable or response isn't valid JSON.
    """
    raw = generate(prompt, model=model, max_tokens=1500)
    if not raw:
        return None

    # Try to extract JSON from response
    text = raw.strip()

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

    # Try finding JSON object in the text
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end])
        except (json.JSONDecodeError, ValueError):
            pass

    return None


if __name__ == "__main__":
    if is_available():
        print(f"Ollama is running at {OLLAMA_URL}")
        resp = generate("Say hello in one sentence.")
        print(f"Response: {resp}")
    else:
        print("Ollama is not running. Start it with: ollama serve")
