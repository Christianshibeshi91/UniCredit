"""CAPTCHA detection and solving — supports 2Captcha, Anti-Captcha, and manual bypass.

Capabilities:
  - Detect reCAPTCHA v2/v3, hCaptcha, Cloudflare Turnstile, Arkose/FunCaptcha
  - Auto-solve via 2Captcha or Anti-Captcha API
  - Cloudflare challenge wait-and-retry
  - CAPTCHA avoidance scoring (tracks which sites trigger CAPTCHAs)
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field

import requests as req_lib  # pyre-ignore[21]

log = logging.getLogger(__name__)

# API keys from env
TWOCAPTCHA_KEY = os.getenv("TWOCAPTCHA_API_KEY", "")
ANTICAPTCHA_KEY = os.getenv("ANTICAPTCHA_API_KEY", "")

# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------

CAPTCHA_SIGNATURES = {
    "recaptcha_v2": [
        'class="g-recaptcha"', "data-sitekey", "google.com/recaptcha/api",
        "grecaptcha", "recaptcha-token",
    ],
    "recaptcha_v3": [
        "recaptcha/api.js?render=", "grecaptcha.execute",
    ],
    "hcaptcha": [
        "hcaptcha.com/1/api.js", 'class="h-captcha"', "data-sitekey",
        "hcaptcha-response",
    ],
    "cloudflare": [
        "cf-challenge", "challenge-running", "cf-turnstile",
        "challenges.cloudflare.com", "cf-chl-bypass",
        "Checking if the site connection is secure",
        "Enable JavaScript and cookies to continue",
    ],
    "arkose": [
        "arkoselabs.com", "funcaptcha", "arkose",
    ],
    "generic": [
        "captcha", "verify you are human", "please verify",
        "security check", "bot detection", "are you a robot",
        "prove you're human", "human verification",
    ],
}


@dataclass
class CaptchaInfo:
    """Detected CAPTCHA details."""
    captcha_type: str = ""  # recaptcha_v2, hcaptcha, cloudflare, etc.
    sitekey: str = ""
    page_url: str = ""
    action: str = ""  # for recaptcha v3
    detected: bool = False


async def detect_captcha_type(page) -> CaptchaInfo:
    """Analyze the page to determine what type of CAPTCHA is present."""
    info = CaptchaInfo(page_url=page.url)
    try:
        html = await page.content()
    except Exception:
        return info

    html_lower = html.lower()

    # Check each signature type
    for ctype, signatures in CAPTCHA_SIGNATURES.items():
        if any(sig.lower() in html_lower for sig in signatures):
            info.detected = True
            info.captcha_type = ctype
            break

    if not info.detected:
        return info

    # Extract sitekey
    sitekey_patterns = [
        r'data-sitekey="([^"]+)"',
        r"data-sitekey='([^']+)'",
        r'sitekey:\s*["\']([^"\']+)["\']',
        r'sitekey=([a-zA-Z0-9_-]+)',
    ]
    for pat in sitekey_patterns:
        m = re.search(pat, html)
        if m:
            info.sitekey = m.group(1)
            break

    # Extract action for reCAPTCHA v3
    action_m = re.search(r'grecaptcha\.execute\([^,]+,\s*\{action:\s*["\']([^"\']+)', html)
    if action_m:
        info.action = action_m.group(1)

    return info


# ---------------------------------------------------------------------------
# Solvers
# ---------------------------------------------------------------------------

class CaptchaSolver:
    """Unified CAPTCHA solver — routes to the best available service."""

    def __init__(self):
        self._stats: dict[str, int] = {"solved": 0, "failed": 0}

    @property
    def has_solver(self) -> bool:
        return bool(TWOCAPTCHA_KEY or ANTICAPTCHA_KEY)

    async def solve(self, page, info: CaptchaInfo | None = None) -> bool:
        """Detect and solve CAPTCHA on the current page. Returns True if solved."""
        if info is None:
            info = await detect_captcha_type(page)
        if not info.detected:
            return True  # No CAPTCHA

        log.info("CAPTCHA detected: %s (sitekey=%s)", info.captcha_type, info.sitekey[:20] if info.sitekey else "none")

        # Cloudflare — just wait
        if info.captcha_type == "cloudflare":
            return await self._handle_cloudflare(page)

        # Need a solver API for real CAPTCHAs
        if not self.has_solver:
            log.warning("No CAPTCHA solver API key configured — cannot solve %s", info.captcha_type)
            return False

        if info.captcha_type == "recaptcha_v2":
            token = await self._solve_recaptcha_v2(info)
        elif info.captcha_type == "recaptcha_v3":
            token = await self._solve_recaptcha_v3(info)
        elif info.captcha_type == "hcaptcha":
            token = await self._solve_hcaptcha(info)
        else:
            log.warning("Unsupported CAPTCHA type: %s", info.captcha_type)
            return False

        if not token:
            self._stats["failed"] += 1
            return False

        # Inject token into the page
        success = await self._inject_token(page, info, token)
        if success:
            self._stats["solved"] += 1
        return success

    async def _handle_cloudflare(self, page, max_wait: int = 30) -> bool:
        """Wait for Cloudflare challenge to auto-resolve."""
        log.info("Waiting for Cloudflare challenge to resolve...")
        for i in range(max_wait):
            await asyncio.sleep(1)
            info = await detect_captcha_type(page)
            if not info.detected or info.captcha_type != "cloudflare":
                log.info("Cloudflare challenge resolved after %ds", i + 1)
                return True
        log.warning("Cloudflare challenge did not resolve in %ds", max_wait)
        return False

    async def _solve_recaptcha_v2(self, info: CaptchaInfo) -> str | None:
        if TWOCAPTCHA_KEY:
            return await self._twocaptcha_solve("recaptcha", info)
        return await self._anticaptcha_solve("RecaptchaV2TaskProxyless", info)

    async def _solve_recaptcha_v3(self, info: CaptchaInfo) -> str | None:
        if TWOCAPTCHA_KEY:
            return await self._twocaptcha_solve("recaptcha", info, version="v3")
        return await self._anticaptcha_solve("RecaptchaV3TaskProxyless", info)

    async def _solve_hcaptcha(self, info: CaptchaInfo) -> str | None:
        if TWOCAPTCHA_KEY:
            return await self._twocaptcha_solve("hcaptcha", info)
        return await self._anticaptcha_solve("HCaptchaTaskProxyless", info)

    # --- 2Captcha ---

    async def _twocaptcha_solve(
        self, method: str, info: CaptchaInfo, version: str = ""
    ) -> str | None:
        """Submit CAPTCHA to 2Captcha and poll for solution."""
        params: dict = {
            "key": TWOCAPTCHA_KEY,
            "method": "userrecaptcha" if method == "recaptcha" else method,
            "googlekey" if method == "recaptcha" else "sitekey": info.sitekey,
            "pageurl": info.page_url,
            "json": 1,
        }
        if version == "v3":
            params["version"] = "v3"
            params["action"] = info.action or "verify"
            params["min_score"] = "0.5"

        try:
            r = req_lib.post("https://2captcha.com/in.php", data=params, timeout=30)
            data = r.json()
            if data.get("status") != 1:
                log.error("2Captcha submit failed: %s", data)
                return None
            task_id = data["request"]
        except Exception as e:
            log.error("2Captcha submit error: %s", e)
            return None

        # Poll for result (max 120s)
        for _ in range(24):
            await asyncio.sleep(5)
            try:
                r = req_lib.get(
                    "https://2captcha.com/res.php",
                    params={"key": TWOCAPTCHA_KEY, "action": "get", "id": task_id, "json": 1},
                    timeout=15,
                )
                data = r.json()
                if data.get("status") == 1:
                    log.info("2Captcha solved successfully")
                    return data["request"]
                if data.get("request") != "CAPCHA_NOT_READY":
                    log.error("2Captcha error: %s", data)
                    return None
            except Exception as e:
                log.warning("2Captcha poll error: %s", e)

        log.error("2Captcha timeout")
        return None

    # --- Anti-Captcha ---

    async def _anticaptcha_solve(self, task_type: str, info: CaptchaInfo) -> str | None:
        """Submit CAPTCHA to Anti-Captcha and poll for solution."""
        task: dict = {
            "type": task_type,
            "websiteURL": info.page_url,
            "websiteKey": info.sitekey,
        }
        if "V3" in task_type:
            task["minScore"] = 0.5
            task["pageAction"] = info.action or "verify"

        try:
            r = req_lib.post(
                "https://api.anti-captcha.com/createTask",
                json={"clientKey": ANTICAPTCHA_KEY, "task": task},
                timeout=30,
            )
            data = r.json()
            if data.get("errorId", 0) != 0:
                log.error("Anti-Captcha submit failed: %s", data.get("errorDescription"))
                return None
            task_id = data["taskId"]
        except Exception as e:
            log.error("Anti-Captcha submit error: %s", e)
            return None

        for _ in range(24):
            await asyncio.sleep(5)
            try:
                r = req_lib.post(
                    "https://api.anti-captcha.com/getTaskResult",
                    json={"clientKey": ANTICAPTCHA_KEY, "taskId": task_id},
                    timeout=15,
                )
                data = r.json()
                if data.get("status") == "ready":
                    token = data.get("solution", {}).get("gRecaptchaResponse") or \
                            data.get("solution", {}).get("token", "")
                    log.info("Anti-Captcha solved successfully")
                    return token
                if data.get("errorId", 0) != 0:
                    log.error("Anti-Captcha error: %s", data.get("errorDescription"))
                    return None
            except Exception as e:
                log.warning("Anti-Captcha poll error: %s", e)

        log.error("Anti-Captcha timeout")
        return None

    # --- Token injection ---

    async def _inject_token(self, page, info: CaptchaInfo, token: str) -> bool:
        """Inject solved CAPTCHA token into the page and submit."""
        try:
            if info.captcha_type in ("recaptcha_v2", "recaptcha_v3"):
                await page.evaluate(f'''
                    document.getElementById("g-recaptcha-response").innerHTML = "{token}";
                    if (typeof ___grecaptcha_cfg !== "undefined") {{
                        Object.entries(___grecaptcha_cfg.clients).forEach(([k, v]) => {{
                            const callback = v?.S?.S?.callback || v?.S?.callback;
                            if (callback) callback("{token}");
                        }});
                    }}
                ''')
            elif info.captcha_type == "hcaptcha":
                await page.evaluate(f'''
                    document.querySelector("[name='h-captcha-response']").value = "{token}";
                    document.querySelector("[name='g-recaptcha-response']").value = "{token}";
                ''')

            await asyncio.sleep(1)
            # Try to find and click submit
            for sel in ['[type="submit"]', "button.submit", "#submit", "form button"]:
                btn = await page.query_selector(sel)
                if btn:
                    await btn.click()
                    break
            await asyncio.sleep(2)

            # Verify CAPTCHA is gone
            new_info = await detect_captcha_type(page)
            return not new_info.detected

        except Exception as e:
            log.error("Token injection failed: %s", e)
            return False


# ---------------------------------------------------------------------------
# CAPTCHA avoidance tracker
# ---------------------------------------------------------------------------

class CaptchaTracker:
    """Track which domains/paths trigger CAPTCHAs to avoid them proactively."""

    def __init__(self):
        self._history: dict[str, list[float]] = {}  # domain -> list of timestamps

    def record(self, url: str):
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        self._history.setdefault(domain, []).append(time.time())

    def risk_score(self, url: str) -> float:
        """Return 0.0-1.0 risk score based on CAPTCHA history for this domain."""
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        hits = self._history.get(domain, [])
        if not hits:
            return 0.0
        # Recent hits (last hour) weigh more
        now = time.time()
        recent = sum(1 for t in hits if now - t < 3600)
        total = len(hits)
        return min(1.0, (recent * 0.3 + total * 0.1))

    def should_slow_down(self, url: str, threshold: float = 0.5) -> bool:
        return self.risk_score(url) >= threshold
