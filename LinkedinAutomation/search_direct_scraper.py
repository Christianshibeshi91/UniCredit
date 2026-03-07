"""Advanced stealth web scraper — zero API keys, undetectable.

Beats Firecrawl/Apify by combining:
  - Playwright stealth with full anti-fingerprinting
  - Per-domain cookie persistence (builds site trust over time)
  - Adaptive rate limiting with exponential backoff
  - CAPTCHA detection and graceful skip
  - Full job detail page scraping (not just listing snippets)
  - Browser fingerprint rotation per session
  - Canvas/WebGL/AudioContext noise injection
  - Optional residential proxy rotation (SCRAPER_PROXY in .env)

Targets: Indeed, Glassdoor, Dice, RemoteOK, BuiltIn, Google Jobs,
         SimplyHired, ZipRecruiter, Monster

Requires: playwright, beautifulsoup4, lxml, requests
"""

import hashlib
import json
import os
import re
import time
import random
from pathlib import Path
from urllib.parse import quote_plus, urljoin

import requests as req_lib  # pyre-ignore[21]
from dotenv import load_dotenv  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.anti_detect import get_random_ua  # pyre-ignore[21]
from LinkedinAutomation.search_utils import passes_filter, extract_salary  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

SEARCH_TERMS = [
    "Power Platform Developer",
    "Power Apps Developer",
    "Power Platform Consultant",
]

PROXY = os.getenv("SCRAPER_PROXY", "")
COOKIE_DIR = os.path.join(BASE_DIR, ".tmp", "scraper_cookies")
os.makedirs(COOKIE_DIR, exist_ok=True)

# Track rate-limit state per domain across calls
_domain_backoff: dict[str, float] = {}


# ============================================================
# Stealth engine — more advanced than Firecrawl/Apify
# ============================================================

_STEALTH_FULL = """
// === Anti-detection: webdriver ===
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
delete navigator.__proto__.webdriver;

// === Anti-detection: chrome runtime ===
window.chrome = {
    runtime: {
        onMessage: {addListener:function(){},removeListener:function(){}},
        sendMessage: function(){},
        connect: function(){return{onMessage:{addListener:function(){}}}},
        id: 'mhjfbmdgcfjbbpaeojofohoefgiehjai'
    },
    loadTimes: function(){return{}},
    csi: function(){return{}},
    app: {isInstalled: false, InstallState: {DISABLED:'disabled',INSTALLED:'installed',NOT_INSTALLED:'not_installed'}},
};

// === Anti-detection: plugins & mimeTypes ===
Object.defineProperty(navigator, 'plugins', {
    get: () => {
        const plugins = [
            {name:'Chrome PDF Plugin',filename:'internal-pdf-viewer',description:'Portable Document Format',length:1},
            {name:'Chrome PDF Viewer',filename:'mhjfbmdgcfjbbpaeojofohoefgiehjai',description:'',length:1},
            {name:'Native Client',filename:'internal-nacl-plugin',description:'',length:2},
        ];
        plugins.refresh = function(){};
        return plugins;
    }
});

Object.defineProperty(navigator, 'mimeTypes', {
    get: () => {
        const types = [
            {type:'application/pdf',suffixes:'pdf',description:'Portable Document Format'},
            {type:'application/x-google-chrome-pdf',suffixes:'pdf',description:''},
        ];
        types.refresh = function(){};
        return types;
    }
});

// === Anti-detection: languages ===
Object.defineProperty(navigator, 'languages', {get: () => ['en-US','en']});
Object.defineProperty(navigator, 'language', {get: () => 'en-US'});

// === Anti-detection: platform & vendor ===
Object.defineProperty(navigator, 'platform', {get: () => 'Win32'});
Object.defineProperty(navigator, 'vendor', {get: () => 'Google Inc.'});
Object.defineProperty(navigator, 'maxTouchPoints', {get: () => 0});

// === Anti-detection: hardware concurrency & memory ===
Object.defineProperty(navigator, 'hardwareConcurrency', {get: () => HARDWARE_CORES});
Object.defineProperty(navigator, 'deviceMemory', {get: () => DEVICE_MEMORY});

// === Anti-detection: permissions ===
const origQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (p) =>
    p.name === 'notifications'
        ? Promise.resolve({state: Notification.permission})
        : origQuery(p);

// === Canvas fingerprint noise (unique per session) ===
const _canvasNoise = CANVAS_NOISE;
const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function(type) {
    const ctx = this.getContext('2d');
    if (ctx && this.width > 0 && this.height > 0) {
        const imageData = ctx.getImageData(0, 0, Math.min(this.width, 10), 1);
        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = (imageData.data[i] + _canvasNoise) & 0xFF;
        }
        ctx.putImageData(imageData, 0, 0);
    }
    return origToDataURL.apply(this, arguments);
};

const origToBlob = HTMLCanvasElement.prototype.toBlob;
HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
    const ctx = this.getContext('2d');
    if (ctx && this.width > 0) {
        const imageData = ctx.getImageData(0, 0, Math.min(this.width, 10), 1);
        imageData.data[0] = (imageData.data[0] + _canvasNoise) & 0xFF;
        ctx.putImageData(imageData, 0, 0);
    }
    return origToBlob.apply(this, arguments);
};

// === WebGL fingerprint masking ===
const origGetParam = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(param) {
    if (param === 37445) return WEBGL_VENDOR;
    if (param === 37446) return WEBGL_RENDERER;
    return origGetParam.apply(this, arguments);
};

if (typeof WebGL2RenderingContext !== 'undefined') {
    const origGetParam2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(param) {
        if (param === 37445) return WEBGL_VENDOR;
        if (param === 37446) return WEBGL_RENDERER;
        return origGetParam2.apply(this, arguments);
    };
}

// === AudioContext fingerprint noise ===
if (typeof AudioContext !== 'undefined') {
    const origCreateOsc = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function() {
        const osc = origCreateOsc.apply(this, arguments);
        const origConnect = osc.connect;
        osc.connect = function(dest) {
            if (dest.numberOfOutputs !== undefined) {
                const gain = osc.context.createGain();
                gain.gain.value = 1 + (CANVAS_NOISE * 0.00001);
                origConnect.call(osc, gain);
                gain.connect(dest);
                return gain;
            }
            return origConnect.apply(osc, arguments);
        };
        return osc;
    };
}

// === Prevent iframe detection ===
Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
    get: function() { return window; }
});

// === Date/timezone consistency ===
const _origDateTZ = Date.prototype.getTimezoneOffset;
Date.prototype.getTimezoneOffset = function() { return TZ_OFFSET; };

// === Screen properties ===
Object.defineProperty(screen, 'width', {get: () => SCREEN_W});
Object.defineProperty(screen, 'height', {get: () => SCREEN_H});
Object.defineProperty(screen, 'availWidth', {get: () => SCREEN_W});
Object.defineProperty(screen, 'availHeight', {get: () => SCREEN_H - 40});
Object.defineProperty(screen, 'colorDepth', {get: () => 24});
Object.defineProperty(screen, 'pixelDepth', {get: () => 24});
"""

