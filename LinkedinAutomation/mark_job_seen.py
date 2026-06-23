"""Track which job URLs have already been processed via SHA-256 hashing."""

import hashlib
import json
import os

SEEN_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".tmp", "seen_jobs.json")
FAILED_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".tmp", "failed_attempts.json")

MAX_RETRY_ATTEMPTS = 3


def _hash(url: str) -> str:
    return hashlib.sha256(url.strip().encode()).hexdigest()


def load_seen() -> set:
    """Return set of URL hashes from .tmp/seen_jobs.json."""
    if not os.path.exists(SEEN_PATH):
        return set()
    with open(SEEN_PATH, "r") as f:
        try:
            return set(json.load(f))
        except (json.JSONDecodeError, TypeError):
            return set()


def is_seen(job_url: str) -> bool:
    return _hash(job_url) in load_seen()


def mark_seen(job_url: str) -> None:
    """Append job URL hash to the seen-jobs store."""
    seen = load_seen()
    h = _hash(job_url)
    if h in seen:
        return
    seen.add(h)
    os.makedirs(os.path.dirname(SEEN_PATH), exist_ok=True)
    with open(SEEN_PATH, "w") as f:
        json.dump(sorted(seen), f, indent=2)


def _load_failed() -> dict:
    """Return dict mapping url_hash -> attempt_count."""
    if not os.path.exists(FAILED_PATH):
        return {}
    with open(FAILED_PATH, "r") as f:
        try:
            return json.load(f)
        except (json.JSONDecodeError, TypeError):
            return {}


def _save_failed(failed: dict) -> None:
    os.makedirs(os.path.dirname(FAILED_PATH), exist_ok=True)
    with open(FAILED_PATH, "w") as f:
        json.dump(failed, f, indent=2)


def get_failed_attempts(job_url: str) -> int:
    """Return the number of failed application attempts for a job URL."""
    return _load_failed().get(_hash(job_url), 0)


def has_exceeded_retries(job_url: str) -> bool:
    """Return True if the job has failed MAX_RETRY_ATTEMPTS or more times."""
    return get_failed_attempts(job_url) >= MAX_RETRY_ATTEMPTS


def record_failed_attempt(job_url: str) -> int:
    """Increment and return the failed attempt count for a job URL."""
    failed = _load_failed()
    h = _hash(job_url)
    failed[h] = failed.get(h, 0) + 1
    _save_failed(failed)
    return failed[h]


def clear_failed_attempts(job_url: str) -> None:
    """Remove a job URL from the failed attempts tracker (e.g. on success)."""
    failed = _load_failed()
    h = _hash(job_url)
    if h in failed:
        del failed[h]
        _save_failed(failed)


if __name__ == "__main__":
    test_url = "https://linkedin.com/jobs/view/test-123"
    print(f"is_seen (before): {is_seen(test_url)}")
    mark_seen(test_url)
    print(f"is_seen (after):  {is_seen(test_url)}")
    print(f"failed_attempts: {get_failed_attempts(test_url)}")
    print("mark_job_seen module OK")
