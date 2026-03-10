# Code Conventions

## Project Structure

Use a flat module layout inside `LinkedinAutomation/`. Each module is a single file that owns one domain concern. Do not nest subdirectories under `LinkedinAutomation/` except for self-contained subsystems (e.g., `vps_computer/`, `web_scraper/`).

```
LinkedinAutomation/
    __init__.py          # Shared utilities (safe_job_id, load_profile)
    score_job.py         # One concern per file
    tailor_resume.py
    generate_cover_letter.py
    ...
run_daily.py             # Top-level entry points live at project root
run_scheduler.py
test_end_to_end.py
```

## Naming

### Files
- Use `snake_case.py` for all Python modules.
- Name files by their primary verb+noun action: `score_job.py`, `tailor_resume.py`, `generate_cover_letter.py`, `apply_easy_apply.py`, `log_to_sheets.py`.
- Prefix search modules with `search_`: `search_linkedin_jobs.py`, `search_indeed_jobs.py`, `search_aggregator.py`.
- Prefix entry-point scripts with `run_`: `run_daily.py`, `run_scheduler.py`, `run_telegram_bot.py`.

### Functions
- Use `snake_case` for all functions and variables.
- Prefix private/internal functions with a single underscore: `_load_profile()`, `_build_scoring_prompt()`, `_local_score()`, `_extract_from_html()`.
- Name the primary public function with a short verb that matches the module's purpose:
  - `score_job.py` exports `score()`
  - `tailor_resume.py` exports `tailor()`
  - `generate_cover_letter.py` exports `generate()`
  - `apply_easy_apply.py` exports `apply()` and `apply_async()`
  - `deduplicate_jobs.py` exports `deduplicate()`
  - `find_connections.py` exports `find()`
- Use `is_` prefix for boolean-returning functions: `is_available()`, `url_is_safe()`.

### Variables and Constants
- Use `UPPER_SNAKE_CASE` for module-level constants: `BASE_DIR`, `PROFILE_PATH`, `RUN_STATE_PATH`, `OLLAMA_URL`, `NAVY`, `DARK_GRAY`.
- Use `snake_case` for local variables and function parameters.
- Use descriptive dict key names in snake_case for job data: `job_id`, `job_url`, `is_easy_apply`, `remote_status`, `matched_skills`.

### Classes
- Use `PascalCase` for classes: `ResumePDF`, `ExperienceEntry`, `ResumeData`.
- Classes are rare; prefer module-level functions. Use classes only for PDF generation (`ResumePDF(FPDF)`) and TypedDicts (`ExperienceEntry`, `ResumeData`).

## Module Boilerplate

Every module in `LinkedinAutomation/` follows this exact structure:

```python
"""One-line description of what this module does."""

import json
import os
import re
from dotenv import load_dotenv  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation import safe_job_id  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

PROFILE_PATH = os.path.join(BASE_DIR, "candidate", "profile.json")
```

Rules:
1. Start with a triple-quoted docstring (one line or multi-line with blank line after summary).
2. Standard library imports first, then third-party, then `LinkedinAutomation` imports.
3. Add `# pyre-ignore[21]` to all third-party and intra-package imports.
4. Compute `BASE_DIR` as `os.path.dirname(os.path.dirname(__file__))` (two levels up from module to project root).
5. Call `load_dotenv()` at module level immediately after `BASE_DIR`.
6. Define path constants (`PROFILE_PATH`, `RUN_STATE_PATH`, etc.) at module level.

## Docstrings

- Use triple-quoted docstrings on every module and every public function.
- Keep docstrings to 1-3 lines for simple functions. Use Google-style `Args:` / `Returns:` blocks only for complex public APIs (see `apply()` in `apply_easy_apply.py`).
- Private functions (`_` prefixed) get a one-line docstring or none.

```python
def score(job, profile=None):
    """Score a job against the candidate profile. Tries Ollama first, falls back to local."""
```

```python
def apply(job, resume_path, cover_letter, max_per_day=15, ask_callback=None):
    """Apply to a job via LinkedIn Easy Apply. Fully automated (sync wrapper).

    Args:
        job: Job dict with job_url, job_id, title, company, etc.
        resume_path: Path to the resume file to upload.
        cover_letter: Cover letter text (logged but not always used in Easy Apply).
        max_per_day: Maximum applications per day.
        ask_callback: Optional async callback for asking admin about unknown fields.

    Returns:
        True if application was submitted, False otherwise.
    """
```

