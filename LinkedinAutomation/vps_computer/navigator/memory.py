"""Step memory — tracks navigation history for context building.

Provides the brain with a sliding window of recent actions and their
outcomes so it can avoid repeating failed actions and understand
where it is in the flow.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Step:
    """A single navigation step."""

    step_num: int
    url: str
    action: str
    element_id: Optional[int]
    text: Optional[str]
    think: str
    success: bool
    error: Optional[str]
    model: Optional[str] = None

    def to_line(self) -> str:
        status = "OK" if self.success else f"FAIL({self.error})"
        parts = [f"#{self.step_num}", self.action]
        if self.element_id is not None:
            parts.append(f"id={self.element_id}")
        if self.text:
            parts.append(f'"{self.text[:30]}"')
        parts.append(f"-> {status}")
        return " ".join(parts)


@dataclass
class NavigationMemory:
    """Tracks the full navigation history for a single job application."""

    steps: list[Step] = field(default_factory=list)
    _failed_actions: set = field(default_factory=set)
    _visited_urls: list[str] = field(default_factory=list)
    max_context_steps: int = 15

    def record_step(
        self,
        step_num: int,
        url: str,
        action: dict,
        result: dict,
        model: str | None = None,
    ):
        """Record a completed step."""
        step = Step(
            step_num=step_num,
            url=url,
            action=action.get("action", ""),
            element_id=action.get("id"),
            text=action.get("text"),
            think=action.get("think", ""),
            success=result.get("success", False),
            error=result.get("error"),
            model=model,
        )
        self.steps.append(step)

        # Track failures for repeat detection
        if not step.success:
            key = f"{step.action}:{step.element_id}:{step.text}"
            self._failed_actions.add(key)

        # Track URL changes
        if not self._visited_urls or self._visited_urls[-1] != url:
            self._visited_urls.append(url)

    def build_context(self) -> str:
        """Build a context string from recent steps for the brain."""
        recent = self.steps[-self.max_context_steps :]
        if not recent:
            return "(no previous actions)"

        lines = [s.to_line() for s in recent]
        return "\n".join(lines)

    def is_action_previously_failed(self, action: str, element_id: int | None, text: str | None) -> bool:
        """Check if this exact action was already tried and failed."""
        key = f"{action}:{element_id}:{text}"
        return key in self._failed_actions

    def consecutive_failures(self) -> int:
        """Count how many steps in a row have failed."""
        count = 0
        for step in reversed(self.steps):
            if step.success:
                break
            count += 1
        return count

    def consecutive_same_url(self) -> int:
        """Count how many steps have been on the same URL (stuck detection)."""
        if not self.steps:
            return 0
        current_url = self.steps[-1].url
        count = 0
        for step in reversed(self.steps):
            if step.url == current_url:
                count += 1
            else:
                break
        return count

    def has_url_been_visited(self, url: str) -> bool:
        return url in self._visited_urls

    def step_count(self) -> int:
        return len(self.steps)

    def get_summary(self) -> dict:
        """Summary stats for reporting."""
        successes = sum(1 for s in self.steps if s.success)
        failures = sum(1 for s in self.steps if not s.success)
        actions_used = set(s.action for s in self.steps)
        return {
            "total_steps": len(self.steps),
            "successes": successes,
            "failures": failures,
            "unique_urls": len(set(self._visited_urls)),
            "actions_used": sorted(actions_used),
        }
