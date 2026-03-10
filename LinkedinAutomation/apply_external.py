"""Extract external application URLs from LinkedIn job postings.

Uses web_scraper's stealth BrowserEngine for authenticated access to job pages,
with fast requests-based fallback for simple cases.
"""

import asyncio
import json
import os
import re
import html as html_mod

import requests  # pyre-ignore[21]
from dotenv import load_dotenv  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.apply_security import sanitize_url  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)


def _extract_from_html(text):
    """Try multiple strategies to find external apply URL in HTML."""
    external_url = ""

    # Strategy 1: applyUrl in embedded JSON
    apply_m = re.search(r'"applyUrl"\s*:\s*"(https?://[^"]+)"', text)
    if apply_m:
        url = html_mod.unescape(apply_m.group(1))
        if "linkedin.com" not in url:
            external_url = url

    # Strategy 2: companyApplyUrl (LinkedIn's external apply redirect)
    if not external_url:
        m = re.search(r'"companyApplyUrl"\s*:\s*"(https?://[^"]+)"', text)
        if m:
            url = html_mod.unescape(m.group(1))
            if "linkedin.com" not in url:
                external_url = url

    # Strategy 3: externalApplyLink in page data
    if not external_url:
        m = re.search(r'"externalApply(?:Link|Url)"\s*:\s*"(https?://[^"]+)"', text)
        if m:
            url = html_mod.unescape(m.group(1))
            if "linkedin.com" not in url:
                external_url = url

    # Strategy 4: Apply button/link pointing to external site
    if not external_url:
        apply_link_m = re.search(
            r'<a[^>]*href="(https?://(?!.*linkedin\.com)[^"]+)"[^>]*>'
            r'[^<]*(?:[Aa]pply|[Ss]ubmit)',
            text,
        )
        if apply_link_m:
            external_url = html_mod.unescape(apply_link_m.group(1))

    # Strategy 5: ATS platform links
    if not external_url:
        ats_keywords = (
            "workday", "greenhouse", "lever", "icims", "taleo",
            "jobvite", "smartrecruiters", "bamboohr", "ashbyhq",
            "career", "apply", "talent", "jobs.lever.co",
            "boards.greenhouse.io", "myworkdayjobs",
        )
        for match in re.finditer(r'href="(https?://[^"]+)"', text):
            url = html_mod.unescape(match.group(1))
            if "linkedin.com" in url:
                continue
            if any(kw in url.lower() for kw in ats_keywords):
                external_url = url
                break

    return external_url


def _extract_requests(job_url):
    """Fast requests-based extraction (no browser needed)."""
    if not sanitize_url(job_url):
        alert("External Apply", "Blocked unsafe job URL", "error")
        return ""
    li_at = os.getenv("LINKEDIN_LI_AT", "")

    # Authenticated attempt
    if li_at:
        try:
            cookies = {"li_at": li_at, "JSESSIONID": "ajax:0"}
            headers = {
                "User-Agent": _UA,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Csrf-Token": "ajax:0",
            }
            r = requests.get(job_url, headers=headers, cookies=cookies, timeout=15)
            if r.status_code == 200:
                url = _extract_from_html(r.text)
                if url:
                    return url
        except Exception as e:
            alert("External Apply", f"Requests auth failed: {e}", "warning")

    # Public fallback
    try:
        r = requests.get(job_url, headers={"User-Agent": _UA}, timeout=15)
        if r.status_code == 200:
            return _extract_from_html(r.text)
    except Exception as e:
        alert("External Apply", f"Requests public failed: {e}", "warning")

    return ""


async def _extract_browser(job_url):
    """Stealth browser extraction using web_scraper BrowserEngine.

    Uses full fingerprint spoofing, LinkedIn cookie injection, and
    CAPTCHA detection — much more reliable than plain requests.
    """
    from web_scraper.browser import BrowserEngine  # pyre-ignore[21]

    li_at = os.getenv("LINKEDIN_LI_AT", "")
    engine = BrowserEngine(headless=True, block_resources=True)

    try:
        page = await engine.start()

        # Inject LinkedIn cookies if available
        if li_at:
            await engine.context.add_cookies([
                {
                    "name": "li_at",
                    "value": li_at,
                    "domain": ".linkedin.com",
                    "path": "/",
                    "httpOnly": True,
                    "secure": True,
                },
                {
                    "name": "JSESSIONID",
                    "value": '"ajax:0"',
                    "domain": ".linkedin.com",
                    "path": "/",
                    "httpOnly": False,
                    "secure": True,
                },
            ])

        # Navigate with CAPTCHA detection
        success = await engine.goto(job_url, wait_until="domcontentloaded")
        if not success:
            alert("External Apply", "Browser navigation failed (CAPTCHA?)", "warning")
            return ""

        await engine.human_delay(1.0, 2.5)

        # Get page content
        html = await page.content()
        external_url = _extract_from_html(html)

        if external_url:
            return external_url

        # Strategy 6 (browser-only): Click the Apply button and intercept redirect
        apply_btn = await page.query_selector(
            "button[aria-label*='Apply'], "
            "a[data-tracking-control-name*='apply'], "
            ".jobs-apply-button, "
            "a.apply-button"
        )
        if apply_btn:
            try:
                async with page.expect_popup(timeout=5000) as popup_info:
                    await apply_btn.click()
                popup = await popup_info.value
                popup_url = popup.url
                if popup_url and "linkedin.com" not in popup_url:
                    external_url = popup_url
                    await popup.close()
                    return external_url
            except Exception:
                pass

            # Check if page itself navigated
            await engine.human_delay(1.0, 2.0)
            current_url = page.url
            if current_url and "linkedin.com" not in current_url:
                return current_url

            # Re-check page content after button click (may have loaded modal)
            html = await page.content()
            external_url = _extract_from_html(html)

        return external_url or ""

    except Exception as e:
        alert("External Apply", f"Browser extraction failed: {e}", "warning")
        return ""
    finally:
        try:
            await engine.close()
        except Exception:
            pass


def extract_url(job):
    """Extract the external application URL from a LinkedIn job posting.

    Pipeline:
    1. Fast requests-based extraction (li_at cookie + public fallback)
    2. Stealth browser extraction via web_scraper BrowserEngine

    Returns only URLs that pass SSRF checks (http/https, no private IPs).
    """
    job_url = (job.get("job_url") or "").strip()
    if not job_url:
        alert("External Apply", "No job URL provided", "warning")
        return ""
    if not sanitize_url(job_url):
        alert("External Apply", "Blocked unsafe job URL", "error")
        return ""

    # --- Fast path: requests-based ---
    external_url = _extract_requests(job_url)
    if external_url:
        external_url = sanitize_url(external_url) or ""
        if external_url:
            alert("External Apply", f"Found (requests): {external_url}")
            return external_url

    # --- Slow path: stealth browser ---
    alert("External Apply", "Requests failed, trying stealth browser...")
    try:
        external_url = asyncio.run(_extract_browser(job_url))
    except Exception as e:
        alert("External Apply", f"Browser fallback failed: {e}", "warning")
        external_url = ""

    if external_url:
        external_url = sanitize_url(external_url) or ""
    if external_url:
        alert("External Apply", f"Found (browser): {external_url}")
    else:
        alert("External Apply", f"No external URL found. Check: {job_url}", "warning")

    return external_url or ""


if __name__ == "__main__":
    print("apply_external module loaded OK")
