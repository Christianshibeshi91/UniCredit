"""Anti-detection utilities for LinkedIn automation.

Provides human-like delays, User-Agent rotation, viewport randomization,
stealth JS injection, human-like typing, and random browsing to avoid
detection by LinkedIn and HR tools.
"""

import asyncio
import random
import math

# --- Human-like delay distributions ---

_DELAY_PROFILES = {
    "page_load": (4.0, 1.2),       # mean ~4s, stddev 1.2s
    "click": (0.8, 0.3),            # mean ~0.8s
    "type_char": (0.08, 0.03),      # mean ~80ms per char
    "between_fields": (1.5, 0.5),   # between form fields
    "between_jobs": (45.0, 15.0),   # between job applications
    "coffee_break": (180.0, 60.0),  # ~3 min break
    "scroll": (1.2, 0.4),           # scroll pause
    "read_page": (6.0, 2.0),        # reading a page
}


def get_human_delay(action="click"):
    """Return a human-like delay in seconds using Gaussian distribution.

    Always returns a positive value (clamped to min 0.05s).
    """
    mean, stddev = _DELAY_PROFILES.get(action, (1.0, 0.3))
    delay = random.gauss(mean, stddev)
    return max(0.05, delay)


def get_human_delay_ms(action="click"):
    """Return human-like delay in milliseconds (for Playwright wait_for_timeout)."""
    return int(get_human_delay(action) * 1000)


# --- User-Agent rotation ---

_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
]


def get_random_ua():
    """Return a random realistic Chrome User-Agent string."""
    return random.choice(_USER_AGENTS)


# --- Viewport randomization ---

def get_viewport():
    """Return a randomized but realistic viewport dict for Playwright."""
    width = random.randint(1280, 1920)
    # Keep aspect ratio roughly 16:9 to 16:10
    height = random.randint(int(width * 0.52), int(width * 0.65))
    return {"width": width, "height": height}


# --- Human-like typing ---

async def type_like_human(page, selector, text):
    """Type text character by character with human-like inter-key delays.

    Simulates realistic typing speed with occasional pauses.
    """
    element = await page.query_selector(selector)
    if not element:
        return

    # Click the field first
    await element.click()
    await asyncio.sleep(get_human_delay("click"))

    # Clear existing content
    await element.fill("")
    await asyncio.sleep(0.1)

    for i, char in enumerate(text):
        await page.keyboard.type(char)
        delay = get_human_delay("type_char")

        # Occasional longer pause (like thinking)
        if random.random() < 0.05:
            delay += random.uniform(0.2, 0.6)

        # Slight pause after spaces
        if char == " ":
            delay += random.uniform(0.02, 0.08)

        await asyncio.sleep(delay)


# --- Human-like mouse movement and click ---

async def move_and_click(page, selector):
    """Move mouse to element's bounding box then click (not teleport)."""
    element = await page.query_selector(selector)
    if not element:
        return False

    box = await element.bounding_box()
    if not box:
        return False

    # Random point within the element
    target_x = box["x"] + random.uniform(box["width"] * 0.2, box["width"] * 0.8)
    target_y = box["y"] + random.uniform(box["height"] * 0.2, box["height"] * 0.8)

    # Move mouse with human-like speed
    await page.mouse.move(target_x, target_y, steps=random.randint(5, 15))
    await asyncio.sleep(get_human_delay("click"))
    await page.mouse.click(target_x, target_y)

    return True


# --- Stealth JS injection ---

_STEALTH_JS = """
// Remove webdriver flag
Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined
});

// Override chrome.runtime to look real
window.chrome = {
    runtime: {
        onMessage: { addListener: function() {} },
        sendMessage: function() {}
    }
};

// Realistic plugins
Object.defineProperty(navigator, 'plugins', {
    get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' }
    ]
});

// Realistic languages
Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en']
});

// Prevent detection via permissions API
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications' ?
    Promise.resolve({ state: Notification.permission }) :
    originalQuery(parameters)
);

// Override iframe contentWindow
const originalAttachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function() {
    return originalAttachShadow.apply(this, arguments);
};
"""


async def apply_stealth(page):
    """Inject stealth JavaScript to avoid bot detection."""
    await page.add_init_script(_STEALTH_JS)


async def apply_stealth_to_context(context):
    """Apply stealth JS to all pages in a browser context."""
    await context.add_init_script(_STEALTH_JS)


# --- Random browsing (between applications) ---

async def random_browse(page):
    """Simulate casual LinkedIn browsing between job applications.

    Scrolls feed, maybe visits a profile — makes the session look natural.
    """
    actions = random.choice(["scroll_feed", "visit_feed", "scroll_page"])

    if actions == "scroll_feed":
        await page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded")
        await asyncio.sleep(get_human_delay("page_load"))

        # Scroll down a few times
        for _ in range(random.randint(2, 5)):
            scroll_amount = random.randint(300, 700)
            await page.evaluate(f"window.scrollBy(0, {scroll_amount})")
            await asyncio.sleep(get_human_delay("scroll"))

    elif actions == "visit_feed":
        await page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded")
        await asyncio.sleep(get_human_delay("read_page"))

    else:
        # Just scroll current page
        for _ in range(random.randint(1, 3)):
            scroll_amount = random.randint(200, 500)
            await page.evaluate(f"window.scrollBy(0, {scroll_amount})")
            await asyncio.sleep(get_human_delay("scroll"))


if __name__ == "__main__":
    print(f"Human delay (click): {get_human_delay('click'):.3f}s")
    print(f"Human delay (page_load): {get_human_delay('page_load'):.3f}s")
    print(f"Human delay (between_jobs): {get_human_delay('between_jobs'):.1f}s")
    print(f"Random UA: {get_random_ua()}")
    print(f"Viewport: {get_viewport()}")
    print("anti_detect module loaded OK")