## Type Annotations

- Use type annotations on function signatures in utility/security modules: `url_is_safe(url: str) -> bool`, `safe_job_id(job_id) -> str`, `clean_old_screenshots(retention_days: int | None = None) -> int`.
- Use `TypedDict` for structured data shapes in PDF generation: `ExperienceEntry`, `ResumeData`.
- Core pipeline functions (`score()`, `tailor()`, `generate()`) use untyped `dict` parameters for job data and profile. Do not add complex type annotations to these.
- Use Python 3.10+ union syntax (`str | None`) not `Optional[str]`.
- Add `# pyre-ignore[N]` comments to suppress Pyre type checker warnings on third-party imports and dynamic dict access.

## Imports

- Import the `alert` function from `LinkedinAutomation.alert_user` in every module that does logging.
- Import `safe_job_id` and `load_profile` from `LinkedinAutomation.__init__` when needed.
- Use deferred/lazy imports for heavy dependencies inside functions, not at module level:
  ```python
  def _search_indeed():
      from LinkedinAutomation.search_indeed_jobs import search as indeed_search
      return ("Indeed", indeed_search(max_jobs=jobs_per_platform))
  ```
- Alias imports when the function name would collide: `from LinkedinAutomation.apply_easy_apply import apply as easy_apply`.

## Error Handling

### Pattern: Try-except with alert + fallback
The dominant pattern is try/except around external calls, log the error via `alert()`, and fall back to a simpler strategy:

```python
try:
    result = external_api_call()
except Exception as e:
    alert("Module", f"API failed: {e}", "warning")
    result = local_fallback()
```

### Pattern: Graceful degradation chain
For LLM-dependent features, use a 3-tier fallback: Claude API -> Ollama (local LLM) -> keyword/template fallback. See `score_job.py`, `tailor_resume.py`, `generate_cover_letter.py`:

```python
result = None

# Tier 1: Claude API
api_key = os.getenv("ANTHROPIC_API_KEY", "")
if api_key:
    try:
        result = claude_call(...)
    except Exception as e:
        alert("Module", f"Claude unavailable ({e}), trying next", "warning")

# Tier 2: Ollama (free local LLM)
if result is None and ollama_available():
    result = ollama_call(...)

# Tier 3: Free local fallback (no API)
if result is None:
    result = template_fallback(...)
```

### Pattern: Silent exception swallowing for best-effort operations
Use bare `except Exception: pass` only for non-critical side effects (desktop notifications, file permissions, screenshot capture):

```python
try:
    notification.notify(...)
except Exception:
    pass  # Desktop notification is best-effort
```

### Pattern: Explicit error reporting for critical failures
Use `alert("Module", message, "error")` followed by early return or `sys.exit(1)` for unrecoverable failures:

```python
if not job["title"]:
    alert("TEST", "Could not parse job title -- aborting", "error")
    sys.exit(1)
```

## Logging

Use the `alert()` function from `LinkedinAutomation/alert_user.py` for all logging. Do not use `print()` for operational logs (only in `__main__` blocks and `log_to_sheets.py`).

```python
alert("Score", f"{title}: {job_score}/100 ({grade})")           # info (default)
alert("PDF", f"Resume PDF failed ({e}), using txt", "warning")  # warning
alert("Search Failed", str(e), "error")                         # error
```

Rules:
- First argument is a short category tag: `"Score"`, `"PDF"`, `"Daily Run"`, `"Easy Apply"`, `"Telegram"`.
- Second argument is the human-readable message with f-string interpolation.
- Third argument is the level: `"info"` (default), `"warning"`, or `"error"`.
- All timestamps are in Pacific Time (`America/Los_Angeles`), formatted as `%I:%M %p PT`.

For the scheduler (`run_scheduler.py`), use Python's `logging` module directly since it runs as a long-lived process with file-based logging.

## Configuration

- Store all configuration in `.env` (loaded via `python-dotenv`).
- Access config via `os.getenv("KEY", "default_value")`.
- Convert numeric env vars inline: `int(os.getenv("MIN_SCORE_THRESHOLD", "70"))`.
- Never hardcode API keys, tokens, or credentials in source files.
- Reference `.env.example` at `C:\Users\chris\Downloads\Anti-gravity\.env.example` for the canonical list of config keys.

