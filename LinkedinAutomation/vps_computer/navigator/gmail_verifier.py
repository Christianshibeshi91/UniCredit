"""Gmail verification — opens a second browser to verify email for ATS signups.

When an ATS requires email verification during signup, this module:
1. Opens a new browser tab/context
2. Logs into Gmail with stored credentials
3. Searches for the verification email from the ATS domain
4. Extracts the verification link
5. Returns the link (or clicks it in the application browser)

Supports: direct verify links, OTP codes, "confirm email" buttons.
"""
from __future__ import annotations

import asyncio
import os
import re
import time

from playwright.async_api import Page, BrowserContext

from .config import SCREENSHOT_MAX_WIDTH


# Gmail login URL
_GMAIL_URL = "https://mail.google.com"
_GMAIL_SEARCH_URL = "https://mail.google.com/mail/u/0/#search/"

# Common verification email subject patterns
_VERIFY_SUBJECT_PATTERNS = [
    "verify",
    "confirm",
    "activation",
    "email verification",
    "account confirmation",
    "complete your",
    "action required",
    "validate",
]

# Common verification link text patterns
_VERIFY_LINK_PATTERNS = [
    r"verify",
    r"confirm",
    r"activate",
    r"complete.*registration",
    r"click here",
    r"validate",
]

# OTP code patterns (6-digit codes)
_OTP_PATTERN = re.compile(r"\b(\d{6})\b")


