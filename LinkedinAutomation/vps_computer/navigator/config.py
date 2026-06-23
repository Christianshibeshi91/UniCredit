"""Free-only OpenRouter configuration for the navigation agent.

All models are $0 — append :free to model IDs.
Rate limits: 20 req/min, 200 req/day per model.
Rotate across 6+ vision models for ~1,200 free requests/day.
"""

import os

# ── OpenRouter ──────────────────────────────────────────────────────
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_TIMEOUT = 90  # Free models can be slower

# ── Free Vision Models — Tiered by Quality ──────────────────────────
MODEL_TIERS = {
    "fast": {
        "models": [
            "mistralai/mistral-small-3.1-24b-instruct:free",
            "google/gemma-3-27b-it:free",
            "google/gemma-3-12b-it:free",
        ],
        "max_tokens": 400,
        "temperature": 0.1,
    },
    "balanced": {
        "models": [
            "qwen/qwen2.5-vl-32b-instruct:free",
            "nvidia/nemotron-nano-12b-v2-vl:free",
            "mistralai/mistral-small-3.1-24b-instruct:free",
        ],
        "max_tokens": 500,
        "temperature": 0.1,
    },
    "heavy": {
        "models": [
            "qwen/qwen2.5-vl-72b-instruct:free",
            "qwen/qwen2.5-vl-32b-instruct:free",
            "moonshotai/kimi-vl-a3b-thinking:free",
        ],
        "max_tokens": 600,
        "temperature": 0.15,
    },
}

# Text-only fallback tier (non-vision tasks: generating answers, parsing labels)
TEXT_ONLY_MODELS = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "stepfun/step-3.5-flash:free",
    "qwen/qwen3-coder:free",
]

# Auto-router — picks any available free model with vision
AUTO_ROUTER_MODEL = "openrouter/free"

# ── Tier Escalation ─────────────────────────────────────────────────
TIER_ESCALATION_RULES = {
    "fast_to_balanced": 2,   # After 2 failures on same page
    "balanced_to_heavy": 2,  # After 2 more failures
}
DEFAULT_TIER = "fast"

# ── Rate Limit Management ───────────────────────────────────────────
RATE_LIMIT_PER_MODEL_PER_DAY = 200
RATE_LIMIT_PER_MODEL_PER_MINUTE = 20
ENABLE_MODEL_ROTATION = True

# ── Agent Settings ──────────────────────────────────────────────────
MAX_STEPS = 50
MAX_CONSECUTIVE_ERRORS = 5
MAX_DOM_ELEMENTS = 40
SCREENSHOT_QUALITY = 65
SCREENSHOT_MAX_WIDTH = 1024
MAX_RETRIES_PER_STEP = 2

# ── Telegram ────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
TELEGRAM_REPLY_TIMEOUT = 3600

# ── Ollama Fallback (local) ─────────────────────────────────────────
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma2:9b")
