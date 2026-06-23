"""Vision module — screenshot capture and DOM element extraction.

Captures page screenshots as base64 JPEG and extracts interactive
DOM elements with numeric IDs for the brain to reference.
"""

import base64
import io
import re

from .config import (
    MAX_DOM_ELEMENTS,
    SCREENSHOT_QUALITY,
    SCREENSHOT_MAX_WIDTH,
)

# Interactive element selectors
_INTERACTIVE_SELECTORS = [
    "a[href]",
    "button",
    "input:not([type='hidden'])",
    "select",
    "textarea",
    "[role='button']",
    "[role='link']",
    "[role='tab']",
    "[role='menuitem']",
    "[role='checkbox']",
    "[role='radio']",
    "[role='combobox']",
    "[role='option']",
    "[contenteditable='true']",
    "label[for]",
    "[onclick]",
    "[tabindex]:not([tabindex='-1'])",
]

# Cookie banner / overlay selectors (for DISMISS action)
_OVERLAY_SELECTORS = [
    "[class*='cookie']",
    "[id*='cookie']",
    "[class*='consent']",
    "[id*='consent']",
    "[class*='gdpr']",
    "[class*='overlay']",
    "[class*='modal']",
    "[role='dialog']",
    "[role='alertdialog']",
    "[class*='popup']",
    "[class*='banner']",
]

# CAPTCHA indicators
_CAPTCHA_PATTERNS = [
    "captcha",
    "recaptcha",
    "hcaptcha",
    "turnstile",
    "challenge",
    "cf-challenge",
]


async def capture_screenshot(page) -> str:
    """Capture a JPEG screenshot and return as base64 string."""
    try:
        raw = await page.screenshot(type="jpeg", quality=SCREENSHOT_QUALITY)
    except Exception:
        raw = await page.screenshot(type="png")

    # Resize if needed to reduce tokens
    try:
        from PIL import Image

        img = Image.open(io.BytesIO(raw))
        w, h = img.size
        if w > SCREENSHOT_MAX_WIDTH:
            ratio = SCREENSHOT_MAX_WIDTH / w
            img = img.resize(
                (SCREENSHOT_MAX_WIDTH, int(h * ratio)), Image.LANCZOS
            )
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=SCREENSHOT_QUALITY)
            raw = buf.getvalue()
    except ImportError:
        pass  # Pillow not available, send original

    return base64.b64encode(raw).decode("utf-8")


