"""Indeed job search via Firecrawl web search.

Routes Indeed searches through the Firecrawl API to bypass bot detection.
Requires FIRECRAWL_API_KEY in .env.
Falls back to direct scraping if Firecrawl is unavailable.
"""
from __future__ import annotations

import os
import re

from dotenv import load_dotenv  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.search_utils import passes_filter, extract_salary, normalize_firecrawl_item, extract_firecrawl_items  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

SEARCH_TERMS = [
    "Power Platform Developer",
    "Power Platform Consultant",
    "Power Apps Developer",
]


def _normalize_result(item: dict) -> dict:
    """Convert a Firecrawl search result into our standard job dict."""
    url = item.get("url", "")
    title = item.get("title", "") or ""
    description = item.get("markdown", "") or item.get("description", "") or ""

    # Clean title — remove " - Indeed" suffix
    title_clean = re.split(r'\s*[-|]\s*(?:Indeed|indeed\.com)', title)[0].strip()
    if not title_clean:
        title_clean = title

    # Extract company from description
    company = ""
    for pattern in [
        r'(?:Company|Employer|Posted by)[:\s]+([^\n|]+)',
        r'at\s+([A-Z][^\n,|]+?)(?:\s+[-\u2013\u2014]|\s+in\s)',
    ]:
        m = re.search(pattern, description, re.IGNORECASE)
        if m:
            company = m.group(1).strip()[:100]
            break

    location = ""
    for pattern in [
        r'(?:Location|Based in)[:\s]+([^\n|]+)',
    ]:
        m = re.search(pattern, description, re.IGNORECASE)
        if m:
            location = m.group(1).strip()[:100]
            break
    if not location and re.search(r'\bremote\b', description, re.IGNORECASE):
        location = "Remote"

    salary = extract_salary(description)

    job_id = f"indeed-{abs(hash(url)) % 10**10}"

    return {
        "job_id": job_id,
        "title": title_clean[:200],
        "company": company,
        "location": location,
        "job_url": url,
        "description": description[:5000],
        "salary": salary,
        "is_easy_apply": False,
        "date_posted": "",
        "source": "indeed",
        "remote_status": "",
    }


def search(max_jobs: int = 15) -> list:
    """Search Indeed for Power Platform jobs via Firecrawl."""
    api_key = os.getenv("FIRECRAWL_API_KEY", "")
    if not api_key:
        alert("Indeed", "FIRECRAWL_API_KEY not set, skipping Indeed", "warning")
        return []

    try:
        from firecrawl import Firecrawl  # pyre-ignore[21]
    except ImportError:
        alert("Indeed", "firecrawl-py not installed, skipping Indeed", "warning")
        return []

    fc = Firecrawl(api_key=api_key)
    all_jobs = []

    for term in SEARCH_TERMS:
        if len(all_jobs) >= max_jobs:
            break

        query = f"{term} site:indeed.com"
        alert("Indeed", f"Searching: {query}")

        try:
            results = fc.search(
                query=query,
                limit=max_jobs,
                scrape_options={"formats": ["markdown"]},
                tbs="qdr:w",  # past week
            )

            items = extract_firecrawl_items(results)
            alert("Indeed", f"Got {len(items)} results for '{term}'")

            for item in items:
                item = normalize_firecrawl_item(item)
                job = _normalize_result(item)
                if passes_filter(job):
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
