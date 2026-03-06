"""Filter out jobs that have already been processed."""

import hashlib
from LinkedinAutomation.mark_job_seen import load_seen


def deduplicate(jobs: list) -> list:
    """Return only jobs whose URL is not in the seen-jobs store."""
    seen = load_seen()
    new_jobs = []
    for job in jobs:
        url = job.get("job_url", "")
        h = hashlib.sha256(url.strip().encode()).hexdigest()
        if h not in seen:
            new_jobs.append(job)
    return new_jobs


if __name__ == "__main__":
    sample = [
        {"job_url": "https://linkedin.com/jobs/view/111", "title": "Job A"},
        {"job_url": "https://linkedin.com/jobs/view/222", "title": "Job B"},
    ]
    result = deduplicate(sample)
    print(f"Input: {len(sample)} jobs -> After dedup: {len(result)} new jobs")
    print("deduplicate_jobs module OK")