async def extract_dom_elements(page, max_elements: int = MAX_DOM_ELEMENTS) -> dict:
    """Extract interactive DOM elements with numeric IDs.

    Returns:
        {
            "elements": [
                {"id": 0, "tag": "button", "type": None, "label": "Sign In",
                 "disabled": False, "selector": "button.login-btn"},
                ...
            ],
            "headings": ["Create Account", "Sign In"],
            "alerts": ["Invalid email address"],
        }
    """
    selector = ", ".join(_INTERACTIVE_SELECTORS)

    elements = await page.evaluate(
        """(args) => {
            const [selector, maxElements] = args;
            const els = document.querySelectorAll(selector);
            const results = [];
            const seen = new Set();

            for (const el of els) {
                if (results.length >= maxElements) break;

                // Skip invisible elements
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 && rect.height === 0) continue;

                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden') continue;
                if (parseFloat(style.opacity) === 0) continue;

                // Build label from multiple sources
                const ariaLabel = el.getAttribute('aria-label') || '';
                const placeholder = el.getAttribute('placeholder') || '';
                const innerText = (el.innerText || '').trim().substring(0, 80);
                const title = el.getAttribute('title') || '';
                const value = el.value || '';
                const name = el.getAttribute('name') || '';
                const alt = el.getAttribute('alt') || '';

                let label = ariaLabel || innerText || placeholder || title || alt || name || value;
                label = label.replace(/\\s+/g, ' ').trim().substring(0, 100);

                // Deduplicate by label + tag
                const key = el.tagName + ':' + label.toLowerCase();
                if (seen.has(key) && label) continue;
                if (label) seen.add(key);

                // Build a robust CSS selector
                let cssSelector = '';
                if (el.id) {
                    cssSelector = '#' + CSS.escape(el.id);
                } else if (el.getAttribute('data-testid')) {
                    cssSelector = `[data-testid="${CSS.escape(el.getAttribute('data-testid'))}"]`;
                } else if (el.getAttribute('name')) {
                    cssSelector = `${el.tagName.toLowerCase()}[name="${CSS.escape(el.getAttribute('name'))}"]`;
                } else if (ariaLabel) {
                    cssSelector = `${el.tagName.toLowerCase()}[aria-label="${CSS.escape(ariaLabel)}"]`;
                } else {
                    // Fallback: tag + nth-of-type
                    const parent = el.parentElement;
                    if (parent) {
                        const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
                        const idx = siblings.indexOf(el) + 1;
                        cssSelector = `${el.tagName.toLowerCase()}:nth-of-type(${idx})`;
                    }
                }

                results.push({
                    tag: el.tagName.toLowerCase(),
                    type: el.getAttribute('type') || null,
                    label: label || `(${el.tagName.toLowerCase()})`,
                    disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
                    selector: cssSelector,
                    href: el.getAttribute('href') || null,
                    // Bounding box for click targets
                    x: Math.round(rect.x + rect.width / 2),
                    y: Math.round(rect.y + rect.height / 2),
                    visible: rect.top < window.innerHeight && rect.bottom > 0,
                    // Options for select elements
                    options: el.tagName === 'SELECT'
                        ? Array.from(el.options).map(o => o.text.trim()).filter(Boolean).slice(0, 10)
                        : null,
                });
            }
            return results;
        }""",
        [selector, max_elements],
    )

    # Assign numeric IDs
    for i, el in enumerate(elements):
        el["id"] = i

    # Extract headings
    headings = await page.evaluate(
        """() => {
            return Array.from(document.querySelectorAll('h1, h2, h3'))
                .map(h => h.innerText.trim())
                .filter(t => t.length > 0 && t.length < 200)
                .slice(0, 10);
        }"""
    )

    # Extract alert/error messages
    alerts = await page.evaluate(
        """() => {
            const selectors = [
                '[role="alert"]',
                '[class*="error"]',
                '[class*="warning"]',
                '[class*="danger"]',
                '.alert',
                '.notification',
            ];
            return Array.from(document.querySelectorAll(selectors.join(',')))
                .map(el => el.innerText.trim())
                .filter(t => t.length > 0 && t.length < 200)
                .slice(0, 5);
        }"""
    )

    return {
        "elements": elements,
        "headings": headings,
        "alerts": alerts,
    }


async def detect_overlay(page) -> bool:
    """Check if there's a modal/overlay/cookie banner blocking the page."""
    return await page.evaluate(
        """(selectors) => {
            for (const sel of selectors) {
                const els = document.querySelectorAll(sel);
                for (const el of els) {
                    const rect = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    if (rect.width > 100 && rect.height > 50
                        && style.display !== 'none'
                        && style.visibility !== 'hidden') {
                        return true;
                    }
                }
            }
            return false;
        }""",
        _OVERLAY_SELECTORS,
    )


async def detect_captcha(page) -> bool:
    """Check if a CAPTCHA challenge is present."""
    html = await page.content()
    html_lower = html.lower()
    return any(p in html_lower for p in _CAPTCHA_PATTERNS)


async def get_page_state(page) -> dict:
    """Capture full page state: screenshot + DOM + metadata."""
    screenshot_b64 = await capture_screenshot(page)
    dom_elements = await extract_dom_elements(page)
    has_overlay = await detect_overlay(page)
    has_captcha = await detect_captcha(page)

    return {
        "screenshot_b64": screenshot_b64,
        "dom_elements": dom_elements,
        "metadata": {
            "url": page.url,
            "title": await page.title(),
            "has_overlay": has_overlay,
            "has_captcha": has_captcha,
        },
    }
