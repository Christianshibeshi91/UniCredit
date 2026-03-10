# Testing Conventions

## Current State

This project has **no unit test framework** and **no isolated tests**. There are no pytest, unittest, or mock-based tests anywhere in the codebase. All testing is integration/end-to-end, executed as standalone scripts that hit live external services.

## Test Files

| File | Purpose | External Dependencies |
|------|---------|----------------------|
| `test_end_to_end.py` | Full pipeline with synthetic job data | Claude/Ollama API, Google Sheets, Google Drive, Telegram |
| `test_real_job.py` | Full pipeline with a real LinkedIn job URL | LinkedIn (HTTP scrape), Claude/Ollama API, Google Sheets, Google Drive, Telegram |

Both files live at the project root:
- `C:\Users\chris\Downloads\Anti-gravity\test_end_to_end.py`
- `C:\Users\chris\Downloads\Anti-gravity\test_real_job.py`

## Test Execution

Tests are run directly as scripts, not through a test runner:

```bash
python test_end_to_end.py
python test_real_job.py
```

There is no `pytest.ini`, `setup.cfg`, `tox.ini`, or any test configuration file. There is no CI/CD pipeline.

## Test Structure Pattern

Both test files follow the same sequential pipeline pattern:

```python
"""Docstring describing the test."""

import os, sys, json

# 1. Setup: BASE_DIR, sys.path, load_dotenv, import modules
BASE_DIR = os.path.dirname(__file__)
sys.path.insert(0, BASE_DIR)
from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, ".env"))

from LinkedinAutomation.score_job import score
from LinkedinAutomation.tailor_resume import tailor
# ... more imports

# 2. Load profile
PROFILE_PATH = os.path.join(BASE_DIR, "candidate", "profile.json")
with open(PROFILE_PATH, "r") as f:
    profile = json.load(f)

# 3. Define test job (synthetic dict or scraped from real URL)
test_job = {
    "job_id": "test-e2e-...",
    "title": "Senior Power Platform Engineer",
    "company": "Microsoft",
    ...
}

# 4. Execute pipeline steps sequentially with alert() logging
alert("TEST", "Step 1: Scoring job...")
score_result = score(test_job, profile)

alert("TEST", "Step 2: Tailoring resume...")
resume_text = tailor(test_job, score_result, profile)

# ... Steps 3-7: cover letter, PDFs, Drive upload, Sheets logging, Telegram

# 5. Print summary
alert("TEST", "End-to-end test COMPLETE!")
```

## Logging in Tests

Use `alert("TEST", message)` from `LinkedinAutomation.alert_user` for all test output. Do not use `print()` for test step logging. The `alert()` function writes to stdout with timestamps in Pacific Time.

```python
alert("TEST", "=" * 50)
alert("TEST", "Starting end-to-end test pipeline")
alert("TEST", f"Score: {job_score}/100 ({grade})")
alert("TEST", f"Resume PDF failed: {e}", "warning")
```

## Module-Level Smoke Tests

Every module in `LinkedinAutomation/` includes an `if __name__ == "__main__":` block that serves as a minimal smoke test. These are the closest thing to unit tests in the codebase:

```python
# score_job.py
if __name__ == "__main__":
    sample_job = {
        "job_id": "test-score",
        "title": "Power Platform Architect",
        "company": "Contoso Financial",
        "location": "Remote",
        "salary": "$170,000-$190,000",
        "description": "Power Platform Architect with 7+ years...",
    }
    result = score(sample_job)
    print(json.dumps(result, indent=2))
    print(f"Score: {result['score']} ({result['grade']})")
```

Run any module's smoke test with:
```bash
python -m LinkedinAutomation.score_job
python -m LinkedinAutomation.generate_cover_letter
python -m LinkedinAutomation.ollama_client
python -m LinkedinAutomation.anti_detect
```

## Mocking

There is **no mocking infrastructure**. All tests call real APIs (Claude, Ollama, Google Sheets, Google Drive, Telegram). This means:

- Tests require a fully configured `.env` with valid API keys and tokens.
- Tests create real artifacts: Google Sheet rows, Telegram messages, Drive uploads, PDF files in `.tmp/`.
- Tests are not idempotent. Each run appends new data to Google Sheets and sends new Telegram messages.
- `test_end_to_end.py` uses a timestamp-based job ID (`test-e2e-{unix_timestamp}`) to avoid collisions.

## Error Handling in Tests