# GPU profiles to rotate
_GPU_PROFILES = [
    ("Intel Inc.", "Intel Iris OpenGL Engine"),
    ("Google Inc. (Intel)", "ANGLE (Intel, Intel(R) UHD Graphics 630, OpenGL 4.1)"),
    ("Google Inc. (NVIDIA)", "ANGLE (NVIDIA, NVIDIA GeForce GTX 1650, OpenGL 4.5)"),
    ("Google Inc. (AMD)", "ANGLE (AMD, AMD Radeon Pro 5500M, OpenGL 4.1)"),
    ("Google Inc. (Intel)", "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics, OpenGL 4.1)"),
]


def _build_stealth_js():
    """Generate stealth JS with randomized fingerprint values per session."""
    gpu = random.choice(_GPU_PROFILES)
    cores = random.choice([4, 8, 12, 16])
    memory = random.choice([4, 8, 16])
    canvas_noise = random.randint(1, 20)
    tz_offset = 480  # Pacific time
    screen_w = random.choice([1920, 2560, 1440, 1680])
    screen_h = random.choice([1080, 1440, 900, 1050])

    js = _STEALTH_FULL
    js = js.replace("HARDWARE_CORES", str(cores))
    js = js.replace("DEVICE_MEMORY", str(memory))
    js = js.replace("CANVAS_NOISE", str(canvas_noise))
    js = js.replace("WEBGL_VENDOR", f"'{gpu[0]}'")
    js = js.replace("WEBGL_RENDERER", f"'{gpu[1]}'")
    js = js.replace("TZ_OFFSET", str(tz_offset))
    js = js.replace("SCREEN_W", str(screen_w))
    js = js.replace("SCREEN_H", str(screen_h))
    return js


def _get_browser(playwright):
    """Launch a stealth Chromium instance with full anti-detection."""
    width = random.randint(1300, 1920)
    height = random.randint(int(width * 0.52), int(width * 0.62))

    launch_args = [
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-dev-shm-usage",
        "--disable-infobars",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        f"--window-size={width},{height}",
    ]

    proxy_cfg = {"server": PROXY} if PROXY else None

    browser = playwright.chromium.launch(
        headless=True,
        args=launch_args,
        proxy=proxy_cfg,
    )

    context = browser.new_context(
        viewport={"width": width, "height": height},
        user_agent=get_random_ua(),
        locale="en-US",
        timezone_id="America/Los_Angeles",
        color_scheme=random.choice(["light", "no-preference"]),
        java_script_enabled=True,
        bypass_csp=True,
    )

    context.add_init_script(_build_stealth_js())
    return browser, context


