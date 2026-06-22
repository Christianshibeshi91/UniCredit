"""Shared LLM client — OpenRouter (free models) with Ollama local fallback.

Primary: OpenRouter free-tier models (no cost):
- Scoring/JSON: nvidia/nemotron-3-super-120b-a12b:free (structured output, 262K ctx)
- Writing: nvidia/nemotron-3-super-120b-a12b:free (120B params, high quality)
- Form filling: nvidia/nemotron-3-super-120b-a12b:free (structured output)

Fallback: Local Ollama if OpenRouter is unavailable or returns an error.
"""

import json
import os
import time

import requests  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]

# Persistent session for connection pooling
_session = requests.Session()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Model assignments by task type (from .env or defaults)
MODEL_SCORING = os.getenv("OPENROUTER_MODEL_SCORING", "google/gemini-2.5-flash")
MODEL_WRITING = os.getenv("OPENROUTER_MODEL_WRITING", "anthropic/claude-sonnet-4")
MODEL_FORM_FILL = os.getenv("OPENROUTER_MODEL_FORM_FILL", "google/gemini-2.5-flash")

# Legacy alias for imports that reference OLLAMA_WRITING_MODEL
OLLAMA_WRITING_MODEL = MODEL_WRITING

# ── Ollama fallback config ──────────────────────────────────────────
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma2:9b")
OLLAMA_WRITING_MODEL_LOCAL = os.getenv("OLLAMA_WRITING_MODEL", "gemma2:9b")


def _ollama_available():
    """Check if local Ollama is running."""
    try:
        r = _session.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def _ollama_generate(prompt, model=None, max_tokens=2000, temperature=0.7):
    """Call local Ollama as fallback. Returns response text or None."""
    model = model or OLLAMA_MODEL
    try:
        r = _session.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "keep_alive": "10m",
                "options": {"num_predict": max_tokens, "temperature": temperature},
            },
            timeout=300,
        )
        if r.status_code == 200:
            return r.json().get("response", "")
        return None
    except Exception:
        return None


# ── OpenRouter API ──────────────────────────────────────────────────

def is_available():
    """Check if any LLM backend is available (OpenRouter or Ollama)."""
    return bool(OPENROUTER_API_KEY) or _ollama_available()


def _call_openrouter(prompt, model, max_tokens=2000, temperature=0.7):
    """Send a chat completion to OpenRouter. Returns response text or None."""
    if not OPENROUTER_API_KEY:
        return None

    max_retries = 3
    backoff = 2
    for attempt in range(max_retries):
        try:
            r = _session.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com/linkedin-automation",
                    "X-Title": "LinkedIn Job Bot",
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                },
                timeout=120,
            )
            if r.status_code == 200:
                data = r.json()
                choices = data.get("choices", [])
                if choices:
                    msg = choices[0].get("message", {}) or {}
                    content = msg.get("content")
                    # Some thinking models return content=null with reasoning
                    if content:
                        return content
                alert("OpenRouter", "Empty content in response", "warning")
                return None
            elif r.status_code in (429, 500, 502, 503, 504):
                alert("OpenRouter", f"HTTP {r.status_code} (attempt {attempt+1}/{max_retries}). Retrying in {backoff}s...", "warning")
                time.sleep(backoff)
                backoff *= 2
            else:
                error_msg = r.text[:300]
                alert("OpenRouter", f"HTTP {r.status_code}: {error_msg}", "warning")
                return None
        except Exception as e:
            alert("OpenRouter", f"Request failed (attempt {attempt+1}/{max_retries}): {e}", "warning")
            if attempt < max_retries - 1:
                time.sleep(backoff)
                backoff *= 2
            else:
                return None
    return None


# ── Public API (OpenRouter first, Ollama fallback) ──────────────────

def generate(prompt, model=None, max_tokens=2000):
    """Generate text. Tries OpenRouter free models first, falls back to Ollama."""
    model = model or MODEL_WRITING

    # Try OpenRouter
    result = _call_openrouter(prompt, model=model, max_tokens=max_tokens)
    if result:
        return result

    # Fallback to Ollama
    if _ollama_available():
        alert("LLM", "OpenRouter failed, falling back to Ollama", "warning")
        return _ollama_generate(prompt, model=OLLAMA_WRITING_MODEL_LOCAL, max_tokens=max_tokens)

    alert("LLM", "No LLM backend available (OpenRouter + Ollama both failed)", "error")
    return None


def generate_json(prompt, model=None, max_tokens=1500):
    """Generate and parse JSON. Tries OpenRouter first, falls back to Ollama.

    Returns parsed dict/list or None.
    """
    model = model or MODEL_SCORING

    # Try OpenRouter
    raw = _call_openrouter(prompt, model=model, max_tokens=max_tokens, temperature=0.3)

    # Fallback to Ollama
    if not raw and _ollama_available():
        alert("LLM", "OpenRouter failed, falling back to Ollama for JSON", "warning")
        raw = _ollama_generate(prompt, model=OLLAMA_MODEL, max_tokens=max_tokens, temperature=0.3)

    if not raw:
        return None

    return _parse_json(raw)


def _parse_json(raw):
    """Extract JSON from LLM response text."""
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
    print(f"OpenRouter key set: {bool(OPENROUTER_API_KEY)}")
    print(f"  Scoring model:   {MODEL_SCORING}")
    print(f"  Writing model:   {MODEL_WRITING}")
    print(f"  Form fill model: {MODEL_FORM_FILL}")
    print(f"Ollama available:  {_ollama_available()}")
    print(f"  Ollama URL:      {OLLAMA_URL}")
    print(f"  Ollama model:    {OLLAMA_MODEL}")
    print()

    if is_available():
        resp = generate("Say hello in one sentence.", max_tokens=50)
        print(f"Response: {resp}")
    else:
        print("No LLM backend available. Set OPENROUTER_API_KEY or start Ollama.")
