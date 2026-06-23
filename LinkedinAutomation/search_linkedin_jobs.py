"""LinkedIn job search scraper using public guest API + requests.

LinkedIn blocks Firecrawl, so this module uses LinkedIn's public
guest job API (no auth required) for search results and individual
job detail pages.  Parsed with regex — no Playwright needed.

Focus Areas:
  - Power Platform (Power Apps, Power Automate, Power BI, Dataverse)
  - Microsoft Copilot Studio / M365 Copilot development
  - AI Automation / Low-Code AI solutions

Filters:
  - Title/description MUST contain Power Platform, Copilot, or AI Automation keywords
  - REJECT: Architect, F&O, Functional, Operations, Finance, D365 F&O
  - Only remote positions
  - Only jobs posted within freshness window (default: last 60 min)
"""
from __future__ import annotations

import html as html_mod
import json
import os
import re
import time
import random
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

import requests  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.anti_detect import get_random_ua, get_human_delay  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
PROXY = os.getenv("SCRAPER_PROXY", "")

# --- Search terms: Power Platform + Copilot + AI Automation ---
SEARCH_TERMS = [
    # Power Platform core
    "Power Platform Developer",
    "Power Platform Consultant",
    "Power Apps Developer",
    "Power Platform Engineer",
    "Power Platform Lead",
    "Power Automate Developer",
    "Power BI Developer",
    "Dataverse Developer",
    "Microsoft Power Platform",
    "Low Code Developer",
    # Copilot focused
    "Copilot Developer",
    "Copilot Studio Developer",
    "Microsoft Copilot Developer",
    "M365 Copilot Developer",
    "Copilot Studio Engineer",
    "Microsoft 365 Copilot",
    # AI Automation
    "AI Automation Developer",
    "AI Power Platform",
]

# Tiered time windows — search freshest first to enable early applications
# (f_TPR value in seconds, freshness_priority 1=freshest, max terms to search, label)
FRESHNESS_TIERS = [
    ("r3600",   1, 18, "1 hour"),    # All 18 terms in the freshest window
    ("r7200",   2, 12, "2 hours"),
    ("r21600",  3,  8, "6 hours"),
    ("r43200",  4,  5, "12 hours"),
    ("r86400",  5,  5, "24 hours"),
]

# --- Filters ---
# Title or description MUST contain at least one of these (case-insensitive)
# Jobs passing ANY one of these are kept — covers both Power Platform and Copilot roles
MUST_HAVE_KEYWORDS = [
    # Power Platform
    "power platform",
    "power apps",
    "powerapps",
    "power automate",
    "dataverse",
    # Copilot
    "copilot studio",
    "microsoft copilot",
    "m365 copilot",
    "copilot developer",
    # AI Automation
    "ai automation",
    "ai power platform",
]

# REJECT if title contains any of these (case-insensitive)
REJECT_TITLE_KEYWORDS = [
    "architect",
    "f&o",
    "finance and operations",
    "finance & operations",
    "functional consultant",
    "functional",
    "operations",
    "d365 f&o",
    "dynamics 365 finance",
    "dynamics 365 operations",
    "d365 fo",
]

def _ua():
    """Get a rotated User-Agent."""
    return get_random_ua()


def _passes_title_filter(title):
    """Return True if the title is NOT explicitly rejected.

    We only reject banned keywords here. The must-have check
    (Power Platform / Power Apps) happens in _passes_full_filter
    after the description is scraped, so jobs that mention it
    only in the description still get through.
    """
    t = title.lower()
    # Must NOT contain any rejected keyword
    has_rejected = any(kw in t for kw in REJECT_TITLE_KEYWORDS)
    if has_rejected:
        return False
    return True


def _passes_full_filter(job):
    """Return True if job passes both title and description filters."""
    title = job.get("title", "").lower()
    desc = job.get("description", "").lower()
    combined = title + " " + desc

    # Must-have: title or description must mention Power Platform / Power Apps
    has_required = any(kw in combined for kw in MUST_HAVE_KEYWORDS)
    if not has_required:
        return False

    # Reject: title must NOT contain banned keywords
    has_rejected = any(kw in title for kw in REJECT_TITLE_KEYWORDS)
    if has_rejected:
        return False

    # Reject reposted jobs
    if "reposted" in title or "reposted" in desc:
        return False

    return True


def _is_reposted(card_html):
    """Check if a job card indicates a reposted listing."""
    return "reposted" in card_html.lower()


def _build_search_url(query, start=0, time_filter="r86400"):
    params = {
        "keywords": query,
        "location": "United States",
        "f_WT": "2",           # Remote only
        "f_TPR": time_filter,  # Time window (seconds)
        "sortBy": "DD",        # Most recent first
        "start": str(start),
    }
    return (
        "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?"
        + urllib.parse.urlencode(params)
    )


