"""Goal detector — determines when the application form has been reached.

Checks both DOM heuristics and brain DONE signal. This double-check
prevents false positives from less accurate free models.
"""

import re

# Patterns that indicate we've reached an application form
_APPLY_FORM_INDICATORS = [
    # File upload
    r'input\[type=["\']?file',
    r"upload.*resume",
    r"attach.*resume",
    r"upload.*cv",
    # Form sections
    r"work\s*experience",
    r"employment\s*history",
    r"education\s*history",
    r"personal\s*information",
    r"contact\s*information",
    # Submit buttons
    r"submit\s*application",
    r"apply\s*now",
    r"send\s*application",
    r"complete\s*application",
    # Cover letter
    r"cover\s*letter",
    r"additional\s*documents",
]

# Headings that confirm we're on an application page
_APPLY_HEADINGS = [
    "apply",
    "application",
    "submit your",
    "your application",
    "job application",
    "upload resume",
    "personal details",
    "work experience",
    "employment history",
]

# URL patterns for known ATS apply pages
_APPLY_URL_PATTERNS = [
    r"/apply",
    r"/application",
    r"/jobs/.+/apply",
    r"/careers/.+/apply",
    r"myworkdayjobs\.com.*/apply",
    r"boards\.greenhouse\.io.*/applications",
    r"lever\.co.*/apply",
    r"icims\.com.*/apply",
    r"smartrecruiters\.com.*/apply",
    r"taleo\.net.*/apply",
]


def detect_application_form(page_state: dict) -> dict:
    """Check if the current page is a job application form.

    Returns:
        {
            "is_application_form": bool,
            "confidence": float (0.0 - 1.0),
            "signals": list[str],
        }
    """
    signals = []
    score = 0.0

    metadata = page_state.get("metadata", {})
    dom = page_state.get("dom_elements", {})
    elements = dom.get("elements", [])
    headings = dom.get("headings", [])
    url = metadata.get("url", "").lower()
    title = metadata.get("title", "").lower()

    # 1. Check URL patterns (strong signal)
    for pattern in _APPLY_URL_PATTERNS:
        if re.search(pattern, url, re.IGNORECASE):
            score += 0.3
            signals.append(f"URL matches apply pattern: {pattern}")
            break

    # 2. Check page title
    for heading in _APPLY_HEADINGS:
        if heading in title:
            score += 0.15
            signals.append(f"Title contains: {heading}")
            break

    # 3. Check headings
    for h in headings:
        h_lower = h.lower()
        for heading in _APPLY_HEADINGS:
            if heading in h_lower:
                score += 0.15
                signals.append(f"Heading: {h}")
                break

    # 4. Check for file upload input (resume upload = strong signal)
    for el in elements:
        if el.get("tag") == "input" and el.get("type") == "file":
            score += 0.35
            signals.append("File upload input found")
            break

    # 5. Check element labels for apply-form indicators
    all_labels = " ".join(el.get("label", "") for el in elements).lower()
    for pattern in _APPLY_FORM_INDICATORS:
        if re.search(pattern, all_labels, re.IGNORECASE):
            score += 0.1
            signals.append(f"Element matches: {pattern}")
            if score >= 1.0:
                break

    # 6. Check for submit application button
    for el in elements:
        label = el.get("label", "").lower()
        if el.get("tag") in ("button", "input") and any(
            kw in label
            for kw in ["submit application", "apply now", "send application", "complete application"]
        ):
            score += 0.25
            signals.append(f"Submit button: {el['label']}")
            break

    confidence = min(1.0, score)
    is_form = confidence >= 0.5

    return {
        "is_application_form": is_form,
        "confidence": round(confidence, 2),
        "signals": signals,
    }


def should_brain_done_be_trusted(page_state: dict) -> bool:
    """When the brain says DONE, verify with heuristics.

    Free models sometimes hallucinate DONE prematurely.
    Require at least one heuristic signal to confirm.
    """
    result = detect_application_form(page_state)
    return result["confidence"] >= 0.3
