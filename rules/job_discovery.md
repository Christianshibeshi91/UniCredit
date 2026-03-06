---
goal: Discover high-fit LinkedIn job postings for Christian Shibeshi
inputs:
  - search_terms: list of role title variants
  - filters: remote, salary, date posted
  - daily_cap: max 15 jobs to process per run
outputs:
  - raw_jobs.json in .tmp/ — list of job objects
scripts:
  - implementation/search_linkedin_jobs.py
  - implementation/deduplicate_jobs.py
---

# Rule: Job Discovery

## Goal
Search LinkedIn for Power Platform and Microsoft 365 roles matching Christian Shibeshi's target positions. Collect raw job postings and filter for new, unseen jobs only.

- Saved auth session: `linkedin_auth.json`
- Search terms (defined below)
- Deduplication store: `.tmp/seen_jobs.json`

## Search Terms (run all in sequence)
```
"Power Platform Consultant"
"Power Platform Architect"
"Power Platform Developer"
"Microsoft 365 Developer"
"D365 CE Developer"
"Dynamics 365 Developer"
"Power Apps Developer"
```

## Filters to Apply
- **Location**: United States (Remote preferred)
- **Date Posted**: Last 24 hours for daily runs; last 7 days for first run
- **Easy Apply**: include both Easy Apply and external postings
- **Salary**: filter for $130k+ (cast wider net; scoring will refilter)

## Playwright Scraper
- Uses a local playwright script (`implementation/search_linkedin_jobs.py`) instead of an external actor.
- Uses `linkedin_auth.json` to authenticate to the web interface.

## Output Schema (per job)
Each job object must contain:
```json
{
  "job_id": "string",
  "title": "string",
  "company": "string",
  "location": "string",
  "job_url": "string",
  "description": "string",
  "salary": "string or null",
  "is_easy_apply": true,
  "date_posted": "ISO date string",
  "source": "linkedin"
}
```

## Deduplication
1. Load `.tmp/seen_jobs.json` (create empty `[]` if missing)
2. Hash each `job_url`
3. Skip any job whose hash already exists
4. Append new hashes after processing

## Daily Cap
- Process a maximum of `MAX_APPLICATIONS_PER_DAY` (from `.env`) qualified jobs per run
- Reject any job scoring below 70 before applying to the cap

## Edge Cases
- If Playwright returns 0 results: log warning, continue gracefully, do not fail
- If LinkedIn changes page structure causing Playwright failure: update script selectors and retry
- If dedup file is corrupted: delete and reinitialize, log warning

## Recovery
- Retry failed Playwright calls up to 3 times with 10s delay
- If still failing after 3 tries: write error to `.tmp/run_state.json`, call `alert_user.py waiting`, stop

## Version History
- v1: Initial LinkedIn-only discovery via Playwright