def _load_cookies(context, domain: str):
    """Load saved cookies for a domain to maintain trust."""
    cookie_file = os.path.join(COOKIE_DIR, f"{domain}.json")
    if os.path.exists(cookie_file):
        try:
            with open(cookie_file, "r") as f:
                cookies = json.load(f)
            context.add_cookies(cookies)
        except (json.JSONDecodeError, Exception):
            pass


def _save_cookies(context, domain: str):
    """Save cookies for a domain for next run."""
    cookie_file = os.path.join(COOKIE_DIR, f"{domain}.json")
    try:
        cookies = context.cookies()
        domain_cookies = [c for c in cookies if domain in c.get("domain", "")]
        if domain_cookies:
            with open(cookie_file, "w") as f:
                json.dump(domain_cookies, f)
    except Exception:
        pass


def _check_backoff(domain: str) -> bool:
    """Return True if we should skip this domain due to rate limiting."""
    until = _domain_backoff.get(domain, 0)
    if time.time() < until:
        remaining = int(until - time.time())
        alert("Scraper", f"{domain}: backing off for {remaining}s more", "warning")
        return True
    return False


def _set_backoff(domain: str, seconds: int = 300):
    """Set exponential backoff for a domain."""
    current = _domain_backoff.get(domain, 0)
    if current > time.time():
        seconds = min(seconds * 2, 1800)  # Double, max 30 min
    _domain_backoff[domain] = time.time() + seconds
    alert("Scraper", f"{domain}: rate limited, backing off {seconds}s", "warning")


def _is_captcha(page) -> bool:
    """Detect CAPTCHA or bot challenge pages."""
    content = page.content().lower()
    captcha_signals = [
        "captcha", "recaptcha", "hcaptcha", "challenge-platform",
        "verify you are human", "are you a robot", "unusual traffic",
        "bot detection", "access denied", "please verify",
        "cf-challenge", "cloudflare", "just a moment",
    ]
    return any(sig in content for sig in captcha_signals)


def _human_scroll(page, scrolls=None):
    """Scroll like a human — variable speed, distance, and pauses."""
    n = scrolls or random.randint(2, 5)
    for i in range(n):
        distance = random.randint(200, 600)
        page.evaluate(f"window.scrollBy({{top: {distance}, behavior: 'smooth'}})")
        time.sleep(random.uniform(0.4, 1.5))
        # Occasionally scroll up slightly (like re-reading)
        if random.random() < 0.15:
            page.evaluate(f"window.scrollBy({{top: {-random.randint(50, 150)}, behavior: 'smooth'}})")
            time.sleep(random.uniform(0.3, 0.8))


def _human_mouse(page):
    """Random mouse movements to look human."""
    for _ in range(random.randint(1, 3)):
        x = random.randint(100, 900)
        y = random.randint(100, 600)
        page.mouse.move(x, y, steps=random.randint(5, 15))
        time.sleep(random.uniform(0.1, 0.4))


def _polite_delay(base=1.5, jitter=2.0):
    time.sleep(base + random.uniform(0, jitter))


def _job_id(source: str, url: str) -> str:
    h = hashlib.md5(url.encode()).hexdigest()[:10]
    return f"{source}-{h}"


def _make_job(source, title, company, location, job_url, description, salary=""):
    return {
        "job_id": _job_id(source, job_url or title + company),
        "title": title[:200],
        "company": company[:100],
        "location": location[:100],
        "job_url": job_url,
        "description": description[:5000],
        "salary": salary or extract_salary(description),
        "is_easy_apply": False,
        "date_posted": "",
        "source": source,
        "remote_status": "Remote" if re.search(r'\bremote\b', location, re.I) else "",
    }


def _scrape_detail(context, url: str, timeout: int = 12000) -> str:
    """Scrape full job description from a detail page."""
    page = context.new_page()
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=timeout)
        time.sleep(random.uniform(1, 2.5))

        if _is_captcha(page):
            return ""

        # Try common description selectors
        for selector in [
            "#jobDescriptionText", "div.jobsearch-JobComponent-description",
            "div[class*='description']", "div[class*='jobDescription']",
            "section[class*='description']", "div[data-testid='job-description']",
            "div.job-description", "div.desc", "article",
        ]:
            el = page.query_selector(selector)
            if el:
                text = el.inner_text().strip()
                if len(text) > 100:
                    return text[:5000]

        # Fallback: largest text block on page
        body = page.query_selector("body")
        return body.inner_text().strip()[:3000] if body else ""
    except Exception:
        return ""
    finally:
        page.close()


# ============================================================
# 1. Indeed — Stealth Playwright + detail scraping
# ============================================================