## File I/O Patterns

### Path construction
Always build paths from `BASE_DIR`:
```python
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
out_path = os.path.join(BASE_DIR, ".tmp", f"score_{job_id}.json")
```

### Safe directory creation before write
```python
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2)
```

### Atomic writes for PII files
Use write-to-temp then `os.replace()` for files containing sensitive data:
```python
tmp_path = LEARNED_ANSWERS_PATH + ".tmp"
with open(tmp_path, "w", encoding="utf-8") as f:
    json.dump(learned, f, indent=2, ensure_ascii=False)
os.replace(tmp_path, LEARNED_ANSWERS_PATH)
restrict_file_permissions(LEARNED_ANSWERS_PATH)
```

### Temporary files
Store all generated artifacts (resumes, cover letters, PDFs, scores, screenshots) under `.tmp/`:
- `.tmp/resume_{job_id}.txt`
- `.tmp/cl_{job_id}.txt`
- `.tmp/resume_{job_id}.pdf`
- `.tmp/score_{job_id}.json`
- `.tmp/screenshots/`
- `.tmp/run_state.json`

## Async Patterns

- Use `asyncio` for Playwright browser automation.
- Provide both sync and async entry points for browser operations:
  ```python
  async def apply_async(job, resume_path, cover_letter, ...):
      """Async entry point for use inside the bot's event loop."""

  def apply(job, resume_path, cover_letter, ...):
      """Sync wrapper."""
      return asyncio.run(_apply_async(...))
  ```
- Use `async with async_playwright() as p:` for browser lifecycle.
- Insert human-like delays between all browser interactions using `get_human_delay()`.

## Concurrency

- Use `concurrent.futures.ThreadPoolExecutor` for parallel CPU/IO-bound work (resume + cover letter + connections):
  ```python
  with ThreadPoolExecutor(max_workers=3) as pool:
      fut_resume = pool.submit(tailor, job, score_result, profile)
      fut_cl = pool.submit(generate, job, score_result, profile)
      fut_conn = pool.submit(find, company, title)
      resume_text = fut_resume.result()
      cl_text = fut_cl.result()
  ```
- Keep `max_workers` low (2-4) to avoid rate limiting on external APIs.

## Security Conventions

- Validate all URLs with `sanitize_url()` before browser navigation (SSRF prevention).
- Validate all file paths with `safe_resume_path()` before file operations (path traversal prevention).
- Restrict file permissions on PII files with `restrict_file_permissions(path)` (sets `0o600`).
- Sanitize job IDs with `safe_job_id()` before using in file paths.
- Never log full credentials or tokens. Use `alert()` which truncates long messages.

## `__main__` Blocks

Every module includes an `if __name__ == "__main__":` block for standalone testing. Use it for:
1. Quick smoke tests with sample data.
2. Module load verification (`print("module_name module loaded OK")`).

```python
if __name__ == "__main__":
    sample_job = {"job_id": "test-score", "title": "Power Platform Architect", ...}
    result = score(sample_job)
    print(json.dumps(result, indent=2))
```

## Job Data Schema

The canonical job dict flows through the entire pipeline. Use these keys consistently:

```python
job = {
    "job_id": str,           # Unique identifier
    "title": str,            # Job title
    "company": str,          # Company name
    "location": str,         # Location string
    "remote_status": str,    # "Remote" | "Hybrid" | "Onsite" | ""
    "salary": str,           # Salary range as text
    "job_url": str,          # Full URL to job posting
    "description": str,      # Job description text (truncated to 5000 chars)
    "is_easy_apply": bool,   # Whether LinkedIn Easy Apply is available
    "source": str,           # "linkedin" | "indeed" | "glassdoor" | ...
}
```

## Dependencies

- Pin minimum versions in `requirements.txt` with `>=` syntax.
- Reference: `C:\Users\chris\Downloads\Anti-gravity\requirements.txt`.
- Key dependencies: `anthropic`, `playwright`, `python-telegram-bot`, `google-api-python-client`, `python-dotenv`, `fpdf2`, `requests`, `beautifulsoup4`, `schedule`.