Tests use try/except with alert-based logging for non-critical steps (PDF generation can fail without aborting). Critical failures use `sys.exit(1)`:

```python
# Non-critical: warn and continue with fallback
try:
    generate_resume_pdf(resume_text, resume_pdf)
    alert("TEST", f"Resume PDF: {resume_pdf}")
except Exception as e:
    alert("TEST", f"Resume PDF failed: {e}", "warning")
    resume_pdf = os.path.join(BASE_DIR, ".tmp", "resume_test-e2e-001.txt")

# Critical: abort
if not job["title"]:
    alert("TEST", "Could not parse job title -- aborting", "error")
    sys.exit(1)
```

## Test Data

### Synthetic test job (`test_end_to_end.py`)
A hardcoded job dict with realistic values for "Senior Power Platform Engineer" at "Microsoft". Uses `is_easy_apply: True`. The job description is a multi-line string embedded directly in the test file.

### Real job URL (`test_real_job.py`)
Scrapes a real LinkedIn job posting by ID (`JOB_ID = "4381112986"`). Parses title, company, location, salary, description, and Easy Apply status from the HTML using regex. Falls back to `sys.exit(1)` if the scrape fails (HTTP error or missing title).

### Candidate profile
Both tests load `candidate/profile.json` for the candidate profile. This file must exist and contain valid JSON matching the expected schema (name, title, years_of_experience, core_skills, experience, certifications, etc.).

## Test Artifacts

Tests write output to `.tmp/`:
- `.tmp/resume_test-e2e-*.txt` and `.pdf`
- `.tmp/cl_test-e2e-*.txt` and `.pdf`
- `.tmp/score_test-e2e-*.json`
- `.tmp/test_real_job.py` (copy from test_real_job run)

The `.tmp/` directory is created on demand with `os.makedirs(..., exist_ok=True)`. Old screenshots are cleaned up by `tmp_cleanup.clean_old_screenshots()` based on `SCREENSHOT_RETENTION_DAYS`.

## Coverage

There is no coverage measurement tool configured. No `coverage.py`, no `.coveragerc`, no coverage reporting.

## Prescriptive Guidelines for New Tests

When adding tests to this codebase, follow these conventions:

### For integration tests (current pattern)
1. Place test scripts at the project root, named `test_*.py`.
2. Use the same boilerplate: `BASE_DIR`, `sys.path.insert`, `load_dotenv`, `alert()`.
3. Use `alert("TEST", ...)` for all output.
4. Generate unique job IDs with timestamps: `f"test-{name}-{int(time.time())}"`.
5. Wrap non-critical steps in try/except with `"warning"` level alerts.
6. Print a summary block at the end with pass/fail status.

### For future unit tests (recommended addition)
If unit tests are introduced, follow these conventions:

1. Use `pytest` as the test framework (already the Python standard).
2. Place unit tests in a `tests/` directory at the project root.
3. Name test files `test_{module_name}.py` (e.g., `tests/test_score_job.py`).
4. Name test functions `test_{function_name}_{scenario}` (e.g., `test_local_score_high_match`).
5. Mock all external dependencies:
   - `unittest.mock.patch` for `os.getenv`, API clients, `requests.get`.
   - Mock `alert()` to suppress output or assert log messages.
   - Mock `ollama_available()` and `ollama_json()` to control LLM fallback paths.
6. Test the local/template fallback paths directly (these have no external dependencies):
   - `score_job._local_score()` -- pure function, takes job dict + profile dict.
   - `generate_cover_letter._local_cover_letter()` -- pure function, template-based.
   - `tailor_resume._local_resume()` -- pure function, template-based.
   - `tailor_resume._clean_output()` -- pure function, text processing.
   - `generate_cover_letter._clean_cl_output()` -- pure function, text processing.
   - `apply_security.url_is_safe()` -- pure function, URL validation.
   - `apply_security.sanitize_url()` -- pure function.
   - `apply_security.safe_resume_path()` -- pure function, path validation.
   - `anti_detect.get_human_delay()` -- pure function (random but bounded).
   - `search_aggregator._normalize_text()` -- pure function.
   - `search_aggregator._fuzzy_match()` -- pure function.
   - `generate_pdf._parse_resume_text()` -- pure function, text parsing.
   - `generate_pdf._sanitize_latin1()` -- pure function.
   - `__init__.safe_job_id()` -- pure function.
7. Test data: create fixtures in `tests/fixtures/` with sample job dicts, profile dicts, and resume text.
