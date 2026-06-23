"""Action validator — sanity-checks brain decisions before execution.

Catches hallucinated element IDs, impossible actions, and repeated
failures. Critical for free models which have lower accuracy.
"""
from __future__ import annotations


def validate_action(action: dict, dom_elements: list, memory) -> dict:
    """Validate an action before execution.

    Args:
        action: Brain decision dict.
        dom_elements: Current DOM elements from vision.
        memory: NavigationMemory instance.

    Returns:
        {"valid": bool, "reason": str, "action": dict}
        If invalid, may return a corrected action.
    """
    action_name = action.get("action", "").upper()
    element_id = action.get("id")
    text = action.get("text")

    # Actions that don't need element validation
    if action_name in ("SCROLL", "WAIT", "BACK", "DONE", "HELP", "DISMISS"):
        return _valid(action)

    # CLICK, TYPE, SELECT need a valid element ID
    if action_name in ("CLICK", "TYPE", "SELECT"):
        if element_id is None:
            return _invalid(action, f"{action_name} requires an element id")

        # Check element exists in current DOM
        el = _find_by_id(element_id, dom_elements)
        if not el:
            # Hallucinated ID — try to find closest match by label
            corrected = _fuzzy_match_element(action, dom_elements)
            if corrected:
                return {
                    "valid": True,
                    "reason": f"Corrected id {element_id} -> {corrected['id']} (fuzzy match)",
                    "action": {**action, "id": corrected["id"]},
                }
            return _invalid(action, f"Element id={element_id} does not exist on page")

        # Check element is not disabled
        if el.get("disabled"):
            return _invalid(action, f"Element id={element_id} is disabled")

        # Check element is visible
        if not el.get("visible", True):
            return _invalid(
                action,
                f"Element id={element_id} is not visible (scroll first?)",
            )

    # TYPE and SELECT need text
    if action_name == "TYPE" and not text:
        return _invalid(action, "TYPE requires text to type")

    if action_name == "SELECT" and not text:
        return _invalid(action, "SELECT requires an option to select")

    # Check for repeated failed action
    if memory and memory.is_action_previously_failed(action_name, element_id, text):
        return _invalid(
            action,
            f"This exact action already failed: {action_name} id={element_id}",
        )

    return _valid(action)


def _find_by_id(element_id: int, dom_elements: list) -> dict | None:
    for el in dom_elements:
        if el.get("id") == element_id:
            return el
    return None


def _fuzzy_match_element(action: dict, dom_elements: list) -> dict | None:
    """Try to find the element the model meant, based on the think text."""
    think = action.get("think", "").lower()
    action_name = action.get("action", "")
    text = (action.get("text") or "").lower()

    best_match = None
    best_score = 0

    for el in dom_elements:
        if el.get("disabled"):
            continue

        label = el.get("label", "").lower()
        tag = el.get("tag", "")
        score = 0

        # Score by label appearing in think text
        if label and label in think:
            score += 3
        if text and text in label:
            score += 2

        # Boost matching element types
        if action_name == "CLICK" and tag in ("button", "a"):
            score += 1
        if action_name == "TYPE" and tag in ("input", "textarea"):
            score += 1
        if action_name == "SELECT" and tag == "select":
            score += 1

        if score > best_score:
            best_score = score
            best_match = el

    # Only return if we have reasonable confidence
    return best_match if best_score >= 2 else None


def _valid(action: dict) -> dict:
    return {"valid": True, "reason": "OK", "action": action}


def _invalid(action: dict, reason: str) -> dict:
    return {"valid": False, "reason": reason, "action": action}
