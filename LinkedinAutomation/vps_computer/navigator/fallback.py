"""Fallback strategies — error recovery for the navigation agent.

Handles stuck loops, repeated failures, CAPTCHAs, and exhausted
model quotas. Provides escalation paths to keep the agent moving.
"""

import asyncio

from .config import MAX_CONSECUTIVE_ERRORS, TIER_ESCALATION_RULES


class FallbackHandler:
    """Manages error recovery and fallback strategies."""

    def __init__(self, brain, memory):
        self.brain = brain
        self.memory = memory
        self._page_failure_count = 0

    def assess_situation(self, page_state: dict, action_result: dict) -> dict:
        """Assess the current situation and recommend a recovery strategy.

        Returns:
            {
                "strategy": str,  # "continue" | "escalate_tier" | "scroll_explore"
                                  # | "go_back" | "help" | "abort"
                "reason": str,
                "extra_context": str,  # Additional context for the brain
            }
        """
        consecutive_failures = self.memory.consecutive_failures()
        same_url_count = self.memory.consecutive_same_url()
        has_captcha = page_state.get("metadata", {}).get("has_captcha", False)
        step_count = self.memory.step_count()

        # CAPTCHA detected — need human
        if has_captcha:
            return {
                "strategy": "help",
                "reason": "CAPTCHA detected — requires human intervention",
                "extra_context": "CAPTCHA DETECTED. You cannot solve this. Use HELP action.",
            }

        # Too many consecutive failures — escalate tier
        if consecutive_failures >= TIER_ESCALATION_RULES.get("fast_to_balanced", 2):
            self._page_failure_count += 1

            if self._page_failure_count <= 2:
                if self.brain.escalate_tier():
                    return {
                        "strategy": "escalate_tier",
                        "reason": f"{consecutive_failures} failures — escalating to {self.brain.current_tier} tier",
                        "extra_context": (
                            f"WARNING: {consecutive_failures} actions failed in a row. "
                            "Try a completely different approach. "
                            "Look for alternative buttons, links, or navigation paths."
                        ),
                    }

            # Already escalated and still failing
            if self._page_failure_count > 4:
                return {
                    "strategy": "go_back",
                    "reason": "Persistent failures after escalation — going back",
                    "extra_context": "Too many failures on this page. Use BACK to try a different path.",
                }

        # Stuck on same URL too long
        if same_url_count > 8:
            return {
                "strategy": "scroll_explore",
                "reason": f"Stuck on same URL for {same_url_count} steps",
                "extra_context": (
                    "You have been on this page too long without progress. "
                    "Try SCROLL(down) to find hidden elements, or BACK to try another path."
                ),
            }

        # Too many total steps — approaching limit
        if step_count > 40:
            return {
                "strategy": "help",
                "reason": f"Approaching step limit ({step_count}/50)",
                "extra_context": "Running out of steps. If you can see the application form, say DONE. Otherwise HELP.",
            }

        # Max errors reached
        if consecutive_failures >= MAX_CONSECUTIVE_ERRORS:
            return {
                "strategy": "abort",
                "reason": f"Max consecutive errors reached ({MAX_CONSECUTIVE_ERRORS})",
                "extra_context": "",
            }

        # Reset page failure count on success
        if action_result.get("success"):
            self._page_failure_count = 0

        return {
            "strategy": "continue",
            "reason": "Normal operation",
            "extra_context": "",
        }

    def reset(self):
        """Reset fallback state for a new job."""
        self._page_failure_count = 0