def _scrape_indeed(context, max_jobs: int = 10) -> list:
    if _check_backoff("indeed.com"):
        return []

    jobs = []
    page = context.new_page()
    _load_cookies(context, "indeed.com")

    try:
        for term in SEARCH_TERMS:
            if len(jobs) >= max_jobs:
                break

            url = f"https://www.indeed.com/jobs?q={quote_plus(term)}&l=Remote&fromage=7&sort=date"
            alert("Scraper", f"Indeed: '{term}'")

            page.goto(url, wait_until="networkidle", timeout=25000)
            _polite_delay(2, 2)

            if _is_captcha(page):
                alert("Scraper", "Indeed: CAPTCHA detected, skipping", "warning")
                _set_backoff("indeed.com")
                break

            _human_mouse(page)
            _human_scroll(page, 3)

            cards = page.query_selector_all("div.job_seen_beacon, div.resultContent, div.slider_container")
            alert("Scraper", f"Indeed: {len(cards)} cards found")

            for card in cards:
                if len(jobs) >= max_jobs:
                    break
                try:
                    title_el = card.query_selector("h2.jobTitle a, h2.jobTitle span, h2 a, a.jcs-JobTitle")
                    company_el = card.query_selector("[data-testid='company-name'], span.companyName, span.css-1x7z1ps, span[data-testid='company-name']")
                    location_el = card.query_selector("[data-testid='text-location'], div.companyLocation, div.css-1restlb")
                    link_el = card.query_selector("h2.jobTitle a, h2 a, a.jcs-JobTitle")
                    salary_el = card.query_selector("div.salary-snippet-container, div.metadata.salary-snippet-container, span.css-19j1a75")
                    snippet_el = card.query_selector("div.job-snippet, div.css-9446fg, table.jobCardShelfContainer td")

                    title_text = title_el.inner_text().strip() if title_el else ""
                    company_text = company_el.inner_text().strip() if company_el else ""
                    loc_text = location_el.inner_text().strip() if location_el else ""
                    sal_text = salary_el.inner_text().strip() if salary_el else ""
                    snippet = snippet_el.inner_text().strip() if snippet_el else ""

                    href = link_el.get_attribute("href") if link_el else ""
                    if not href:
                        continue
                    job_url = href if href.startswith("http") else f"https://www.indeed.com{href}"

                    # Scrape full description from detail page
                    full_desc = _scrape_detail(context, job_url)
                    description = full_desc if len(full_desc) > len(snippet) else snippet

                    job = _make_job("indeed", title_text, company_text, loc_text, job_url, description, sal_text)
                    if passes_filter(job):
                        jobs.append(job)
                        alert("Scraper", f"MATCH: {title_text} @ {company_text}")

                except Exception:
                    continue

            _polite_delay(2, 3)

        _save_cookies(context, "indeed.com")

    except Exception as e:
        alert("Scraper", f"Indeed error: {e}", "error")
    finally:
        page.close()

    alert("Scraper", f"Indeed: {len(jobs)} jobs")
    return jobs


# ============================================================
# 2. Glassdoor — Stealth Playwright
# ============================================================

def _scrape_glassdoor(context, max_jobs: int = 10) -> list:
    if _check_backoff("glassdoor.com"):
        return []

    jobs = []
    page = context.new_page()
    _load_cookies(context, "glassdoor.com")

    try:
        for term in SEARCH_TERMS:
            if len(jobs) >= max_jobs:
                break

            url = f"https://www.glassdoor.com/Job/jobs.htm?sc.keyword={quote_plus(term)}&locT=N&locId=11047&fromAge=7&remoteWorkType=1"
            alert("Scraper", f"Glassdoor: '{term}'")

            page.goto(url, wait_until="domcontentloaded", timeout=25000)
            _polite_delay(2, 3)

            if _is_captcha(page):
                alert("Scraper", "Glassdoor: CAPTCHA detected, skipping", "warning")
                _set_backoff("glassdoor.com")
                break

            _human_scroll(page, 3)

            cards = page.query_selector_all("li[data-test='jobListing'], li.JobsList_jobListItem__wjTHv, div[class*='JobCard']")
            alert("Scraper", f"Glassdoor: {len(cards)} cards found")

            for card in cards:
                if len(jobs) >= max_jobs:
                    break
                try:
                    title_el = card.query_selector("a[data-test='job-link'], a.JobCard_jobTitle__GLyJ1, a.jobTitle")
                    company_el = card.query_selector("span.EmployerProfile_compactEmployerName__9MGcV, span.EmployerProfile_employerName__Xemli, div.employerName")
                    location_el = card.query_selector("div.JobCard_location__Ds1fM, span.loc, div[data-test='emp-location']")
                    salary_el = card.query_selector("div.JobCard_salaryEstimate__QpbTW, span.css-18034rf")

                    title_text = title_el.inner_text().strip() if title_el else ""
                    company_text = company_el.inner_text().strip() if company_el else ""
                    loc_text = location_el.inner_text().strip() if location_el else ""
                    sal_text = salary_el.inner_text().strip() if salary_el else ""

                    href = title_el.get_attribute("href") if title_el else ""
                    if not href:
                        continue
                    job_url = href if href.startswith("http") else f"https://www.glassdoor.com{href}"

                    full_desc = _scrape_detail(context, job_url)

                    job = _make_job("glassdoor", title_text, company_text, loc_text, job_url, full_desc or title_text, sal_text)
                    if passes_filter(job):
                        jobs.append(job)

                except Exception:
                    continue

            _polite_delay(2, 4)

        _save_cookies(context, "glassdoor.com")

    except Exception as e:
        alert("Scraper", f"Glassdoor error: {e}", "error")
    finally:
        page.close()

    alert("Scraper", f"Glassdoor: {len(jobs)} jobs")
    return jobs