def _parse_search_html(html_text):
    """Parse job cards from the guest search API HTML response."""
    jobs = []
    pattern = (
        r'href="(https://www\.linkedin\.com/jobs/view/[^"]+)"'
    )
    seen = set()
    for match in re.finditer(pattern, html_text):
        raw_url = html_mod.unescape(match.group(1))
        clean_url = raw_url.split("?")[0]
        if clean_url in seen:
            continue
        seen.add(clean_url)
        job_id = clean_url.rstrip("/").split("/")[-1]
        jobs.append({
            "job_id": job_id,
            "title": "",
            "company": "",
            "location": "",
            "job_url": clean_url,
            "description": "",
            "salary": "",
            "is_easy_apply": False,
            "date_posted": "",
            "source": "linkedin",
        })

    # Extract titles, companies, locations from card HTML
    cards = re.findall(r'<li[^>]*>(.*?)</li>', html_text, re.DOTALL)
    for card_html in cards:
        link_m = re.search(r'href="(https://www\.linkedin\.com/jobs/view/[^"]+)"', card_html)
        if not link_m:
            continue
        card_url = html_mod.unescape(link_m.group(1)).split("?")[0]

        job = next((j for j in jobs if j["job_url"] == card_url), None)
        if not job:
            continue

        if _is_reposted(card_html):
            job["_reposted"] = True
            continue

        title_m = re.search(r'class="[^"]*base-search-card__title[^"]*"[^>]*>([^<]+)', card_html)
        if title_m:
            job["title"] = html_mod.unescape(title_m.group(1).strip())

        comp_m = re.search(r'class="[^"]*base-search-card__subtitle[^"]*"[^>]*>.*?<a[^>]*>([^<]+)', card_html, re.DOTALL)
        if not comp_m:
            comp_m = re.search(r'class="[^"]*base-search-card__subtitle[^"]*"[^>]*>\s*([^<]+)', card_html)
        if comp_m:
            job["company"] = html_mod.unescape(comp_m.group(1).strip())

        loc_m = re.search(r'class="[^"]*job-search-card__location[^"]*"[^>]*>([^<]+)', card_html)
        if loc_m:
            job["location"] = html_mod.unescape(loc_m.group(1).strip())

        date_m = re.search(r'<time[^>]*datetime="([^"]+)"', card_html)
        if date_m:
            job["date_posted"] = date_m.group(1)

    # Filter out reposted and title-rejected jobs before returning
    filtered = []
    for job in jobs:
        if job.get("_reposted"):
            continue
        if job["title"] and not _passes_title_filter(job["title"]):
            alert("Filter", f"SKIP (title): {job['title']}", "warning")
            continue
        filtered.append(job)

    return filtered


def _scrape_job_details(job):
    """Scrape a public job detail page for description, salary, etc."""
    proxies = {"http": PROXY, "https": PROXY} if PROXY else None
    try:
        r = requests.get(
            job["job_url"], headers={"User-Agent": _ua()}, proxies=proxies, timeout=15
        )
        if r.status_code != 200:
            return job

        text = r.text

        if not job["title"]:
            title_m = re.search(r'<h1[^>]*>([^<]+)</h1>', text)
            if title_m:
                job["title"] = html_mod.unescape(title_m.group(1).strip())

        if not job["company"]:
            comp_m = re.search(r'"companyName":"([^"]+)"', text)
            if not comp_m:
                comp_m = re.search(r'topcard__org-name-link[^>]*>([^<]+)<', text)
            if comp_m:
                job["company"] = html_mod.unescape(comp_m.group(1).strip())

        if not job["location"]:
            loc_m = re.search(r'topcard__flavor--bullet[^>]*>([^<]+)<', text)
            if loc_m:
                job["location"] = html_mod.unescape(loc_m.group(1).strip())

        desc_m = re.search(r'description__text[^>]*>(.*?)</div>', text, re.DOTALL)
        if desc_m:
            desc_clean = re.sub(r'<[^>]+>', ' ', desc_m.group(1)).strip()
            desc_clean = re.sub(r'\s+', ' ', desc_clean)
            job["description"] = desc_clean[:5000]  # pyre-ignore[29]

        # Detect Easy Apply — guest HTML is unreliable for any single indicator,
        # so check multiple signals: text, class names, JSON-LD, hrefs, data attrs.
        text_lower = text.lower()
        easy_apply_detected = (
            "Easy Apply" in text
            or "easy-apply" in text_lower
            or "linkedin.com/easy-apply" in text_lower
            or re.search(r'data-[a-z-]*easy[_-]?apply', text_lower) is not None
        )
        if not easy_apply_detected:
            # Check embedded JSON for applyMethod / easyApply markers
            if ('"applyMethod"' in text or '"applyUrl"' in text):
                if ("easyApply" in text or "EASY_APPLY" in text
                        or "easy_apply" in text_lower):
                    easy_apply_detected = True
        if easy_apply_detected:
            job["is_easy_apply"] = True

        salary_m = re.search(
            r'\$[\d,]+(?:\.\d+)?\s*[-/\u2013\u2014]\s*\$[\d,]+(?:\.\d+)?(?:\s*/\s*yr)?',
            text,
        )
        if salary_m:
            job["salary"] = html_mod.unescape(salary_m.group(0).strip())

        # Check for reposted on detail page
        if "reposted" in text.lower():
            job["_reposted"] = True

    except Exception as e:
        alert("Job Detail Error", f"Failed to scrape {job['job_url']}: {e}", "warning")

    return job


