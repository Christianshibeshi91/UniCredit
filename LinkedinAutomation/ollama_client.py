"""Shared LLM client — routes to OpenRouter (cloud) or Ollama (local).

Priority: OpenRouter if OPENROUTER_API_KEY is set, else Ollama at localhost:11434.
Falls back gracefully if neither is available.
"""

import json
import os
import time

import requests  # pyre-ignore[21]

# Persistent session for connection pooling (reuses TCP connections)
_session = requests.Session()

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]

# Ollama (local)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b")
OLLAMA_WRITING_MODEL = os.getenv("OLLAMA_WRITING_MODEL", "gemma2:9b")

# OpenRouter (cloud) — takes priority when API key is set
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL_SCORING = os.getenv("OPENROUTER_MODEL_SCORING", "google/gemini-2.5-flash")
OPENROUTER_MODEL_WRITING = os.getenv("OPENROUTER_MODEL_WRITING", "anthropic/claude-sonnet-4")
OPENROUTER_MODEL_FORM_FILL = os.getenv("OPENROUTER_MODEL_FORM_FILL", "google/gemini-2.5-flash")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Map task hints to OpenRouter models
_OPENROUTER_MODEL_MAP = {
    "scoring": OPENROUTER_MODEL_SCORING,
    "score": OPENROUTER_MODEL_SCORING,
    "writing": OPENROUTER_MODEL_WRITING,
    "resume": OPENROUTER_MODEL_WRITING,
    "cover": OPENROUTER_MODEL_WRITING,
    "form": OPENROUTER_MODEL_FORM_FILL,
    "fill": OPENROUTER_MODEL_FORM_FILL,
}


def _use_openrouter():
    """Return True if OpenRouter should be used."""
    return bool(OPENROUTER_API_KEY)


def _openrouter_model_for(task_hint=""):
    """Pick the best OpenRouter model based on task hint."""
    hint = task_hint.lower()
    for key, model in _OPENROUTER_MODEL_MAP.items():
        if key in hint:
            return model
    return OPENROUTER_MODEL_SCORING  # default: fast model


def _openrouter_generate(prompt, task_hint="", max_tokens=2000):
    """Send prompt to OpenRouter and return response text."""
    model = _openrouter_model_for(task_hint)
    try:
        r = _session.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": 0.7,
            },
            timeout=120,
        )
        if r.status_code == 200:
            data = r.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return content
        else:
            alert("OpenRouter", f"HTTP {r.status_code}: {r.text[:200]}", "warning")
            return None
    except Exception as e:
        alert("OpenRouter", f"Error: {e}", "warning")
        return None


# Cache availability with a 5-minute TTL
_available_cache = None
_available_cache_time = 0.0
_CACHE_TTL = 300  # 5 minutes


def is_available():
    """Check if any LLM backend is available (OpenRouter or Ollama)."""
    if _use_openrouter():
        return True  # OpenRouter is always available if key is set
    global _available_cache, _available_cache_time
    if _available_cache is not None and (time.time() - _available_cache_time) < _CACHE_TTL:
        return _available_cache
    try:
        r = _session.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        _available_cache = r.status_code == 200
        _available_cache_time = time.time()
        return _available_cache
    except Exception:
        _available_cache = False
        _available_cache_time = time.time()
        return False


def generate(prompt, model=None, max_tokens=2000, task_hint=""):
    """Send a prompt to the best available LLM and return response text.

    Routes to OpenRouter (cloud) if configured, else Ollama (local).
    Returns None if no backend is available.
    """
    # OpenRouter path (priority)
    if _use_openrouter():
        # Determine task hint from model name if not provided
        if not task_hint and model:
            if model == OLLAMA_WRITING_MODEL:
                task_hint = "writing"
        result = _openrouter_generate(prompt, task_hint=task_hint, max_tokens=max_tokens)
        if result is not None:
            return result
        # Fall through to Ollama if OpenRouter fails

    # Ollama path (fallback)
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
    except requests.exceptions.ConnectionError:
        # Ollama not running (expected on cloud/VPS) — silent skip
        return None
    except Exception as e:
        alert("Ollama", f"Unexpected error: {e}", "warning")
        return None


def generate_json(prompt, model=None, max_tokens=1500, task_hint=""):
    """Send a prompt to the LLM and parse JSON from the response.

    Returns None if no backend is available or response isn't valid JSON.
    """
    raw = generate(prompt, model=model, max_tokens=max_tokens, task_hint=task_hint)
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