# ============================================================
# 3. Dice — Public search API (no browser needed)
# ============================================================

def _scrape_dice(max_jobs: int = 10) -> list:
    if _check_backoff("dice.com"):
        return []

    jobs = []
    session = req_lib.Session()
    session.headers.update({
        "User-Agent": get_random_ua(),
        "Accept": "application/json",
        "x-api-key": "1YAt0R9wBg4WfsF9VB2778F5CHLAPMVW3WAZcKd8",
    })

    for term in SEARCH_TERMS:
        if len(jobs) >= max_jobs:
            break

        alert("Scraper", f"Dice API: '{term}'")
        try:
            resp = session.get(
                "https://job-search-api.svc.dhigroupinc.com/v1/dice/jobs/search",
                params={
                    "q": term,
                    "countryCode2": "US",
                    "radius": "30",
                    "radiusUnit": "mi",
                    "page": "1",
                    "pageSize": str(max_jobs),
                    "filters.postedDate": "SEVEN",
                    "filters.workplaceTypes": "Remote",
                    "language": "en",
                },
                timeout=15,
            )
            if resp.status_code == 429:
                _set_backoff("dice.com")
                break
            if resp.status_code != 200:
                alert("Scraper", f"Dice API: {resp.status_code}", "warning")
                continue

            data = resp.json()
            for item in data.get("data", []):
                if len(jobs) >= max_jobs:
                    break

                title = item.get("title", "")
                company = item.get("companyName", "")
                location = item.get("employmentDetails", {}).get("workSite", "Remote")
                job_url = f"https://www.dice.com/job-detail/{item.get('id', '')}"
                description = item.get("summary", "")
                salary = item.get("compensation", "")

                job = _make_job("dice", title, company, location, job_url, description, salary)
                if passes_filter(job):
                    jobs.append(job)

            _polite_delay(1, 1.5)

        except Exception as e:
            alert("Scraper", f"Dice API error: {e}", "error")

    alert("Scraper", f"Dice: {len(jobs)} jobs")
    return jobs


# ============================================================
# 4. RemoteOK — Free JSON API
# ============================================================

def _scrape_remoteok(max_jobs: int = 10) -> list:
    jobs = []
    session = req_lib.Session()
    session.headers.update({
        "User-Agent": get_random_ua(),
        "Accept": "application/json",
    })

    alert("Scraper", "RemoteOK API")
    try:
        resp = session.get("https://remoteok.com/api", timeout=15)
        if resp.status_code != 200:
            alert("Scraper", f"RemoteOK: {resp.status_code}", "warning")
            return []

        data = resp.json()
        listings = data[1:] if isinstance(data, list) and len(data) > 1 else []

        for item in listings:
            if len(jobs) >= max_jobs:
                break

            title = item.get("position", "")
            company = item.get("company", "")
            location = item.get("location", "Remote") or "Remote"
            description = item.get("description", "")
            tags = " ".join(item.get("tags", []))
            url = item.get("url", "")
            if url and not url.startswith("http"):
                url = f"https://remoteok.com{url}"

            salary = ""
            s_min, s_max = item.get("salary_min"), item.get("salary_max")
            if s_min and s_max:
                salary = f"${int(s_min):,} - ${int(s_max):,}/yr"
            elif s_min:
                salary = f"${int(s_min):,}/yr"

            job = _make_job("remoteok", title, company, location, url, description + " " + tags, salary)
            if passes_filter(job):
                jobs.append(job)

    except Exception as e:
        alert("Scraper", f"RemoteOK error: {e}", "error")

    alert("Scraper", f"RemoteOK: {len(jobs)} jobs")
    return jobs


# ============================================================
# 5. BuiltIn — Stealth Playwright
# ============================================================

