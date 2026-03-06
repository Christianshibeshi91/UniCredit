"""Indeed job search via Apify scraper.

Uses the Apify Indeed scraper actor to find Power Platform jobs.
Requires APIFY_API_TOKEN in .env.
"""

import os
import re

from dotenv import load_dotenv  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Apify Indeed scraper actor
INDEED_ACTOR_ID = "hyne9h6apil7lbpnj"

SEARCH_TERMS = [
    "Power Platform Developer",
    "Power Platform Consultant",
    "Power Apps Developer",
]

MUST_HAVE_KEYWORDS = ["power platform", "power apps", "powerapps"]

REJECT_TITLE_KEYWORDS = [
    "architect", "f&o", "finance and operations", "functional consultant",
    "functional", "operations", "d365 f&o",
]


def _passes_filter(job: dict) -> bool:
    """Apply the same filters as LinkedIn search."""
    title = job.get("title", "").lower()
    desc = job.get("description", "").lower()
    combined = title + " " + desc

    if not any(kw in combined for kw in MUST_HAVE_KEYWORDS):
        return False
    if any(kw in title for kw in REJECT_TITLE_KEYWORDS):
        return False
    return True


def _normalize_job(item: dict) -> dict:
    """Convert Apify Indeed result to our standard job format."""
    # Extract salary from the description or salary field
    salary = item.get("salary", "") or ""
    if not salary:
        desc = item.get("description", "")
        salary_m = re.search(
            r'\$[\d,]+(?:\.\d+)?\s*[-/\u2013\u2014]\s*\$[\d,]+(?:\.\d+)?(?:\s*/\s*(?:yr|year))?',
            desc,
        )
        if salary_m:
            salary = salary_m.group(0)

    return {
        "job_id": f"indeed-{item.get('id', item.get('positionName', '')[:20])}",
        "title": item.get("positionName", "") or item.get("title", ""),
        "company": item.get("company", ""),
        "location": item.get("location", ""),
        "job_url": item.get("url", "") or item.get("externalApplyLink", ""),
        "description": (item.get("description", "") or "")[:5000],
        "salary": salary,
        "is_easy_apply": False,
        "date_posted": item.get("postedAt", ""),
        "source": "indeed",
        "remote_status": "",
    }


def search(max_jobs: int = 15) -> list:
    """Search Indeed for Power Platform jobs via Apify."""
    token = os.getenv("APIFY_API_TOKEN", "")
    if not token:
        alert("Indeed", "APIFY_API_TOKEN not set, skipping Indeed search", "warning")
        return []

    try:
        from apify_client import ApifyClient  # pyre-ignore[21]
    except ImportError:
        alert("Indeed", "apify-client not installed, skipping Indeed", "warning")
        return []

    client = ApifyClient(token)
    all_jobs = []

    for term in SEARCH_TERMS:
        if len(all_jobs) >= max_jobs:
            break

        alert("Indeed", f"Searching: {term}")
        try:
            run_input = {
                "position": term,
                "country": "US",
                "location": "United States",
                "maxItems": max_jobs,
                "parseCompanyDetails": False,
                "saveOnlyUniqueItems": True,
                "followApplyRedirects": False,
            }

            run = client.actor(INDEED_ACTOR_ID).call(run_input=run_input)
            dataset_id = run.get("defaultDatasetId")
            if not dataset_id:
                continue

            items = list(client.dataset(dataset_id).iterate_items())
            alert("Indeed", f"Got {len(items)} results for '{term}'")

            for item in items:
                job = _normalize_job(item)
                if _passes_filter(job):
                    all_jobs.append(job)

        except Exception as e:
            alert("Indeed Error", f"Search failed for '{term}': {e}", "error")

    # Deduplicate by URL
    seen = set()
    unique = []
    for job in all_jobs:
        if job["job_url"] and job["job_url"] not in seen:
            seen.add(job["job_url"])
            unique.append(job)

    alert("Indeed", f"{len(unique)} jobs passed filters")
    return unique[:max_jobs]


if __name__ == "__main__":
    jobs = search(max_jobs=5)
    for j in jobs:
        print(f"  {j['title']} at {j['company']} — {j['location']}")
    print(f"Total: {len(jobs)} Indeed jobs")
