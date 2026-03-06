"""LinkedIn job search scraper using public guest API + requests.

LinkedIn blocks Firecrawl, so this module uses LinkedIn's public
guest job API (no auth required) for search results and individual
job detail pages.  Parsed with regex — no Playwright needed.

Filters:
  - Title/description MUST contain "Power Platform" or "Power Apps"
  - REJECT: Architect, F&O, Functional, Operations, Finance, D365 F&O
  - Only remote positions
  - Only jobs posted in last 24 hours (not reposted)
"""

import html as html_mod
import itertools
import json
import os
import re
import time
import random
import urllib.parse

import requests  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.anti_detect import get_random_ua, get_human_delay  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

# --- Search terms (only Power Platform / Power Apps focused) ---
SEARCH_TERMS = [
    "Power Platform Developer",
    "Power Platform Consultant",
    "Power Apps Developer",
    "Power Platform Engineer",
    "Power Platform Lead",
]

# --- Filters ---
# Title or description MUST contain at least one of these (case-insensitive)
MUST_HAVE_KEYWORDS = [
    "power platform",
    "power apps",
    "powerapps",
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

    # Reject reposted jobs (LinkedIn marks them)
    if "reposted" in title or "reposted" in desc:
        return False

    return True


def _is_reposted(card_html):
    """Check if a job card indicates a reposted listing."""
    return "reposted" in card_html.lower()


def _build_search_url(query, start=0):
    params = {
        "keywords": query,
        "location": "United States",
        "f_WT": "2",           # Remote only
        "f_TPR": "r86400",     # Past 24 hours
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

        # Skip reposted jobs right away
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
    try:
        r = requests.get(
            job["job_url"], headers={"User-Agent": _ua()}, timeout=15
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

        if "Easy Apply" in text or "easy-apply" in text.lower():
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


def search(max_jobs=15):
    """Search LinkedIn for Power Platform / Power Apps jobs (filtered)."""
    all_jobs = []
    jobs_per_term = max(3, max_jobs // len(SEARCH_TERMS))

    alert("LinkedIn Search", f"Searching {len(SEARCH_TERMS)} terms, max {max_jobs} jobs")
    alert("Filters", "MUST: Power Platform/Power Apps | REJECT: Architect, F&O, Functional, Operations, Reposted")

    # Shuffle search terms each run to vary pattern
    terms = list(SEARCH_TERMS)
    random.shuffle(terms)

    for term in terms:
        if len(all_jobs) >= max_jobs * 2:
            break

        url = _build_search_url(term)
        alert("Searching", f"'{term}'...")

        try:
            r = requests.get(url, headers={"User-Agent": _ua()}, timeout=15)
            if r.status_code != 200:
                alert("Search Error", f"HTTP {r.status_code} for '{term}'", "error")
                continue

            jobs = list(itertools.islice(_parse_search_html(r.text), jobs_per_term))
            all_jobs.extend(jobs)
            alert("Found", f"{len(jobs)} jobs for '{term}' (after title filter)")
        except Exception as e:
            alert("Search Error", f"Failed for '{term}': {e}", "error")

        time.sleep(get_human_delay("between_fields"))

    # Deduplicate by URL
    seen_urls = set()
    unique_jobs = []
    for job in all_jobs:
        if job["job_url"] not in seen_urls:
            seen_urls.add(job["job_url"])
            unique_jobs.append(job)

    # Scrape details and apply full filter (title + description)
    detailed_jobs = []
    scraped = 0
    for job in unique_jobs:
        if len(detailed_jobs) >= max_jobs:
            break

        alert("Details", f"Scraping {job['title'] or job['job_id']}...")
        job = _scrape_job_details(job)
        scraped += 1

        # Skip reposted (detected on detail page)
        if job.get("_reposted"):
            alert("Filter", f"SKIP (reposted): {job['title']}", "warning")
            time.sleep(get_human_delay("scroll"))
            continue

        # Full filter: title + description must have keywords, no banned terms
        if not _passes_full_filter(job):
            alert("Filter", f"SKIP (keywords): {job['title']}", "warning")
            time.sleep(get_human_delay("scroll"))
            continue

        detailed_jobs.append(job)
        alert("PASS", f"{job['title']} at {job['company']}")
        time.sleep(random.uniform(1, 3))

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
