"""Track which job URLs have already been processed via SHA-256 hashing."""

import hashlib
import json
import os

SEEN_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".tmp", "seen_jobs.json")


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


if __name__ == "__main__":
    test_url = "https://linkedin.com/jobs/view/test-123"
    print(f"is_seen (before): {is_seen(test_url)}")
    mark_seen(test_url)
    print(f"is_seen (after):  {is_seen(test_url)}")
    print("mark_job_seen module OK")
