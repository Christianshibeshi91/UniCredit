"""Workflow replayer — replays recorded workflows on new applications.

Takes a learned workflow and executes it, using the AI brain as fallback
when the page doesn't match the recording exactly (different element IDs,
dynamic content, etc.).
"""
from __future__ import annotations

import asyncio
import random
import re

from playwright.async_api import Page

from .recorder import Workflow, RecordedAction
from .brain import FreeModelBrain
from .vision import get_page_state
from .memory import NavigationMemory
from .validator import validate_action
from .goal_detector import detect_application_form


class WorkflowReplayer:
    """Replays a recorded workflow, using the brain for deviations.

    Usage:
        replayer = WorkflowReplayer(workflow, brain)
        result = await replayer.replay(page, user_data)
    """

    def __init__(self, workflow: Workflow, brain: FreeModelBrain):
        self.workflow = workflow
        self.brain = brain
        self.memory = NavigationMemory()
        self._step_index = 0

    async def replay(
        self,
        page: Page,
        user_data: dict | None = None,
        max_deviations: int = 10,
    ) -> dict:
        """Replay the workflow on the given page.

        Args:
            page: Playwright page (already navigated to start URL).
            user_data: Dict of user info for filling forms (overrides recorded values).
            max_deviations: Max times the brain can take over before aborting.

        Returns:
            {"success": bool, "reason": str, "steps_replayed": int, "steps_brain": int}
        """
        user_data = user_data or {}
        replayed = 0
        brain_steps = 0
        deviations = 0

        for i, recorded_action in enumerate(self.workflow.actions):
            self._step_index = i

            # Skip navigation actions (we follow the flow, don't force URLs)
            if recorded_action.type == "navigate":
                continue

            # Check if we've reached the goal
            try:
                state = await get_page_state(page)
                goal = detect_application_form(state)
                if goal["is_application_form"] and goal["confidence"] >= 0.7:
                    return {
                        "success": True,
                        "reason": "goal_reached",
                        "steps_replayed": replayed,
                        "steps_brain": brain_steps,
                    }
            except Exception:
                pass

            # Try to replay the recorded action
            success = await self._try_replay_action(page, recorded_action, user_data)

            if success:
                replayed += 1
                self.memory.record_step(
                    i, page.url,
                    {"action": recorded_action.type.upper(), "id": None, "text": recorded_action.value, "think": "replay"},
                    {"success": True, "error": None},
                )
                # Wait for page to settle
                await asyncio.sleep(random.uniform(0.5, 1.5))
                try:
                    await page.wait_for_load_state("domcontentloaded", timeout=5000)
                except Exception:
                    pass
                continue

            # Replay failed — ask the brain
            deviations += 1
            if deviations > max_deviations:
                return {
                    "success": False,
                    "reason": f"Too many deviations ({deviations})",
                    "steps_replayed": replayed,
                    "steps_brain": brain_steps,
                }

            # Brain takes over for this step
            brain_result = await self._brain_step(page, recorded_action)
            brain_steps += 1

            if brain_result.get("action") == "DONE":
                return {
                    "success": True,
                    "reason": "goal_reached_by_brain",
                    "steps_replayed": replayed,
                    "steps_brain": brain_steps,
                }

            if brain_result.get("action") == "HELP":
                return {
                    "success": False,
                    "reason": f"help_needed: {brain_result.get('think', '')}",
                    "steps_replayed": replayed,
                    "steps_brain": brain_steps,
                }

        return {
            "success": True,
            "reason": "workflow_completed",
            "steps_replayed": replayed,
            "steps_brain": brain_steps,
        }

    async def _try_replay_action(
        self, page: Page, action: RecordedAction, user_data: dict
    ) -> bool:
        """Try to replay a single recorded action. Returns True if successful."""
        try:
            if action.type == "click":
                return await self._replay_click(page, action)
            elif action.type == "input":
                return await self._replay_input(page, action, user_data)
            elif action.type == "select":
                return await self._replay_select(page, action, user_data)
            elif action.type == "file_upload":
                return await self._replay_upload(page, action, user_data)
            elif action.type == "scroll":
                await page.evaluate(f"window.scrollTo(0, {action.scroll_y})")
                return True
            elif action.type == "keypress" and action.key == "Enter":
                await page.keyboard.press("Enter")
                return True
            else:
                return True  # Unknown action types are skipped as success
        except Exception:
            return False

    async def _replay_click(self, page: Page, action: RecordedAction) -> bool:
        """Click using the recorded selector, with fallbacks."""
        # Strategy 1: Exact selector
        if action.selector:
            try:
                el = page.locator(action.selector)
                if await el.count() > 0 and await el.first.is_visible():
                    await el.first.click(timeout=3000)
                    return True
            except Exception:
                pass

        # Strategy 2: Text match
        if action.label:
            try:
                el = page.locator(f"text={action.label}")
                if await el.count() > 0:
                    await el.first.click(timeout=3000)
                    return True
            except Exception:
                pass

            # Partial text
            try:
                el = page.get_by_text(action.label[:30], exact=False)
                if await el.count() > 0:
                    await el.first.click(timeout=3000)
                    return True
            except Exception:
                pass

        # Strategy 3: Coordinates
        if action.x and action.y:
            try:
                await page.mouse.click(action.x, action.y)
                return True
            except Exception:
                pass

        return False

    async def _replay_input(
        self, page: Page, action: RecordedAction, user_data: dict
    ) -> bool:
        """Type into a field using recorded selector, with user_data overrides."""
        value = self._resolve_value(action, user_data)
        if not value:
            return True  # Empty value = skip

        # Try selector
        if action.selector:
            try:
                el = page.locator(action.selector)
                if await el.count() > 0:
                    await el.first.click(timeout=3000)
                    await el.first.fill("")
                    await el.first.type(value, delay=random.randint(30, 80))
                    return True
            except Exception:
                pass

        # Try by label/placeholder
        if action.label:
            try:
                el = page.get_by_label(action.label, exact=False)
                if await el.count() > 0:
                    await el.first.fill("")
                    await el.first.type(value, delay=random.randint(30, 80))
                    return True
            except Exception:
                pass

            try:
                el = page.get_by_placeholder(action.label, exact=False)
                if await el.count() > 0:
                    await el.first.fill("")
                    await el.first.type(value, delay=random.randint(30, 80))
                    return True
            except Exception:
                pass

        return False

    async def _replay_select(
        self, page: Page, action: RecordedAction, user_data: dict
    ) -> bool:
        """Select a dropdown option."""
        value = action.option_text or action.value or ""
        if not value:
            return True

        if action.selector:
            try:
                await page.select_option(action.selector, label=value, timeout=3000)
                return True
            except Exception:
                pass
            try:
                await page.select_option(action.selector, value=action.value or "", timeout=3000)
                return True
            except Exception:
                pass

        return False

    async def _replay_upload(
        self, page: Page, action: RecordedAction, user_data: dict
    ) -> bool:
        """Upload a file (resume)."""
        resume_path = user_data.get("resume_path", "")
        if not resume_path:
            return False

        if action.selector:
            try:
                await page.set_input_files(action.selector, resume_path)
                return True
            except Exception:
                pass

        # Try any file input on the page
        try:
            file_input = page.locator('input[type="file"]')
            if await file_input.count() > 0:
                await file_input.first.set_input_files(resume_path)
                return True
        except Exception:
            pass

        return False

    async def _brain_step(self, page: Page, failed_action: RecordedAction) -> dict:
        """Let the brain handle a step where replay failed."""
        state = await get_page_state(page)

        extra = (
            f"I was trying to do: {failed_action.type} on '{failed_action.label}' "
            f"(selector: {failed_action.selector}) but the element wasn't found. "
            f"Find the equivalent element on this page and perform the same action."
        )

        decision = await self.brain.decide_next_action(
            page_state=state,
            memory_context=self.memory.build_context(),
            extra_context=extra,
        )

        # Execute the brain's decision
        if decision.get("action") in ("DONE", "HELP", "WAIT"):
            return decision

        from .actions import execute_action
        elements = state["dom_elements"].get("elements", [])
        result = await execute_action(page, decision, elements)

        self.memory.record_step(
            self._step_index, page.url, decision, result,
            decision.get("_model"),
        )

        return decision

    def _resolve_value(self, action: RecordedAction, user_data: dict) -> str:
        """Resolve the value to type, using user_data overrides for PII fields."""
        label_lower = (action.label or "").lower()

        # Map field labels to user_data keys
        field_map = {
            "email": ["email", "e-mail", "email address"],
            "first_name": ["first name", "first", "given name"],
            "last_name": ["last name", "last", "surname", "family name"],
            "phone": ["phone", "mobile", "telephone", "cell"],
            "city": ["city"],
            "state": ["state", "province"],
            "zip": ["zip", "postal", "zip code", "postal code"],
            "country": ["country"],
            "address": ["address", "street"],
            "linkedin": ["linkedin"],
        }

        for data_key, patterns in field_map.items():
            if any(p in label_lower for p in patterns):
                override = user_data.get(data_key)
                if override:
                    return override

        # Password fields — use stored password
        if "password" in label_lower:
            return user_data.get("password", action.value or "")

        # Default: use the recorded value
        return action.value or ""
