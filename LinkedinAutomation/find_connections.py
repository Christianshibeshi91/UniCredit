"""Find LinkedIn connections at target companies.

Uses requests to scrape LinkedIn's public people-search pages.
Falls back to a manual search URL when scraping fails.
"""

import itertools
import json
import os
import re
import html as html_mod
import urllib.parse

import requests  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

TARGET_TITLES = [
    "Power Platform", "Microsoft 365", "IT Director",
    "VP Digital Transformation", "Engineering Manager",
    "CTO", "CDO", "Solution Architect",
]

OUTREACH_TEMPLATE = (
    "Hi {name}, I noticed you work at {company} and came across an opening for "
    "{job_title}. Given my background delivering enterprise Power Platform solutions "
    "at RBC, Boeing, WSECU, and AT&T, I'd love to connect and learn about your "
    "team's tech stack. Open to a quick chat?"
)

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)


def _build_search_url(company):
    params = {"keywords": f"{company} Power Platform", "origin": "FACETED_SEARCH"}
    return (
        "https://www.linkedin.com/search/results/people/?"
        + urllib.parse.urlencode(params)
    )


def _build_public_search_url(company):
    """Public (guest) people search URL."""
    params = {"keywords": f"{company} Power Platform"}
    return (
        "https://www.linkedin.com/pub/dir?"
        + urllib.parse.urlencode(params)
    )


def find(company, job_title=""):
    """Find connections at *company*. Returns a dict with connection info."""
    manual_url = _build_search_url(company)
    result = {
        "connection_name": "",
        "connection_title": "",
        "connection_degree": "",
        "linkedin_profile_url": "",
        "outreach_message": "",
        "manual_search_url": manual_url,
    }

    try:
        li_at = os.getenv("LINKEDIN_LI_AT", "")
        headers = {"User-Agent": _UA}
        if li_at:
            headers["Cookie"] = f"li_at={li_at}"

        # Try the authenticated people-search page
        r = requests.get(manual_url, headers=headers, timeout=15, allow_redirects=True)

        if r.status_code == 200 and len(r.text) > 2000:
            text = r.text

            # Extract profile links and associated names/titles
            profiles = re.findall(
                r'href="(https://www\.linkedin\.com/in/[^"?]+)', text
            )
            # Deduplicate
            seen = set()
            unique_profiles = []
            for p in profiles:
                if p not in seen:
                    seen.add(p)
                    unique_profiles.append(p)

            # Try to find names near the profile links
            candidates = []
            for profile_url in itertools.islice(unique_profiles, 10):
                slug = profile_url.rstrip("/").split("/")[-1]
                # Look for name near the link
                pattern = re.escape(profile_url) + r'[^>]*>([^<]+)<'
                name_m = re.search(pattern, text)
                name = html_mod.unescape(name_m.group(1).strip()) if name_m else ""

                # Find title nearby (next sibling text)
                if name:
                    name_pos = text.find(name)
                    if name_pos > 0:
                        nearby = text[name_pos:name_pos + 500]
                        title_m = re.search(
                            r'(?:subtitle|headline|occupation)[^>]*>([^<]+)<',
                            nearby, re.IGNORECASE
                        )
                        title = html_mod.unescape(title_m.group(1).strip()) if title_m else ""
                        candidates.append((name, title, profile_url))

            # Pick the best candidate based on TARGET_TITLES
            best = None
            for name, title, url in candidates:
                if any(t.lower() in title.lower() for t in TARGET_TITLES):
                    best = (name, title, url)
                    break
            if not best and candidates:
                best = candidates[0]

            if best:
                name, title, url = best
                result["connection_name"] = name
                result["connection_title"] = title
                result["linkedin_profile_url"] = url
                result["outreach_message"] = OUTREACH_TEMPLATE.format(
                    name=name.split()[0] if name else "there",
                    company=company,
                    job_title=job_title,
                )

    except Exception as e:
        alert(
            "Connection Search",
            f"Search failed: {e}. Use manual URL.",
            "warning",
        )

    if not result.get("connection_name"):
        result["connection_name"] = "Manual Lookup Required"
        result["outreach_message"] = f"Search: {manual_url}"

    return result


if __name__ == "__main__":
    r = find("Microsoft", "Power Platform Architect")
    print(json.dumps(r, indent=2))
