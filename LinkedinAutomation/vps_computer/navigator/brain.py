"""Free-model brain with rate-limit rotation across OpenRouter vision models.

Primary: Free OpenRouter vision models (Qwen VL, Mistral Small, Gemma 3).
Fallback: Text-only free models for non-vision tasks.
Handles 20 req/min and 200 req/day limits via automatic model rotation.
"""
from __future__ import annotations

import asyncio
import json
import re
import time
from collections import defaultdict

from openai import AsyncOpenAI

from .config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    OPENROUTER_TIMEOUT,
    MODEL_TIERS,
    DEFAULT_TIER,
    TEXT_ONLY_MODELS,
    AUTO_ROUTER_MODEL,
    RATE_LIMIT_PER_MODEL_PER_DAY,
    RATE_LIMIT_PER_MODEL_PER_MINUTE,
    MAX_RETRIES_PER_STEP,
)


SYSTEM_PROMPT = """You are a browser automation agent. Goal: reach the job application form.

You see a screenshot and a list of page elements. Pick ONE action.

ACTIONS:
- CLICK(id) — click element by id number
- TYPE(id, "text") — type into a field
- SELECT(id, "option") — pick dropdown option
- SCROLL(down/up) — scroll page
- DISMISS() — close popup/banner/modal/cookie consent
- WAIT — wait for loading
- BACK — go back
- DONE — reached the application form (resume upload, work experience, submit application visible)
- HELP(reason) — stuck, need human

RULES:
- Cookie banners/popups → DISMISS first
- Login form + credentials given → TYPE email, TYPE password, CLICK submit
- Signup form → fill required fields with user info
- See resume upload / cover letter / work experience / "Submit Application" → DONE
- Never repeat a failed action — try something different
- If stuck, try scrolling to find hidden elements

Respond with ONLY this JSON:
{"think":"brief observation","action":"ACTION","id":NUM_OR_NULL,"text":"TEXT_OR_NULL"}

Examples:
{"think":"Cookie banner visible","action":"DISMISS","id":null,"text":null}
{"think":"Typing email into login","action":"TYPE","id":5,"text":"user@email.com"}
{"think":"Resume upload visible, this is the apply form","action":"DONE","id":null,"text":null}
{"think":"Clicking Next button","action":"CLICK","id":12,"text":null}"""


class RateLimitTracker:
    """Track per-model usage to stay within free tier limits."""

    def __init__(self):
        self.daily_counts: dict[str, int] = defaultdict(int)
        self.minute_windows: dict[str, list[float]] = defaultdict(list)
        self.day_start = time.time()

    def _reset_if_new_day(self):
        if time.time() - self.day_start > 86400:
            self.daily_counts.clear()
            self.day_start = time.time()

    def _clean_minute_window(self, model: str):
        now = time.time()
        self.minute_windows[model] = [
            t for t in self.minute_windows[model] if now - t < 60
        ]

    def can_use(self, model: str) -> bool:
        self._reset_if_new_day()
        self._clean_minute_window(model)
        if self.daily_counts[model] >= RATE_LIMIT_PER_MODEL_PER_DAY:
            return False
        if len(self.minute_windows[model]) >= RATE_LIMIT_PER_MODEL_PER_MINUTE:
            return False
        return True

    def record_use(self, model: str):
        self._reset_if_new_day()
        self.daily_counts[model] += 1
        self.minute_windows[model].append(time.time())

    def seconds_until_minute_available(self, model: str) -> float:
        self._clean_minute_window(model)
        if len(self.minute_windows[model]) < RATE_LIMIT_PER_MODEL_PER_MINUTE:
            return 0
        oldest = min(self.minute_windows[model])
        return max(0, 60 - (time.time() - oldest))

    def get_usage_stats(self) -> dict:
        self._reset_if_new_day()
        return {
            model: {
                "daily": count,
                "remaining": RATE_LIMIT_PER_MODEL_PER_DAY - count,
            }
            for model, count in self.daily_counts.items()
        }