def _scrape_builtin(context, max_jobs: int = 10) -> list:
    if _check_backoff("builtin.com"):
        return []

    jobs = []
    page = context.new_page()

    try:
        for term in SEARCH_TERMS:
            if len(jobs) >= max_jobs:
                break

            url = f"https://builtin.com/jobs/remote?search={quote_plus(term)}&daysSinceUpdated=7"
            alert("Scraper", f"BuiltIn: '{term}'")

            page.goto(url, wait_until="domcontentloaded", timeout=20000)
            _polite_delay(2, 2)

            if _is_captcha(page):
                _set_backoff("builtin.com")
                break

            _human_scroll(page, 3)

            cards = page.query_selector_all("div[data-id], div[class*='JobCard'], div.job-card, article")
            for card in cards:
                if len(jobs) >= max_jobs:
                    break
                try:
                    title_el = card.query_selector("h2 a, h3 a, a[class*='job-title'], a[class*='JobTitle']")
                    company_el = card.query_selector("span[class*='company'], a[class*='company'], div[class*='company']")
                    location_el = card.query_selector("span[class*='location'], div[class*='location']")

                    title_text = title_el.inner_text().strip() if title_el else ""
                    company_text = company_el.inner_text().strip() if company_el else ""
                    loc_text = location_el.inner_text().strip() if location_el else ""

                    href = title_el.get_attribute("href") if title_el else ""
                    if not href or not title_text:
                        continue
                    job_url = href if href.startswith("http") else f"https://builtin.com{href}"

                    full_desc = _scrape_detail(context, job_url)

                    job = _make_job("builtin", title_text, company_text, loc_text or "Remote", job_url, full_desc or title_text)
                    if passes_filter(job):
                        jobs.append(job)

                except Exception:
                    continue

            _polite_delay(2, 3)

    except Exception as e:
        alert("Scraper", f"BuiltIn error: {e}", "error")
    finally:
        page.close()

    alert("Scraper", f"BuiltIn: {len(jobs)} jobs")
    return jobs


# ============================================================
# 6. Google Jobs — Stealth Playwright + interactive panels
# ============================================================

def _scrape_google_jobs(context, max_jobs: int = 10) -> list:
    if _check_backoff("google.com"):
        return []

    jobs = []
    page = context.new_page()

    try:
        for term in SEARCH_TERMS:
            if len(jobs) >= max_jobs:
                break

            url = f"https://www.google.com/search?q={quote_plus(term + ' remote jobs USA')}&ibp=htl;jobs&hl=en&gl=us"
            alert("Scraper", f"Google Jobs: '{term}'")

            page.goto(url, wait_until="domcontentloaded", timeout=20000)
            _polite_delay(2, 3)

            if _is_captcha(page):
                _set_backoff("google.com")
                break

            _human_mouse(page)

            # Google Jobs list items
            cards = page.query_selector_all("li.iFjolb, div.PwjeAc")
            if not cards:
                cards = page.query_selector_all("div[jscontroller] div[data-ved]")

            alert("Scraper", f"Google Jobs: {len(cards)} cards found")

            for card in cards[:min(max_jobs * 2, len(cards))]:
                if len(jobs) >= max_jobs:
                    break
                try:
                    card.click()
                    time.sleep(random.uniform(0.6, 1.5))

                    title_el = card.query_selector("div.BjJfJf, div[role='heading']")
                    company_el = card.query_selector("div.vNEEBe, div.nJlQNd")
                    location_el = card.query_selector("div.Qk80Jf, span.Qk80Jf, div.tJ9zfc")

                    title_text = title_el.inner_text().strip() if title_el else ""
                    company_text = company_el.inner_text().strip() if company_el else ""
                    loc_text = location_el.inner_text().strip() if location_el else ""

                    if not title_text:
                        continue

                    # Get description from expanded detail panel
                    desc_el = page.query_selector("div.YgLbBe, span.HBvzbc, div[class*='description']")
                    desc = desc_el.inner_text().strip()[:4000] if desc_el else title_text

                    # Get apply link
                    apply_link = page.query_selector("a.pMhGee, a[data-share-url], a.wVSTAb, a[class*='apply']")
                    job_url = apply_link.get_attribute("href") if apply_link else ""
                    if not job_url:
                        job_url = f"https://www.google.com/search?q={quote_plus(title_text + ' ' + company_text + ' job')}&ibp=htl;jobs"

                    sal_el = card.query_selector("span[class*='salary'], div[class*='salary']")
                    sal = sal_el.inner_text().strip() if sal_el else ""

                    job = _make_job("google", title_text, company_text, loc_text, job_url, desc, sal)
                    if passes_filter(job):
                        jobs.append(job)

                except Exception:
                    continue

            _polite_delay(3, 4)

    except Exception as e:
        alert("Scraper", f"Google Jobs error: {e}", "error")
    finally:
        page.close()

    alert("Scraper", f"Google Jobs: {len(jobs)} jobs")
    return jobs


