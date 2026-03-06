"""Headless LinkedIn login to refresh session cookies."""

import asyncio
import os
from playwright.async_api import async_playwright
from dotenv import load_dotenv
from LinkedinAutomation.save_linkedin_auth import save_auth, AUTH_PATH
from LinkedinAutomation.alert_user import alert

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))


async def _login_async():
    email = os.getenv("LINKEDIN_EMAIL")
    password = os.getenv("LINKEDIN_PASSWORD")
    if not email or not password:
        alert("Login Error", "LINKEDIN_EMAIL and LINKEDIN_PASSWORD must be in .env", "error")
        return False

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0",
        )
        page = await context.new_page()
        try:
            await page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)
            await page.fill("input#username", email)
            await page.wait_for_timeout(500)
            await page.fill("input#password", password)
            await page.wait_for_timeout(500)
            await page.click("button[type='submit']")
            await page.wait_for_timeout(5000)

            if "checkpoint" in page.url or "challenge" in page.url:
                alert("Verification Required", "Complete verification in the browser.", "warning")
                input("Complete verification, then press ENTER...")
                await page.wait_for_timeout(3000)

            if "feed" in page.url or "mynetwork" in page.url:
                await save_auth(context)
                alert("Login Success", f"Session saved to {AUTH_PATH}")
                await browser.close()
                return True
            else:
                ss = os.path.join(BASE_DIR, ".tmp", "login_debug.png")
                os.makedirs(os.path.dirname(ss), exist_ok=True)
                await page.screenshot(path=ss)
                alert("Login Failed", f"URL: {page.url}. Screenshot: {ss}", "error")
        except Exception as e:
            alert("Login Error", str(e), "error")
        await browser.close()
        return False


def login():
    return asyncio.run(_login_async())


if __name__ == "__main__":
    success = login()
    print(f"Login {'successful' if success else 'failed'}")
