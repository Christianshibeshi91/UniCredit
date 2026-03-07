"""Generic job search via Firecrawl web search API.

Searches well-known recruiter sites (Dice, ZipRecruiter, SimplyHired,
Monster, Built In) using Firecrawl's search endpoint with site: operators,
then scrapes full job details.

Requires FIRECRAWL_API_KEY in .env.
"""

import os
import re

from dotenv import load_dotenv  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.search_utils import passes_filter, extract_salary, normalize_firecrawl_item, extract_firecrawl_items  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# --- Site configurations ---
SITE_CONFIGS = {
    "dice": {"domain": "dice.com", "source": "dice"},
    "ziprecruiter": {"domain": "ziprecruiter.com", "source": "ziprecruiter"},
    "simplyhired": {"domain": "simplyhired.com", "source": "simplyhired"},
    "monster": {"domain": "monster.com", "source": "monster"},
    "builtin": {"domain": "builtin.com", "source": "builtin"},
}

SEARCH_TERMS = [
    "Power Platform Developer",
    "Power Platform Consultant",
    "Power Apps Developer",
]


def _extract_company(text: str, url: str) -> str:
    """Try to extract company name from markdown or URL context."""
    # Common patterns in job page markdown
    for pattern in [
        r'(?:Company|Employer|Posted by)[:\s]+([^\n|]+)',
        r'at\s+([A-Z][^\n,|]+?)(?:\s+[-\u2013\u2014]|\s+in\s)',
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()[:100]
    return ""


def _extract_location(text: str) -> str:
    """Try to extract location from markdown."""
    for pattern in [
        r'(?:Location|Based in)[:\s]+([^\n|]+)',
        r'(?:Remote|Hybrid|On-?site)\s*[-\u2013\u2014,]?\s*([A-Z][a-zA-Z\s,]+(?:,\s*[A-Z]{2}))',
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()[:100]
    # Check for "Remote" anywhere
    if re.search(r'\bremote\b', text, re.IGNORECASE):
        return "Remote"
    return ""


def _normalize_result(result: dict, source: str) -> dict:
    """Convert a Firecrawl search result into our standard job dict."""
    url = result.get("url", "")
    title = result.get("title", "") or result.get("metadata", {}).get("title", "")
    description = result.get("markdown", "") or result.get("description", "")

    # Try to clean up title (often includes " - Dice", " | ZipRecruiter", etc.)
    title_clean = re.split(r'\s*[-|]\s*(?:Dice|ZipRecruiter|SimplyHired|Monster|Built\s*In)', title)[0].strip()  # pyre-ignore[29]
    if not title_clean:
        title_clean = title

    # Generate a stable job ID from URL
    job_id = f"{source}-{abs(hash(url)) % 10**10}"

    company = _extract_company(description, url)
    location = _extract_location(description)
    salary = extract_salary(description)

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
        "source": source,
        "remote_status": "",
    }


def search(platform: str, max_jobs: int = 15) -> list:
    """Search a recruiter site for Power Platform jobs via Firecrawl.

    Args:
        platform: One of the keys in SITE_CONFIGS (dice, ziprecruiter, etc.)
        max_jobs: Maximum number of jobs to return.

    Returns:
        List of standardized job dicts.
    """
    api_key = os.getenv("FIRECRAWL_API_KEY", "")
    if not api_key:
        alert(platform.title(), "FIRECRAWL_API_KEY not set, skipping", "warning")
        return []

    config = SITE_CONFIGS.get(platform)
    if not config:
        alert("Firecrawl", f"Unknown platform: {platform}", "error")
        return []

    try:
        from firecrawl import Firecrawl  # pyre-ignore[21]
    except ImportError:
        alert(platform.title(), "firecrawl-py not installed, skipping", "warning")
        return []

    fc = Firecrawl(api_key=api_key)
    domain = config["domain"]
    source = config["source"]
    all_jobs = []

    for term in SEARCH_TERMS:
        if len(all_jobs) >= max_jobs:
            break

        query = f"{term} site:{domain}"
        alert(platform.title(), f"Searching: {query}")

        try:
            results = fc.search(
                query=query,
                limit=max_jobs,
                scrape_options={"formats": ["markdown"]},
                tbs="qdr:w",  # past week
            )

            items = extract_firecrawl_items(results)
            alert(platform.title(), f"Got {len(items)} results for '{term}'")

            for item in items:
                item = normalize_firecrawl_item(item)
                job = _normalize_result(item, source)
                if passes_filter(job):
                    all_jobs.append(job)

        except Exception as e:
            alert(f"{platform.title()} Error", f"Search failed for '{term}': {e}", "error")

    # Deduplicate by URL
    seen = set()
    unique = []
    for job in all_jobs:
        if job["job_url"] and job["job_url"] not in seen:
            seen.add(job["job_url"])
            unique.append(job)

    alert(platform.title(), f"{len(unique)} jobs passed filters")
    return unique[:max_jobs]


if __name__ == "__main__":
    import sys as _sys
    platform = _sys.argv[1] if len(_sys.argv) > 1 else "dice"
    jobs = search(platform=platform, max_jobs=5)
    for j in jobs:
        print(f"  {j['title']} at {j['company']} — {j['location']}")
        print(f"    {j['job_url']}")
    print(f"Total: {len(jobs)} {platform} jobs")
