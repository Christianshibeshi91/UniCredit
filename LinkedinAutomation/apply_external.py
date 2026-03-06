"""Extract external application URLs from LinkedIn job postings.

Scrapes the public LinkedIn job page with requests to find external
apply links.  Falls back to Firecrawl for the external site itself
if needed.
"""

import os
import re
import html as html_mod

import requests  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)


def extract_url(job):
    """Extract the external application URL from a LinkedIn job posting."""
    job_url = job.get("job_url", "")
    if not job_url:
        alert("External Apply", "No job URL provided", "warning")
        return ""

    external_url = ""

    try:
        r = requests.get(job_url, headers={"User-Agent": _UA}, timeout=15)
        if r.status_code != 200:
            alert("External Apply", f"HTTP {r.status_code} for {job_url}", "warning")
            return ""

        text = r.text

        # Strategy 1: look for applyUrl in the page JSON-LD / embedded data
        apply_m = re.search(r'"applyUrl"\s*:\s*"(https?://[^"]+)"', text)
        if apply_m:
            url = html_mod.unescape(apply_m.group(1))
            if "linkedin.com" not in url:
                external_url = url

        # Strategy 2: look for "Apply" button/link pointing to external site
        if not external_url:
            apply_link_m = re.search(
                r'<a[^>]*href="(https?://(?!.*linkedin\.com)[^"]+)"[^>]*>'
                r'[^<]*(?:[Aa]pply|[Ss]ubmit)',
                text,
            )
            if apply_link_m:
                external_url = html_mod.unescape(apply_link_m.group(1))

        # Strategy 3: look for external links with ATS keywords
        if not external_url:
            ats_keywords = (
                "workday", "greenhouse", "lever", "icims", "taleo",
                "jobvite", "smartrecruiters", "bamboohr", "ashbyhq",
                "career", "apply", "talent",
            )
            for match in re.finditer(r'href="(https?://[^"]+)"', text):
                url = html_mod.unescape(match.group(1))
                if "linkedin.com" in url:
                    continue
                if any(kw in url.lower() for kw in ats_keywords):
                    external_url = url
                    break

        # Strategy 4: first non-LinkedIn external link
        if not external_url:
            for match in re.finditer(r'href="(https?://[^"]+)"', text):
                url = html_mod.unescape(match.group(1))
                if "linkedin.com" not in url and "licdn.com" not in url:
                    external_url = url
                    break

    except Exception as e:
        alert("External Apply", f"Scrape failed: {e}", "warning")

    if external_url:
        alert("External Apply", f"Apply at: {external_url}")
    else:
        alert("External Apply", f"No external URL found. Check: {job_url}", "warning")

    return external_url


if __name__ == "__main__":
    print("apply_external module loaded OK")
