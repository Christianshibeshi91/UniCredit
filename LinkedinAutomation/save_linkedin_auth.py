"""Persist and restore Playwright browser authentication state for LinkedIn."""

import json
import os

from LinkedinAutomation.anti_detect import get_random_ua, get_viewport  # pyre-ignore[21]
from LinkedinAutomation.apply_security import restrict_file_permissions  # pyre-ignore[21]

AUTH_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "linkedin_auth.json")


async def save_auth(context) -> None:
    """Dump Playwright browser context storage state to linkedin_auth.json.
    File is written with owner-only read/write permissions (0o600)."""
    state = await context.storage_state()
    with open(AUTH_PATH, "w") as f:
        json.dump(state, f, indent=2)
    restrict_file_permissions(AUTH_PATH)


async def load_auth(browser, viewport=None, user_agent=None):
    """Create a new Playwright browser context with saved cookies.

    Args:
        browser: Playwright browser instance.
        viewport: Optional viewport dict. Defaults to randomized viewport.
        user_agent: Optional UA string. Defaults to randomized UA.
    """
    if not os.path.exists(AUTH_PATH):
        raise FileNotFoundError(
            f"No saved auth found at {AUTH_PATH}. Run vps_headless_login.py first."
        )
    context = await browser.new_context(
        storage_state=AUTH_PATH,
        viewport=viewport or get_viewport(),
        user_agent=user_agent or get_random_ua(),
    )
    return context


if __name__ == "__main__":
    print(f"Auth file exists: {os.path.exists(AUTH_PATH)}")
    if os.path.exists(AUTH_PATH):
        with open(AUTH_PATH) as f:
            data = json.load(f)
        cookies = data.get("cookies", [])
        print(f"Saved cookies: {len(cookies)}")
    print("save_linkedin_auth module OK")
