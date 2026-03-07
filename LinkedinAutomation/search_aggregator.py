"""Multi-platform job search aggregator.

Calls LinkedIn, Indeed, and Glassdoor searchers in sequence,
then deduplicates across platforms using fuzzy title+company matching.
"""

import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.search_linkedin_jobs import search as linkedin_search  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Platforms to search (configurable via .env)
DEFAULT_PLATFORMS = "linkedin,indeed,glassdoor,dice,ziprecruiter,simplyhired,monster,builtin"


def _normalize_text(text: str) -> str:
    """Normalize text for fuzzy comparison."""
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text


def _fuzzy_match(a: str, b: str, threshold: float = 0.85) -> bool:
    """Simple fuzzy match based on character overlap ratio."""
    a_norm = _normalize_text(a)
    b_norm = _normalize_text(b)

    if a_norm == b_norm:
        return True

    # Try using thefuzz if available
    try:
        from thefuzz import fuzz  # pyre-ignore[21]
        ratio = fuzz.ratio(a_norm, b_norm) / 100.0
        return ratio >= threshold
    except ImportError:
        pass

    # Fallback: word overlap
    a_words = set(a_norm.split())
    b_words = set(b_norm.split())
    if not a_words or not b_words:
        return False
    overlap = len(a_words & b_words)
    total = max(len(a_words), len(b_words))
    return (overlap / total) >= threshold


def _cross_platform_dedup(jobs: list) -> list:
    """Remove cross-platform duplicates based on fuzzy title+company match.

    Prefers LinkedIn > Indeed > Glassdoor when duplicates found.
    """
    priority = {
        "linkedin": 0, "indeed": 1, "glassdoor": 2,
        "dice": 3, "ziprecruiter": 4, "builtin": 5,
        "simplyhired": 6, "monster": 7, "google": 8,
        "remoteok": 9,
    }
    # Sort by priority (LinkedIn first)
    jobs.sort(key=lambda j: priority.get(j.get("source", ""), 9))

    unique = []
    for job in jobs:
        title = job.get("title", "")
        company = job.get("company", "")

        is_dup = False
        for existing in unique:
            if (_fuzzy_match(title, existing.get("title", "")) and
                    _fuzzy_match(company, existing.get("company", ""))):
                is_dup = True
                break

        if not is_dup:
            unique.append(job)

    return unique


def aggregate_jobs(max_jobs: int = 15) -> list:
    """Search all configured platforms and return deduplicated results."""
    platforms_str = os.getenv("SEARCH_PLATFORMS", DEFAULT_PLATFORMS)
    platforms = [p.strip().lower() for p in platforms_str.split(",") if p.strip()]

    alert("Aggregator", f"Searching platforms: {', '.join(platforms)}")

    all_jobs = []
    jobs_per_platform = max(5, max_jobs // max(len(platforms), 1))

    def _search_linkedin():
        return ("LinkedIn", linkedin_search(max_jobs=jobs_per_platform))

    def _search_indeed():
        from LinkedinAutomation.search_indeed_jobs import search as indeed_search  # pyre-ignore[21]
        return ("Indeed", indeed_search(max_jobs=jobs_per_platform))

    def _search_glassdoor():
        from LinkedinAutomation.search_glassdoor_jobs import search as glassdoor_search  # pyre-ignore[21]
        return ("Glassdoor", glassdoor_search(max_jobs=jobs_per_platform))

    def _search_firecrawl(plat):
        from LinkedinAutomation.search_firecrawl_jobs import search as firecrawl_search  # pyre-ignore[21]
        return (plat.title(), firecrawl_search(platform=plat, max_jobs=jobs_per_platform))

    def _search_custom_scraper():
        from LinkedinAutomation.search_direct_scraper import search as scraper_search  # pyre-ignore[21]
        return ("CustomScraper", scraper_search(max_jobs=jobs_per_platform))

    # Build list of search tasks
    search_fns = []
    if "linkedin" in platforms:
        search_fns.append(_search_linkedin)

    # Use custom scraper as primary (free, stealth) — Firecrawl as fallback
    use_firecrawl = os.getenv("FIRECRAWL_API_KEY", "")
    scraper_mode = os.getenv("SCRAPER_MODE", "custom").lower()  # "custom", "firecrawl", "both"

    if scraper_mode == "firecrawl" and use_firecrawl:
        # Legacy mode: use Firecrawl for everything
        if "indeed" in platforms:
            search_fns.append(_search_indeed)
        if "glassdoor" in platforms:
            search_fns.append(_search_glassdoor)
        firecrawl_platforms = ["dice", "ziprecruiter", "simplyhired", "monster", "builtin"]
        for plat in firecrawl_platforms:
            if plat in platforms:
                search_fns.append(lambda p=plat: _search_firecrawl(p))
    elif scraper_mode == "both" and use_firecrawl:
        # Belt + suspenders: run both
        search_fns.append(_search_custom_scraper)
        if "indeed" in platforms:
            search_fns.append(_search_indeed)
        if "glassdoor" in platforms:
            search_fns.append(_search_glassdoor)
    else:
        # Default: custom stealth scraper (no API costs)
        search_fns.append(_search_custom_scraper)

    alert("Aggregator", f"Launching {len(search_fns)} platform searches in parallel...")
    with ThreadPoolExecutor(max_workers=min(len(search_fns), 4)) as pool:
        futures = {pool.submit(fn): fn for fn in search_fns}
        for fut in as_completed(futures):
            try:
                name, jobs = fut.result()
                all_jobs.extend(jobs)
                alert("Aggregator", f"{name}: {len(jobs)} jobs")
            except Exception as e:
                alert("Aggregator", f"Platform search failed: {e}", "error")

    alert("Aggregator", f"Total before dedup: {len(all_jobs)}")

    # Cross-platform deduplication
    unique_jobs = _cross_platform_dedup(all_jobs)

    alert("Aggregator", f"After cross-platform dedup: {len(unique_jobs)} unique jobs")
    return unique_jobs[:max_jobs * 2]  # Return extra for within-platform dedup


if __name__ == "__main__":
    jobs = aggregate_jobs(max_jobs=5)
    for j in jobs:
        src = j.get("source", "?")
        print(f"  [{src}] {j['title']} at {j['company']} — {j['location']}")
    print(f"Total: {len(jobs)} unique jobs across all platforms")