# ============================================================
# 7. SimplyHired — Stealth Playwright
# ============================================================

def _scrape_simplyhired(context, max_jobs: int = 10) -> list:
    if _check_backoff("simplyhired.com"):
        return []

    jobs = []
    page = context.new_page()

    try:
        for term in SEARCH_TERMS:
            if len(jobs) >= max_jobs:
                break

            url = f"https://www.simplyhired.com/search?q={quote_plus(term)}&l=Remote&fdb=7"
            alert("Scraper", f"SimplyHired: '{term}'")

            page.goto(url, wait_until="domcontentloaded", timeout=20000)
            _polite_delay(2, 2)

            if _is_captcha(page):
                _set_backoff("simplyhired.com")
                break

            _human_scroll(page, 2)

            cards = page.query_selector_all("article[data-testid='searchSerpJob'], li.SerpJob, div[class*='SerpJob']")
            for card in cards:
                if len(jobs) >= max_jobs:
                    break
                try:
                    title_el = card.query_selector("a[data-testid='searchSerpJobTitle'], h2 a, a[class*='jobposting-title']")
                    company_el = card.query_selector("span[data-testid='searchSerpJobCompany'], span[class*='companyName']")
                    location_el = card.query_selector("span[data-testid='searchSerpJobLocation'], span[class*='location']")
                    salary_el = card.query_selector("span[data-testid='searchSerpJobSalary'], div[class*='Salary']")

                    title_text = title_el.inner_text().strip() if title_el else ""
                    company_text = company_el.inner_text().strip() if company_el else ""
                    loc_text = location_el.inner_text().strip() if location_el else ""
                    sal_text = salary_el.inner_text().strip() if salary_el else ""

                    href = title_el.get_attribute("href") if title_el else ""
                    if not href:
                        continue
                    job_url = href if href.startswith("http") else f"https://www.simplyhired.com{href}"

                    job = _make_job("simplyhired", title_text, company_text, loc_text, job_url, title_text, sal_text)
                    if passes_filter(job):
                        jobs.append(job)

                except Exception:
                    continue

            _polite_delay(2, 3)

    except Exception as e:
        alert("Scraper", f"SimplyHired error: {e}", "error")
    finally:
        page.close()

    alert("Scraper", f"SimplyHired: {len(jobs)} jobs")
    return jobs


# ============================================================
# 8. ZipRecruiter — Stealth Playwright
# ============================================================

def _scrape_ziprecruiter(context, max_jobs: int = 10) -> list:
    if _check_backoff("ziprecruiter.com"):
        return []

    jobs = []
    page = context.new_page()
    _load_cookies(context, "ziprecruiter.com")

    try:
        for term in SEARCH_TERMS:
            if len(jobs) >= max_jobs:
                break

            url = f"https://www.ziprecruiter.com/jobs-search?search={quote_plus(term)}&location=Remote&days=7"
            alert("Scraper", f"ZipRecruiter: '{term}'")

            page.goto(url, wait_until="domcontentloaded", timeout=20000)
            _polite_delay(2, 3)

            if _is_captcha(page):
                _set_backoff("ziprecruiter.com")
                break

            _human_scroll(page, 2)

            cards = page.query_selector_all("article.job_content, div.job_result, div[class*='JobCard']")
            for card in cards:
                if len(jobs) >= max_jobs:
                    break
                try:
                    title_el = card.query_selector("a.job_link, h2 a, a[class*='job_title']")
                    company_el = card.query_selector("a.t_org_link, span.t_org_link, p[class*='company']")
                    location_el = card.query_selector("span.t_location_link, p[class*='location']")
                    salary_el = card.query_selector("span.t_salary, p[class*='salary']")

                    title_text = title_el.inner_text().strip() if title_el else ""
                    company_text = company_el.inner_text().strip() if company_el else ""
                    loc_text = location_el.inner_text().strip() if location_el else ""
                    sal_text = salary_el.inner_text().strip() if salary_el else ""

                    href = title_el.get_attribute("href") if title_el else ""
                    if not href:
                        continue
                    job_url = href if href.startswith("http") else f"https://www.ziprecruiter.com{href}"

                    job = _make_job("ziprecruiter", title_text, company_text, loc_text, job_url, title_text, sal_text)
                    if passes_filter(job):
                        jobs.append(job)

                except Exception:
                    continue

            _polite_delay(2, 3)

        _save_cookies(context, "ziprecruiter.com")

    except Exception as e:
        alert("Scraper", f"ZipRecruiter error: {e}", "error")
    finally:
        page.close()

    alert("Scraper", f"ZipRecruiter: {len(jobs)} jobs")
    return jobs


# ============================================================
# 9. Monster — Stealth Playwright
# ============================================================

