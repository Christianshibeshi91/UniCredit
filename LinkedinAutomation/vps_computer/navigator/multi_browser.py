"""Multi-browser manager — coordinates application browser + email browser.

Handles the common ATS signup flow:
1. Fill signup form on ATS site (application browser)
2. ATS sends verification email
3. Open Gmail in same context (new tab) to find verification
4. Click verification link or extract OTP
5. Return to application browser and continue

Also supports persistent Gmail sessions via stored cookies.
"""
from __future__ import annotations

import asyncio
import json
import os

from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from .config import SCREENSHOT_MAX_WIDTH
from .gmail_verifier import GmailVerifier

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
_GMAIL_STATE_PATH = os.path.join(BASE_DIR, ".tmp", "gmail_state.json")


class MultiBrowserManager:
    """Manages multiple browser contexts for application + email verification.

    Usage:
        mgr = MultiBrowserManager(gmail_email, gmail_password)
        await mgr.start()

        # Application flow
        app_page = await mgr.open_application("https://jobs.example.com/apply")
        # ... fill form, hit "create account" ...

        # Verification flow
        verified = await mgr.verify_email("example.com")

        # Back to application
        await mgr.focus_application()

        await mgr.close()
    """

    def __init__(
        self,
        gmail_email: str,
        gmail_password: str,
        headless: bool = False,
    ):
        self.gmail_email = gmail_email
        self.gmail_password = gmail_password
        self.headless = headless
        self._pw = None
        self._browser: Browser | None = None
        self._app_context: BrowserContext | None = None
        self._app_page: Page | None = None
        self._gmail_verifier: GmailVerifier | None = None

    async def start(self):
        """Launch browser and create application context."""
        self._pw = await async_playwright().start()
        self._browser = await self._pw.chromium.launch(
            headless=self.headless,
            args=["--disable-blink-features=AutomationControlled"],
        )

        # Application context
        self._app_context = await self._browser.new_context(
            viewport={"width": SCREENSHOT_MAX_WIDTH, "height": 768},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
        )

        # Gmail verifier
        self._gmail_verifier = GmailVerifier(
            self.gmail_email, self.gmail_password
        )

    async def open_application(self, url: str) -> Page:
        """Open the job application URL in the application browser."""
        if not self._app_context:
            raise RuntimeError("Call start() first")

        self._app_page = await self._app_context.new_page()
        await self._app_page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(2)
        return self._app_page

    @property
    def app_page(self) -> Page | None:
        return self._app_page

    @property
    def app_context(self) -> BrowserContext | None:
        return self._app_context

    async def verify_email(
        self,
        from_domain: str,
        max_wait_seconds: int = 120,
    ) -> dict | None:
        """Open Gmail in a new tab, find verification email, return result.

        The Gmail tab opens in the SAME browser context so cookies/sessions
        are shared, allowing the verification link to work in the same session.

        Returns:
            {"type": "link", "value": "..."} or {"type": "otp", "value": "..."} or None
        """
        if not self._gmail_verifier or not self._app_context:
            return None

        print("\n  [Multi] Opening Gmail for email verification...")
        result = await self._gmail_verifier.find_verification(
            self._app_context,
            from_domain=from_domain,
            max_wait_seconds=max_wait_seconds,
        )

        if result:
            print(f"  [Multi] Found: {result['type']} = {str(result['value'])[:60]}")
        else:
            print("  [Multi] No verification email found")

        return result

    async def verify_and_return(
        self,
        from_domain: str,
        max_wait_seconds: int = 120,
    ) -> bool:
        """Full verification flow: find email, click link, return to app.

        Returns True if verification completed.
        """
        if not self._gmail_verifier or not self._app_context or not self._app_page:
            return False

        return await self._gmail_verifier.verify_and_return(
            app_context=self._app_context,
            app_page=self._app_page,
            from_domain=from_domain,
            max_wait_seconds=max_wait_seconds,
        )

    async def enter_otp_on_app(self, otp: str, selector: str | None = None) -> bool:
        """Type an OTP code into the application page.

        If selector is None, tries to find the OTP input automatically.
        """
        if not self._app_page:
            return False

        try:
            if selector:
                await self._app_page.fill(selector, otp)
                return True

            # Auto-detect OTP input fields
            otp_selectors = [
                'input[name*="code"]',
                'input[name*="otp"]',
                'input[name*="verify"]',
                'input[name*="token"]',
                'input[placeholder*="code"]',
                'input[placeholder*="digit"]',
                'input[type="tel"][maxlength="6"]',
                'input[maxlength="6"]',
                'input[autocomplete="one-time-code"]',
            ]

            for sel in otp_selectors:
                el = self._app_page.locator(sel)
                if await el.count() > 0 and await el.first.is_visible():
                    await el.first.fill(otp)
                    print(f"  [Multi] Entered OTP via: {sel}")
                    return True

            print("  [Multi] Could not find OTP input field")
            return False

        except Exception as e:
            print(f"  [Multi] OTP entry failed: {e}")
            return False

    async def focus_application(self):
        """Bring the application page to focus."""
        if self._app_page:
            await self._app_page.bring_to_front()

    async def get_all_pages(self) -> list[Page]:
        """Get all open pages in the application context."""
        if not self._app_context:
            return []
        return self._app_context.pages

    async def close_extra_tabs(self):
        """Close all tabs except the main application page."""
        if not self._app_context or not self._app_page:
            return
        for pg in self._app_context.pages:
            if pg != self._app_page:
                try:
                    await pg.close()
                except Exception:
                    pass

    async def save_gmail_state(self):
        """Save Gmail cookies for faster future logins."""
        if not self._app_context:
            return
        try:
            cookies = await self._app_context.cookies(["https://mail.google.com"])
            gmail_cookies = [c for c in cookies if "google" in c.get("domain", "")]
            if gmail_cookies:
                os.makedirs(os.path.dirname(_GMAIL_STATE_PATH), exist_ok=True)
                with open(_GMAIL_STATE_PATH, "w") as f:
                    json.dump(gmail_cookies, f)
                print(f"  [Multi] Saved Gmail cookies ({len(gmail_cookies)} cookies)")
        except Exception as e:
            print(f"  [Multi] Could not save Gmail state: {e}")

    async def restore_gmail_state(self):
        """Restore saved Gmail cookies to skip login."""
        if not self._app_context or not os.path.exists(_GMAIL_STATE_PATH):
            return False
        try:
            with open(_GMAIL_STATE_PATH, "r") as f:
                cookies = json.load(f)
            if cookies:
                await self._app_context.add_cookies(cookies)
                print(f"  [Multi] Restored {len(cookies)} Gmail cookies")
                return True
        except Exception as e:
            print(f"  [Multi] Could not restore Gmail state: {e}")
        return False

    async def close(self):
        """Clean up all browser resources."""
        try:
            if self._app_context:
                await self._app_context.close()
        except Exception:
            pass
        try:
            if self._browser:
                await self._browser.close()
        except Exception:
            pass
        try:
            if self._pw:
                await self._pw.stop()
        except Exception:
            pass