class FreeModelBrain:
    """Reasoning engine using ONLY free OpenRouter models.

    Handles rate limit rotation across multiple free vision models.
    Tier escalation: fast -> balanced -> heavy when stuck.
    """

    def __init__(self, user_profile: dict, credential_store=None, answer_kb=None):
        self.user_profile = user_profile
        self.credential_store = credential_store
        self.answer_kb = answer_kb
        self.current_tier = DEFAULT_TIER
        self.current_model_index = 0
        self.rate_tracker = RateLimitTracker()
        self.total_calls = 0

        self.client = AsyncOpenAI(
            base_url=OPENROUTER_BASE_URL,
            api_key=OPENROUTER_API_KEY,
            timeout=OPENROUTER_TIMEOUT,
            default_headers={
                "HTTP-Referer": "https://github.com/linkedin-automation",
                "X-Title": "Job Application Agent",
            },
        )

    @property
    def current_model(self) -> str:
        tier = MODEL_TIERS[self.current_tier]
        idx = min(self.current_model_index, len(tier["models"]) - 1)
        return tier["models"][idx]

    def _find_available_model(self) -> str | None:
        """Find a model within rate limits. Tries current tier, then others."""
        # Current tier first
        tier = MODEL_TIERS[self.current_tier]
        for i, model in enumerate(tier["models"]):
            if self.rate_tracker.can_use(model):
                self.current_model_index = i
                return model

        # Other tiers
        for tier_name in ["fast", "balanced", "heavy"]:
            if tier_name == self.current_tier:
                continue
            for model in MODEL_TIERS[tier_name]["models"]:
                if self.rate_tracker.can_use(model):
                    self.current_tier = tier_name
                    self.current_model_index = MODEL_TIERS[tier_name]["models"].index(model)
                    return model

        # Last resort: auto-router
        if self.rate_tracker.can_use(AUTO_ROUTER_MODEL):
            return AUTO_ROUTER_MODEL

        return None

    def escalate_tier(self) -> bool:
        if self.current_tier == "fast":
            self.current_tier = "balanced"
            self.current_model_index = 0
            return True
        elif self.current_tier == "balanced":
            self.current_tier = "heavy"
            self.current_model_index = 0
            return True
        return False

    def reset_tier(self):
        self.current_tier = DEFAULT_TIER
        self.current_model_index = 0

    async def decide_next_action(
        self,
        page_state: dict,
        memory_context: str,
        extra_context: str = "",
    ) -> dict:
        """Send page state to a free vision model and get an action decision."""
        user_prompt = self._build_user_prompt(page_state, memory_context, extra_context)

        for attempt in range(MAX_RETRIES_PER_STEP + 1):
            model = self._find_available_model()

            if model is None:
                # All exhausted — wait for shortest minute window
                min_wait = float("inf")
                best_model = None
                for tier in MODEL_TIERS.values():
                    for m in tier["models"]:
                        wait = self.rate_tracker.seconds_until_minute_available(m)
                        if wait < min_wait:
                            min_wait = wait
                            best_model = m

                if best_model and min_wait < 65:
                    await asyncio.sleep(min_wait + 1)
                    model = best_model
                else:
                    return _wait_action("All free models rate-limited. Waiting...")

            try:
                raw_response = await self._call_openrouter(
                    screenshot_b64=page_state.get("screenshot_b64", ""),
                    user_prompt=user_prompt,
                    model=model,
                )

                self.rate_tracker.record_use(model)
                self.total_calls += 1

                decision = self._parse_response(raw_response)
                if decision:
                    decision["_model"] = model
                    return decision

                # Parse failed — nudge
                if attempt < MAX_RETRIES_PER_STEP:
                    user_prompt += (
                        "\n\nYour last response was not valid JSON. "
                        "Respond with ONLY the JSON object. No markdown. No backticks."
                    )

            except Exception as e:
                error_str = str(e)

                if "429" in error_str:
                    self.rate_tracker.record_use(model)
                    await asyncio.sleep(3)
                    continue

                if "503" in error_str or "unavailable" in error_str.lower():
                    self.rate_tracker.daily_counts[model] = RATE_LIMIT_PER_MODEL_PER_DAY
                    continue

                if attempt < MAX_RETRIES_PER_STEP:
                    await asyncio.sleep(2)
                    continue

                return _wait_action(f"API error: {error_str[:200]}")

        return _wait_action("Failed to get valid response after retries")

    async def _call_openrouter(
        self, screenshot_b64: str, user_prompt: str, model: str
    ) -> str:
        """Call OpenRouter with a free vision model."""
        tier_config = MODEL_TIERS.get(self.current_tier, MODEL_TIERS["fast"])

        content_parts = [{"type": "text", "text": user_prompt}]
        if screenshot_b64:
            content_parts.insert(
                0,
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{screenshot_b64}",
                    },
                },
            )

        response = await self.client.chat.completions.create(
            model=model,
            max_tokens=tier_config["max_tokens"],
            temperature=tier_config["temperature"],
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content_parts},
            ],
        )

        return (response.choices[0].message.content or "").strip()

    async def decide_text_only(self, prompt: str) -> str:
        """Use a free text-only model for non-vision tasks.

        Saves vision model quota for screenshot analysis.
        """
        for model in TEXT_ONLY_MODELS:
            if not self.rate_tracker.can_use(model):
                continue
            try:
                response = await self.client.chat.completions.create(
                    model=model,
                    max_tokens=300,
                    temperature=0.1,
                    messages=[{"role": "user", "content": prompt}],
                )
                self.rate_tracker.record_use(model)
                return (response.choices[0].message.content or "").strip()
            except Exception:
                continue
        return ""

    def _build_user_prompt(
        self, page_state: dict, memory_context: str, extra_context: str
    ) -> str:
        metadata = page_state.get("metadata", {})
        dom = page_state.get("dom_elements", {})

        elements_lines = []
        for el in dom.get("elements", []):
            disabled = " [DISABLED]" if el.get("disabled") else ""
            el_type = f" type={el['type']}" if el.get("type") else ""
            elements_lines.append(
                f"[{el['id']}] <{el['tag']}{el_type}> {el['label']}{disabled}"
            )
        elements_text = "\n".join(elements_lines) or "(no elements)"

        headings = ", ".join(dom.get("headings", [])) or "(none)"
        alerts = "; ".join(dom.get("alerts", [])) or "(none)"

        cred_text = ""
        if self.credential_store:
            creds = self.credential_store.get(metadata.get("url", ""))
            if creds:
                cred_text = f"LOGIN: email={creds['email']}, password={creds['password']}"
            else:
                cred_text = (
                    f"NO ACCOUNT. Signup email: {self.user_profile.get('email', '')}"
                )

        up = self.user_profile
        user_line = (
            f"{up.get('first_name', '')} {up.get('last_name', '')}, "
            f"{up.get('email', '')}, {up.get('phone', '')}, "
            f"{up.get('city', '')}, {up.get('state', '')}, "
            f"{up.get('country', 'United States')}"
        )

        return (
            f"URL: {metadata.get('url', '')}\n"
            f"Title: {metadata.get('title', '')}\n"
            f"Overlay: {metadata.get('has_overlay', False)}\n"
            f"CAPTCHA: {metadata.get('has_captcha', False)}\n\n"
            f"Headings: {headings}\n"
            f"Alerts: {alerts}\n\n"
            f"Elements:\n{elements_text}\n\n"
            f"History:\n{memory_context[-600:]}\n\n"
            f"{cred_text}\n\n"
            f"User: {user_line}\n\n"
            f"{extra_context}\n\n"
            f"Next action? ONLY JSON."
        )

    @staticmethod
    def _parse_response(raw: str) -> dict | None:
        """Parse model output into action dict. Handles quirks from various free models."""
        if not raw or not raw.strip():
            return None

        text = raw.strip()

        # Strip markdown code blocks
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            parts = text.split("```")
            for part in parts:
                s = part.strip()
                if s.startswith("{"):
                    text = s
                    break

        # Extract JSON object
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            text = text[start : end + 1]
        else:
            return None

        # Fix trailing commas
        text = re.sub(r",\s*}", "}", text)
        text = re.sub(r",\s*]", "]", text)

        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            action_match = re.search(r'"action"\s*:\s*"(\w+)"', text)
            id_match = re.search(r'"id"\s*:\s*(\d+|null)', text)
            text_match = re.search(r'"text"\s*:\s*"([^"]*)"', text)
            think_match = re.search(r'"think"\s*:\s*"([^"]*)"', text)

            if action_match:
                parsed = {
                    "think": think_match.group(1) if think_match else "",
                    "action": action_match.group(1),
                    "id": (
                        int(id_match.group(1))
                        if id_match and id_match.group(1) != "null"
                        else None
                    ),
                    "text": text_match.group(1) if text_match else None,
                }
            else:
                return None

        if "action" not in parsed:
            return None

        # Normalize action names across different models
        action = parsed["action"].upper().strip()
        action_map = {
            "CLICK": "CLICK",
            "TYPE": "TYPE",
            "INPUT": "TYPE",
            "FILL": "TYPE",
            "ENTER": "TYPE",
            "SELECT": "SELECT",
            "CHOOSE": "SELECT",
            "PICK": "SELECT",
            "SCROLL": "SCROLL",
            "SCROLL_DOWN": "SCROLL",
            "SCROLL_UP": "SCROLL",
            "DISMISS": "DISMISS",
            "DISMISS_OVERLAY": "DISMISS",
            "CLOSE": "DISMISS",
            "CLOSE_MODAL": "DISMISS",
            "ACCEPT": "DISMISS",
            "ACCEPT_COOKIES": "DISMISS",
            "WAIT": "WAIT",
            "LOADING": "WAIT",
            "BACK": "BACK",
            "GO_BACK": "BACK",
            "NAVIGATE_BACK": "BACK",
            "DONE": "DONE",
            "GOAL_REACHED": "DONE",
            "COMPLETE": "DONE",
            "FOUND": "DONE",
            "HELP": "HELP",
            "ESCALATE": "HELP",
            "STUCK": "HELP",
        }
        parsed["action"] = action_map.get(action, action)

        # Normalize id
        if "id" in parsed and parsed["id"] is not None:
            try:
                parsed["id"] = int(parsed["id"])
            except (ValueError, TypeError):
                parsed["id"] = None

        # Handle scroll direction
        if parsed["action"] == "SCROLL" and not parsed.get("text"):
            think = parsed.get("think", "").lower()
            parsed["text"] = "up" if "up" in think else "down"

        return parsed

    def get_stats(self) -> dict:
        return {
            "total_calls": self.total_calls,
            "cost": "$0.00 (all free models)",
            "current_tier": self.current_tier,
            "current_model": self.current_model,
            "model_usage": self.rate_tracker.get_usage_stats(),
        }


def _wait_action(reason: str) -> dict:
    return {"think": reason, "action": "WAIT", "id": None, "text": None}