class GmailVerifier:
    """Handles email verification by opening Gmail in a browser.

    Usage:
        verifier = GmailVerifier(gmail_email, gmail_password)
        result = await verifier.find_verification(
            browser_context,
            from_domain="myworkdayjobs.com",
        )
        # result = {"type": "link", "value": "https://...verify..."} or
        # result = {"type": "otp", "value": "123456"}
    """

    def __init__(self, gmail_email: str, gmail_password: str):
        if not gmail_email or not gmail_password:
            raise ValueError("Gmail credentials required for email verification")
        self.email = gmail_email
        self.password = gmail_password

    async def find_verification(
        self,
        context: BrowserContext,
        from_domain: str,
        max_wait_seconds: int = 120,
        poll_interval: int = 10,
    ) -> dict | None:
        """Open Gmail, find verification email, extract link or OTP.

        Args:
            context: Playwright browser context (opens Gmail in new tab).
            from_domain: Domain to search for (e.g., "workday.com").
            max_wait_seconds: How long to wait for the email to arrive.
            poll_interval: Seconds between refresh/checks.

        Returns:
            {"type": "link", "value": "https://..."} or
            {"type": "otp", "value": "123456"} or
            None if not found.
        """
        page = await context.new_page()

        try:
            # Step 1: Log into Gmail
            logged_in = await self._login_gmail(page)
            if not logged_in:
                return None

            # Step 2: Search for verification email
            search_query = f"from:{from_domain} newer_than:1h"
            search_url = _GMAIL_SEARCH_URL + search_query.replace(" ", "+")
            await page.goto(search_url, wait_until="domcontentloaded", timeout=20000)
            await asyncio.sleep(3)

            # Step 3: Poll for the email (it may not have arrived yet)
            deadline = time.time() + max_wait_seconds
            result = None

            while time.time() < deadline:
                result = await self._try_extract_verification(page)
                if result:
                    break

                # Refresh and wait
                await asyncio.sleep(poll_interval)
                await page.reload(wait_until="domcontentloaded", timeout=15000)
                await asyncio.sleep(2)

            return result

        except Exception as e:
            print(f"  [Gmail] Error: {e}")
            return None
        finally:
            try:
                await page.close()
            except Exception:
                pass

    async def verify_and_return(
        self,
        app_context: BrowserContext,
        app_page: Page,
        from_domain: str,
        max_wait_seconds: int = 120,
    ) -> bool:
        """Full flow: find verification email, click/enter it, return to app.

        Args:
            app_context: The application browser context.
            app_page: The application page to return to.
            from_domain: ATS email domain.
            max_wait_seconds: Max wait for email.

        Returns:
            True if verification was completed successfully.
        """
        result = await self.find_verification(
            app_context, from_domain, max_wait_seconds
        )

        if not result:
            print("  [Gmail] No verification email found")
            return False

        if result["type"] == "link":
            # Open verification link in a new tab
            verify_page = await app_context.new_page()
            try:
                await verify_page.goto(
                    result["value"],
                    wait_until="domcontentloaded",
                    timeout=20000,
                )
                await asyncio.sleep(3)
                print(f"  [Gmail] Clicked verification link: {result['value'][:60]}")
            finally:
                await verify_page.close()

            # Switch back to application page
            await app_page.bring_to_front()
            await app_page.reload(wait_until="domcontentloaded", timeout=15000)
            return True

        elif result["type"] == "otp":
            # OTP needs to be entered on the application page
            print(f"  [Gmail] Found OTP: {result['value']}")
            # The caller needs to handle typing the OTP
            return True

        return False

    async def _login_gmail(self, page: Page) -> bool:
        """Log into Gmail. Returns True if successful."""
        try:
            await page.goto(_GMAIL_URL, wait_until="domcontentloaded", timeout=20000)
            await asyncio.sleep(2)

            # Check if already logged in
            if "mail.google.com/mail" in page.url and "ServiceLogin" not in page.url:
                print("  [Gmail] Already logged in")
                return True

            # Enter email
            email_input = page.locator('input[type="email"]')
            if await email_input.count() > 0:
                await email_input.fill(self.email)
                await asyncio.sleep(0.5)
                # Click Next
                next_btn = page.locator('button:has-text("Next"), #identifierNext')
                await next_btn.click()
                await asyncio.sleep(3)

            # Enter password
            password_input = page.locator('input[type="password"]')
            if await password_input.count() > 0:
                await password_input.fill(self.password)
                await asyncio.sleep(0.5)
                # Click Next
                next_btn = page.locator('button:has-text("Next"), #passwordNext')
                await next_btn.click()
                await asyncio.sleep(5)

            # Check if we landed in Gmail
            if "mail.google.com/mail" in page.url:
                print("  [Gmail] Login successful")
                return True

            # May hit 2FA — can't automate that
            print(f"  [Gmail] Login may require 2FA. URL: {page.url}")
            return False

        except Exception as e:
            print(f"  [Gmail] Login failed: {e}")
            return False

    async def _try_extract_verification(self, page: Page) -> dict | None:
        """Try to find and extract verification info from Gmail inbox."""
        # Look for email rows in search results
        email_rows = page.locator("tr.zA")  # Gmail email row class
        count = await email_rows.count()

        if count == 0:
            # Try alternative selectors
            email_rows = page.locator("[role='row'][data-legacy-message-id]")
            count = await email_rows.count()

        if count == 0:
            return None

        # Click the first (most recent) email
        try:
            await email_rows.first.click()
            await asyncio.sleep(2)
        except Exception:
            return None

        # Extract email body
        body_text = await self._get_email_body(page)
        if not body_text:
            await page.go_back()
            return None

        # Strategy 1: Find verification links
        links = await page.evaluate("""
            () => {
                const body = document.querySelector('[role="list"]') ||
                             document.querySelector('.a3s') ||
                             document.querySelector('.ii.gt');
                if (!body) return [];
                return Array.from(body.querySelectorAll('a[href]'))
                    .map(a => ({ text: a.innerText.trim(), href: a.href }))
                    .filter(a => a.href && a.href.startsWith('http'));
            }
        """)

        for link in links:
            link_text = link.get("text", "").lower()
            href = link.get("href", "")
            for pattern in _VERIFY_LINK_PATTERNS:
                if re.search(pattern, link_text, re.IGNORECASE):
                    # Clean Google redirect URLs
                    href = self._clean_google_redirect(href)
                    return {"type": "link", "value": href}

            # Also check href itself for verify/confirm patterns
            if any(kw in href.lower() for kw in ["verify", "confirm", "activate", "validate"]):
                href = self._clean_google_redirect(href)
                return {"type": "link", "value": href}

        # Strategy 2: Find OTP code
        otp_match = _OTP_PATTERN.search(body_text)
        if otp_match:
            return {"type": "otp", "value": otp_match.group(1)}

        # Strategy 3: Large button-like links (many ATS emails have big CTAs)
        for link in links:
            href = link.get("href", "")
            if len(href) > 50 and any(
                kw in href.lower() for kw in ["token", "code", "key", "hash", "confirm"]
            ):
                href = self._clean_google_redirect(href)
                return {"type": "link", "value": href}

        return None

    async def _get_email_body(self, page: Page) -> str:
        """Extract the visible text of the currently open email."""
        try:
            body = await page.evaluate("""
                () => {
                    const el = document.querySelector('.a3s.aiL') ||
                               document.querySelector('.a3s') ||
                               document.querySelector('[role="list"]');
                    return el ? el.innerText : '';
                }
            """)
            return body or ""
        except Exception:
            return ""

    @staticmethod
    def _clean_google_redirect(url: str) -> str:
        """Strip Google's redirect wrapper from URLs."""
        if "google.com/url?" in url:
            match = re.search(r"[?&]q=([^&]+)", url)
            if match:
                from urllib.parse import unquote
                return unquote(match.group(1))
        return url
