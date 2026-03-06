"""Glassdoor job search via Apify scraper.

Uses the Apify Glassdoor scraper actor to find Power Platform jobs.
Requires APIFY_API_TOKEN in .env.
"""

import os
import re

from dotenv import load_dotenv  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Apify Glassdoor scraper actor
GLASSDOOR_ACTOR_ID = "xzKEFxPhHpPQIAhOi"

SEARCH_TERMS = [
    "Power Platform Developer",
    "Power Apps Developer",
    "Power Platform Consultant",
]

MUST_HAVE_KEYWORDS = ["power platform", "power apps", "powerapps"]

REJECT_TITLE_KEYWORDS = [
    "architect", "f&o", "finance and operations", "functional consultant",
    "functional", "operations", "d365 f&o",
]


def _passes_filter(job: dict) -> bool:
    title = job.get("title", "").lower()
    desc = job.get("description", "").lower()
    combined = title + " " + desc

    if not any(kw in combined for kw in MUST_HAVE_KEYWORDS):
        return False
    if any(kw in title for kw in REJECT_TITLE_KEYWORDS):
        return False
    return True


def _normalize_job(item: dict) -> dict:
    """Convert Apify Glassdoor result to our standard job format."""
    salary = item.get("salary", "") or ""
    if not salary:
        pay_low = item.get("payPercentile10", "")
        pay_high = item.get("payPercentile90", "")
        if pay_low and pay_high:
            salary = f"${pay_low:,} - ${pay_high:,}/yr" if isinstance(pay_low, (int, float)) else f"${pay_low} - ${pay_high}/yr"

    return {
        "job_id": f"glassdoor-{item.get('id', item.get('jobTitleText', '')[:20])}",
        "title": item.get("jobTitleText", "") or item.get("title", ""),
        "company": item.get("employerName", "") or item.get("company", ""),
        "location": item.get("locationName", "") or item.get("location", ""),
        "job_url": item.get("jobViewUrl", "") or item.get("url", ""),
        "description": (item.get("jobDescription", "") or item.get("description", "") or "")[:5000],
        "salary": salary,
        "is_easy_apply": False,
        "date_posted": item.get("discoverDate", ""),
        "source": "glassdoor",
        "remote_status": "",
    }


def search(max_jobs: int = 15) -> list:
    """Search Glassdoor for Power Platform jobs via Apify."""
    token = os.getenv("APIFY_API_TOKEN", "")
    if not token:
        alert("Glassdoor", "APIFY_API_TOKEN not set, skipping Glassdoor search", "warning")
        return []

    try:
        from apify_client import ApifyClient  # pyre-ignore[21]
    except ImportError:
        alert("Glassdoor", "apify-client not installed, skipping Glassdoor", "warning")
        return []

    client = ApifyClient(token)
    all_jobs = []

    for term in SEARCH_TERMS:
        if len(all_jobs) >= max_jobs:
            break

        alert("Glassdoor", f"Searching: {term}")
        try:
            run_input = {
                "keyword": term,
                "location": "United States",
                "maxItems": max_jobs,
            }

            run = client.actor(GLASSDOOR_ACTOR_ID).call(run_input=run_input)
            dataset_id = run.get("defaultDatasetId")
            if not dataset_id:
                continue

            items = list(client.dataset(dataset_id).iterate_items())
            alert("Glassdoor", f"Got {len(items)} results for '{term}'")

            for item in items:
                job = _normalize_job(item)
                if _passes_filter(job):
                    all_jobs.append(job)

        except Exception as e:
            alert("Glassdoor Error", f"Search failed for '{term}': {e}", "error")

    # Deduplicate by URL
    seen = set()
    unique = []
    for job in all_jobs:
        if job["job_url"] and job["job_url"] not in seen:
            seen.add(job["job_url"])
            unique.append(job)

    alert("Glassdoor", f"{len(unique)} jobs passed filters")
    return unique[:max_jobs]


if __name__ == "__main__":
    jobs = search(max_jobs=5)
    for j in jobs:
        print(f"  {j['title']} at {j['company']} — {j['location']}")
    print(f"Total: {len(jobs)} Glassdoor jobs")