def _scrape_monster(context, max_jobs: int = 10) -> list:
    if _check_backoff("monster.com"):
        return []

    jobs = []
    page = context.new_page()

    try:
        for term in SEARCH_TERMS:
            if len(jobs) >= max_jobs:
                break

            url = f"https://www.monster.com/jobs/search?q={quote_plus(term)}&where=Remote&tm=7"
            alert("Scraper", f"Monster: '{term}'")

            page.goto(url, wait_until="domcontentloaded", timeout=20000)
            _polite_delay(2, 2)

            if _is_captcha(page):
                _set_backoff("monster.com")
                break

            _human_scroll(page, 2)

            cards = page.query_selector_all("div[data-testid='svx_jobCard'], article.job-cardstyle, div.job-search-resultsstyle_container")
            for card in cards:
                if len(jobs) >= max_jobs:
                    break
                try:
                    title_el = card.query_selector("a[data-testid='svx_jobCard-title'], h2 a, a.job-cardstyle_titleLink")
                    company_el = card.query_selector("span[data-testid='svx_jobCard-company'], a.job-cardstyle_company")
                    location_el = card.query_selector("span[data-testid='svx_jobCard-location'], span.job-cardstyle_location")

                    title_text = title_el.inner_text().strip() if title_el else ""
                    company_text = company_el.inner_text().strip() if company_el else ""
                    loc_text = location_el.inner_text().strip() if location_el else ""

                    href = title_el.get_attribute("href") if title_el else ""
                    if not href:
                        continue
                    job_url = href if href.startswith("http") else f"https://www.monster.com{href}"

                    job = _make_job("monster", title_text, company_text, loc_text, job_url, title_text)
                    if passes_filter(job):
                        jobs.append(job)

                except Exception:
                    continue

            _polite_delay(2, 3)

    except Exception as e:
        alert("Scraper", f"Monster error: {e}", "error")
    finally:
        page.close()

    alert("Scraper", f"Monster: {len(jobs)} jobs")
    return jobs


# ============================================================
# Main entry point
# ============================================================

def search(max_jobs: int = 15) -> list:
    """Run all scrapers and return combined, deduplicated results.

    Order: API scrapers first (fast, no browser), then Playwright scrapers.
    Each scraper is fault-isolated — one failing doesn't affect others.
    """
    alert("Scraper", "Starting advanced stealth scrapers (zero API cost)")
    per_source = max(5, max_jobs // 4)
    all_jobs = []

    # --- Phase 1: API-based (fast, no browser overhead) ---
    for name, fn in [("Dice", _scrape_dice), ("RemoteOK", _scrape_remoteok)]:
        try:
            all_jobs.extend(fn(max_jobs=per_source))
        except Exception as e:
            alert("Scraper", f"{name} failed: {e}", "error")

    # --- Phase 2: Playwright stealth scrapers ---
    try:
        from playwright.sync_api import sync_playwright  # pyre-ignore[21]
    except ImportError:
        alert("Scraper", "playwright not installed — browser scrapers disabled", "warning")
        return _dedup(all_jobs, max_jobs)

    try:
        with sync_playwright() as pw:
            browser, context = _get_browser(pw)
            alert("Scraper", "Stealth browser launched")
            try:
                browser_scrapers = [
                    ("Indeed", _scrape_indeed),
                    ("Glassdoor", _scrape_glassdoor),
                    ("Google Jobs", _scrape_google_jobs),
                    ("BuiltIn", _scrape_builtin),
                    ("SimplyHired", _scrape_simplyhired),
                    ("ZipRecruiter", _scrape_ziprecruiter),
                    ("Monster", _scrape_monster),
                ]

                for name, fn in browser_scrapers:
                    try:
                        results = fn(context, max_jobs=per_source)
                        all_jobs.extend(results)
                    except Exception as e:
                        alert("Scraper", f"{name} crashed: {e}", "error")

            finally:
                context.close()
                browser.close()
                alert("Scraper", "Browser closed")

    except Exception as e:
        alert("Scraper", f"Browser launch failed: {e}", "error")

    return _dedup(all_jobs, max_jobs)


def _dedup(jobs: list, max_jobs: int) -> list:
    """Deduplicate by URL."""
    seen = set()
    unique = []
    for job in jobs:
        key = job.get("job_url", "")
        if key and key not in seen:
            seen.add(key)
            unique.append(job)

    alert("Scraper", f"Total: {len(unique)} unique jobs across all scrapers")
    return unique[:max_jobs]


if __name__ == "__main__":
    jobs = search(max_jobs=10)
    for j in jobs:
        print(f"  [{j['source']}] {j['title']} at {j['company']} — {j['location']}")
        if j["salary"]:
            print(f"    Salary: {j['salary']}")
        print(f"    {j['job_url']}")
    print(f"\nTotal: {len(jobs)} jobs from custom scrapers")
