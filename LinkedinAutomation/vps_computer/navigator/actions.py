"""Action executor — translates brain decisions into Playwright operations.

Executes CLICK, TYPE, SELECT, SCROLL, DISMISS, WAIT, BACK on the browser page.
Returns success/failure status for each action.
"""
from __future__ import annotations

import asyncio
import random


async def execute_action(page, action: dict, dom_elements: list) -> dict:
    """Execute a single action on the page.

    Args:
        page: Playwright page object.
        action: Brain decision dict with action/id/text keys.
        dom_elements: List of DOM elements from vision.extract_dom_elements().

    Returns:
        {"success": bool, "error": str | None, "details": str}
    """
    action_name = action.get("action", "").upper()
    element_id = action.get("id")
    text = action.get("text")

    try:
        if action_name == "CLICK":
            return await _do_click(page, element_id, dom_elements)

        elif action_name == "TYPE":
            return await _do_type(page, element_id, text, dom_elements)

        elif action_name == "SELECT":
            return await _do_select(page, element_id, text, dom_elements)

        elif action_name == "SCROLL":
            return await _do_scroll(page, text)

        elif action_name == "DISMISS":
            return await _do_dismiss(page, dom_elements)

        elif action_name == "WAIT":
            await asyncio.sleep(2)
            return _ok("Waited 2 seconds")

        elif action_name == "BACK":
            await page.go_back(timeout=10000)
            await page.wait_for_load_state("domcontentloaded", timeout=10000)
            return _ok("Navigated back")

        elif action_name == "DONE":
            return _ok("Goal reached — application form detected")

        elif action_name == "HELP":
            return _ok(f"Human help requested: {text or 'unknown reason'}")

        else:
            return _fail(f"Unknown action: {action_name}")

    except Exception as e:
        return _fail(str(e))


async def _do_click(page, element_id: int | None, dom_elements: list) -> dict:
    """Click an element by its numeric ID."""
    if element_id is None:
        return _fail("CLICK requires an element id")

    el = _find_element(element_id, dom_elements)
    if not el:
        return _fail(f"Element id={element_id} not found")

    if el.get("disabled"):
        return _fail(f"Element id={element_id} is disabled")

    selector = el.get("selector", "")
    try:
        # Try CSS selector first
        if selector:
            await page.click(selector, timeout=5000)
            await _human_delay()
            return _ok(f"Clicked [{element_id}] {el['label'][:50]}")
    except Exception:
        pass

    # Fallback: click by coordinates
    x, y = el.get("x", 0), el.get("y", 0)
    if x and y:
        try:
            await page.mouse.click(x, y)
            await _human_delay()
            return _ok(f"Clicked [{element_id}] at ({x},{y})")
        except Exception as e:
            return _fail(f"Click failed at ({x},{y}): {e}")

    return _fail(f"Could not click element id={element_id}")


async def _do_type(page, element_id: int | None, text: str | None, dom_elements: list) -> dict:
    """Type text into a field."""
    if element_id is None:
        return _fail("TYPE requires an element id")
    if not text:
        return _fail("TYPE requires text")

    el = _find_element(element_id, dom_elements)
    if not el:
        return _fail(f"Element id={element_id} not found")

    selector = el.get("selector", "")
    try:
        if selector:
            # Clear existing content first
            await page.click(selector, timeout=5000)
            await page.fill(selector, "")
            # Type with human-like delays
            await page.type(selector, text, delay=random.randint(30, 80))
            await _human_delay()
            return _ok(f"Typed into [{element_id}] {el['label'][:40]}")
    except Exception:
        pass

    # Fallback: click coordinates then type
    x, y = el.get("x", 0), el.get("y", 0)
    if x and y:
        try:
            await page.mouse.click(x, y)
            await asyncio.sleep(0.3)
            # Select all and replace
            await page.keyboard.press("Control+a")
            await page.keyboard.type(text, delay=random.randint(30, 80))
            await _human_delay()
            return _ok(f"Typed into [{element_id}] at ({x},{y})")
        except Exception as e:
            return _fail(f"Type failed: {e}")

    return _fail(f"Could not type into element id={element_id}")


async def _do_select(page, element_id: int | None, text: str | None, dom_elements: list) -> dict:
    """Select an option from a dropdown."""
    if element_id is None:
        return _fail("SELECT requires an element id")
    if not text:
        return _fail("SELECT requires option text")

    el = _find_element(element_id, dom_elements)
    if not el:
        return _fail(f"Element id={element_id} not found")

    selector = el.get("selector", "")
    if not selector:
        return _fail(f"No selector for element id={element_id}")

    try:
        # Try by visible text (label)
        await page.select_option(selector, label=text, timeout=5000)
        await _human_delay()
        return _ok(f"Selected '{text}' in [{element_id}]")
    except Exception:
        pass

    try:
        # Try by value
        await page.select_option(selector, value=text, timeout=5000)
        await _human_delay()
        return _ok(f"Selected value '{text}' in [{element_id}]")
    except Exception:
        pass

    # Fallback: click the select, then click the option text
    try:
        x, y = el.get("x", 0), el.get("y", 0)
        if x and y:
            await page.mouse.click(x, y)
            await asyncio.sleep(0.5)
            # Try to find and click the option
            option_selector = f"option:has-text('{text}')"
            await page.click(option_selector, timeout=3000)
            return _ok(f"Selected '{text}' via click in [{element_id}]")
    except Exception as e:
        return _fail(f"Select failed: {e}")

    return _fail(f"Could not select '{text}' in element id={element_id}")


async def _do_scroll(page, direction: str | None) -> dict:
    """Scroll the page up or down."""
    direction = (direction or "down").lower()
    pixels = 500 if direction == "down" else -500

    await page.evaluate(f"window.scrollBy(0, {pixels})")
    await asyncio.sleep(0.5)
    return _ok(f"Scrolled {direction}")


async def _do_dismiss(page, dom_elements: list) -> dict:
    """Try to dismiss overlays, modals, cookie banners."""
    # Strategy 1: Look for common dismiss buttons
    dismiss_patterns = [
        "accept", "agree", "got it", "ok", "close", "dismiss",
        "i understand", "continue", "allow", "decline", "reject",
        "no thanks", "not now", "skip", "x",
    ]

    for el in dom_elements:
        label_lower = el.get("label", "").lower().strip()
        tag = el.get("tag", "")

        # Match dismiss-like buttons
        if tag in ("button", "a") or el.get("type") == "button":
            for pattern in dismiss_patterns:
                if pattern in label_lower:
                    selector = el.get("selector", "")
                    try:
                        if selector:
                            await page.click(selector, timeout=3000)
                        else:
                            x, y = el.get("x", 0), el.get("y", 0)
                            if x and y:
                                await page.mouse.click(x, y)
                        await asyncio.sleep(1)
                        return _ok(f"Dismissed: clicked '{el['label'][:40]}'")
                    except Exception:
                        continue

    # Strategy 2: Press Escape
    try:
        await page.keyboard.press("Escape")
        await asyncio.sleep(0.5)
        return _ok("Dismissed: pressed Escape")
    except Exception:
        pass

    return _fail("Could not find dismiss target")


def _find_element(element_id: int, dom_elements: list) -> dict | None:
    """Find an element by its numeric ID."""
    for el in dom_elements:
        if el.get("id") == element_id:
            return el
    return None


async def _human_delay():
    """Random delay to appear human."""
    await asyncio.sleep(random.uniform(0.3, 1.0))


def _ok(details: str) -> dict:
    return {"success": True, "error": None, "details": details}


def _fail(error: str) -> dict:
    return {"success": False, "error": error, "details": ""}
