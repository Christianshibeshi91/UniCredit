"""Multi-platform job search aggregator.

Calls LinkedIn, Indeed, and Glassdoor searchers in sequence,
then deduplicates across platforms using fuzzy title+company matching.
"""

import os
import re

from dotenv import load_dotenv  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.search_linkedin_jobs import search as linkedin_search  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Platforms to search (configurable via .env)
DEFAULT_PLATFORMS = "linkedin,indeed,glassdoor"


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
    priority = {"linkedin": 0, "indeed": 1, "glassdoor": 2}
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

    # LinkedIn (always first — it's the primary source)
    if "linkedin" in platforms:
        alert("Aggregator", "Searching LinkedIn...")
        try:
            linkedin_jobs = linkedin_search(max_jobs=jobs_per_platform)
            all_jobs.extend(linkedin_jobs)
            alert("Aggregator", f"LinkedIn: {len(linkedin_jobs)} jobs")
        except Exception as e:
            alert("Aggregator", f"LinkedIn search failed: {e}", "error")

    # Indeed
    if "indeed" in platforms:
        alert("Aggregator", "Searching Indeed...")
        try:
            from LinkedinAutomation.search_indeed_jobs import search as indeed_search  # pyre-ignore[21]
            indeed_jobs = indeed_search(max_jobs=jobs_per_platform)
            all_jobs.extend(indeed_jobs)
            alert("Aggregator", f"Indeed: {len(indeed_jobs)} jobs")
        except Exception as e:
            alert("Aggregator", f"Indeed search failed: {e}", "error")

    # Glassdoor
    if "glassdoor" in platforms:
        alert("Aggregator", "Searching Glassdoor...")
        try:
            from LinkedinAutomation.search_glassdoor_jobs import search as glassdoor_search  # pyre-ignore[21]
            glassdoor_jobs = glassdoor_search(max_jobs=jobs_per_platform)
            all_jobs.extend(glassdoor_jobs)
            alert("Aggregator", f"Glassdoor: {len(glassdoor_jobs)} jobs")
        except Exception as e:
            alert("Aggregator", f"Glassdoor search failed: {e}", "error")

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