def search(max_jobs=30):
    """Search LinkedIn with tiered time windows — freshest jobs first.

    FRESHNESS_MODE (from .env):
      "1hour"  — Only tier 1 (jobs posted in last 60 min). Default for hourly runs.
      "full"   — All 5 tiers (1h, 2h, 6h, 12h, 24h). Use for manual deep searches.
    """
    freshness_mode = os.getenv("FRESHNESS_MODE", "1hour").lower()

    if freshness_mode == "1hour":
        active_tiers = [t for t in FRESHNESS_TIERS if t[0] == "r3600"]
        alert("LinkedIn Search", "HOURLY MODE: Only searching jobs posted in last 60 minutes")
    else:
        active_tiers = FRESHNESS_TIERS
        alert("LinkedIn Search", f"FULL MODE: All {len(FRESHNESS_TIERS)} time windows")

    all_jobs = []
    seen_urls = set()

    alert("LinkedIn Search", f"Tiered search: {len(active_tiers)} windows, {len(SEARCH_TERMS)} terms, max {max_jobs} jobs")
    alert("Filters", "MUST: Power Platform/Power Apps | REJECT: Architect, F&O, Functional, Operations, Reposted")

    # Shuffle terms once — all tiers use the same shuffled order
    terms = list(SEARCH_TERMS)
    random.shuffle(terms)

    for time_filter, priority, max_terms, label in active_tiers:
        if len(all_jobs) >= max_jobs * 2:
            break

        tier_terms = terms[:max_terms]
        tier_count = 0
        alert("Tier", f"--- Tier {priority} ({label}) — {len(tier_terms)} terms ---")

        for term in tier_terms:
            if len(all_jobs) >= max_jobs * 2:
                break

            url = _build_search_url(term, start=0, time_filter=time_filter)

            try:
                r = requests.get(url, headers={"User-Agent": _ua()}, timeout=15)
                if r.status_code != 200:
                    alert("Search Error", f"HTTP {r.status_code} for '{term}' (tier {priority})", "error")
                    continue

                jobs = list(_parse_search_html(r.text))
                added = 0
                for job in jobs:
                    if job["job_url"] not in seen_urls:
                        seen_urls.add(job["job_url"])
                        job["freshness_priority"] = priority
                        all_jobs.append(job)
                        added += 1

                tier_count += added
                if added:
                    alert("Found", f"{added} new jobs for '{term}' (tier {priority}: {label})")
            except Exception as e:
                alert("Search Error", f"Failed for '{term}' (tier {priority}): {e}", "error")

            time.sleep(get_human_delay("between_fields"))

        alert("Tier Result", f"Tier {priority} ({label}): {tier_count} new jobs")


    # Sort by freshness priority — freshest first
    all_jobs.sort(key=lambda j: j.get("freshness_priority", 6))
    unique_jobs = all_jobs

    # Scrape details and apply full filter (title + description) in parallel
    detailed_jobs = []
    scraped = 0
    jobs_to_scrape = unique_jobs[:max_jobs * 3]
    alert("LinkedIn Search", f"Scraping {len(jobs_to_scrape)} job details in parallel (max workers: 5)...")

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(_scrape_job_details, job) for job in jobs_to_scrape]

        for fut in futures:
            if len(detailed_jobs) >= max_jobs:
                fut.cancel()
                continue

            try:
                job = fut.result()
                scraped += 1

                # Skip reposted (detected on detail page)
                if job.get("_reposted"):
                    alert("Filter", f"SKIP (reposted): {job['title']}", "warning")
                    continue

                # Full filter: title + description must have keywords, no banned terms
                if not _passes_full_filter(job):
                    alert("Filter", f"SKIP (keywords): {job['title']}", "warning")
                    continue

                detailed_jobs.append(job)
                alert("PASS", f"{job['title']} at {job['company']}")
                time.sleep(random.uniform(0.2, 0.8))  # small staggered delay for logging / flow

            except Exception as e:
                alert("Detail Scraping", f"Error scraping job details: {e}", "warning")

    # Persist to disk
    out_path = os.path.join(BASE_DIR, ".tmp", "new_jobs.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(detailed_jobs, f, indent=2)

    alert("Search Complete", f"{len(detailed_jobs)} jobs passed filters (scraped {scraped})")
    return detailed_jobs


if __name__ == "__main__":
    jobs = search(max_jobs=5)
    for j in jobs:
        print(f"  {j['title']} at {j['company']} — {j['location']}")
    print(f"Total: {len(jobs)} jobs passed all filters")
