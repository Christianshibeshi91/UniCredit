"""Fully automated LinkedIn Easy Apply with multi-page form handling.

Handles 1-5 page Easy Apply forms by:
1. Reading intake_form.json for pre-filled answers
2. Fuzzy-matching form field labels to known question patterns
3. Typing human-like with anti-detection delays
4. Auto-submitting without human intervention
"""

import asyncio
import json
import os
import re
import random
from datetime import date

from playwright.async_api import async_playwright  # pyre-ignore[21]

from LinkedinAutomation.save_linkedin_auth import load_auth  # pyre-ignore[21]
from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation import safe_job_id  # pyre-ignore[21]
from LinkedinAutomation.apply_security import (  # pyre-ignore[21]
    sanitize_url,
    safe_resume_path_with_fallback,
    restrict_file_permissions,
)
from LinkedinAutomation.anti_detect import (  # pyre-ignore[21]
    get_human_delay,
    get_human_delay_ms,
    get_random_ua,
    get_viewport,
    type_like_human,
    move_and_click,
    apply_stealth_to_context,
    random_browse,
)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
RUN_STATE_PATH = os.path.join(BASE_DIR, ".tmp", "run_state.json")
SCREENSHOTS_DIR = os.path.join(BASE_DIR, ".tmp", "screenshots")
INTAKE_FORM_PATH = os.path.join(BASE_DIR, "candidate", "intake_form.json")
PROFILE_PATH = os.path.join(BASE_DIR, "candidate", "profile.json")
LEARNED_ANSWERS_PATH = os.path.join(BASE_DIR, "candidate", "learned_answers.json")

# --- Known field patterns mapped to intake_form.json paths ---
# Each tuple: (regex_pattern, intake_form_section, intake_form_key)
_FIELD_PATTERNS = [
    # Contact
    (r"first\s*name", "contact", "first_name"),
    (r"last\s*name", "contact", "last_name"),
    (r"e[\-\s]?mail", "contact", "email"),
    (r"phone|mobile|cell", "contact", "phone"),
    (r"city", "contact", "city"),
    (r"state|province", "contact", "state"),
    (r"zip|postal", "contact", "zip_code"),
    (r"country", "contact", "country"),
    (r"linkedin.*url|linkedin.*profile", "contact", "linkedin_url"),

    # Work authorization
    (r"authorized.*work|legally.*work|eligible.*work|right.*work", "work_authorization", "authorized_to_work_in_us"),
    (r"sponsor|visa\s*sponsor", "work_authorization", "require_sponsorship"),
    (r"visa\s*transfer", "work_authorization", "require_visa_transfer"),
    (r"citizen", "work_authorization", "us_citizen"),
    (r"green\s*card|permanent\s*resident", "work_authorization", "green_card"),

    # Experience years
    (r"total.*year|year.*experience|how\s*many\s*year", "experience", "total_years"),
    (r"power\s*platform.*year", "experience", "power_platform_years"),
    (r"power\s*app.*year", "experience", "power_apps_years"),
    (r"power\s*automate.*year", "experience", "power_automate_years"),
    (r"power\s*bi.*year", "experience", "power_bi_years"),
    (r"dynamics\s*365.*year|d365.*year", "experience", "dynamics_365_years"),
    (r"sharepoint.*year", "experience", "sharepoint_years"),
    (r"azure.*year", "experience", "azure_years"),
    (r"dataverse.*year", "experience", "dataverse_years"),
    (r"architect.*year", "experience", "solution_architecture_years"),
    (r"ci.?cd.*year|devops.*year", "experience", "ci_cd_years"),
    (r"javascript.*year|js.*year", "experience", "javascript_years"),
    (r"typescript.*year|ts.*year", "experience", "typescript_years"),
    (r"sql.*year", "experience", "sql_years"),
    (r"python.*year", "experience", "python_years"),
    (r"manag.*year|lead.*year|supervis.*year", "experience", "management_years"),

    # Education
    (r"degree|education.*level|highest.*education", "education", "degree"),
    (r"school|university|college|institution", "education", "school"),
    (r"field.*study|major|discipline", "education", "field_of_study"),
    (r"graduat.*year|year.*graduat", "education", "graduation_year"),

    # Preferences
    (r"desired.*salary|expected.*salary|salary.*expect|compensation", "preferences", "desired_salary"),
    (r"start\s*date|when.*start|earliest.*start|available.*start", "preferences", "start_date"),
    (r"relocat", "preferences", "willing_to_relocate"),
    (r"work.*type|remote.*hybrid|on.*site|work.*arrangement", "preferences", "work_type"),

    # Screening
    (r"security.*clearance|clearance", "screening", "security_clearance"),
    (r"travel|willing.*travel", "screening", "willing_to_travel"),
    (r"travel.*percent|%.*travel", "screening", "travel_percentage"),
    (r"veteran|military", "screening", "veteran_status"),
    (r"disabilit", "screening", "disability_status"),
    (r"gender", "screening", "gender"),
    (r"race|ethnicit", "screening", "race_ethnicity"),
    (r"lgbtq|sexual.*orient", "screening", "lgbtq"),
]


def _load_intake_form():
    """Load intake form answers."""
    if os.path.exists(INTAKE_FORM_PATH):
        with open(INTAKE_FORM_PATH, "r") as f:
            return json.load(f)
    return {}


def _load_profile():
    """Load candidate profile."""
    if os.path.exists(PROFILE_PATH):
        with open(PROFILE_PATH, "r") as f:
            return json.load(f)
    return {}


def _load_learned_answers():
    """Load previously learned answers from admin Q&A."""
    if os.path.exists(LEARNED_ANSWERS_PATH):
        with open(LEARNED_ANSWERS_PATH, "r") as f:
            try:
                return json.load(f)
            except (json.JSONDecodeError, TypeError):
                return {}
    return {}


def _save_learned_answer(label, answer):
    """Persist a new learned answer (atomic write). Restricts permissions to owner only (PII)."""
    learned = _load_learned_answers()
    learned[label.strip()] = answer.strip()  # pyre-ignore[29]
    tmp_path = LEARNED_ANSWERS_PATH + ".tmp"
    os.makedirs(os.path.dirname(LEARNED_ANSWERS_PATH), exist_ok=True)
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(learned, f, indent=2, ensure_ascii=False)
    os.replace(tmp_path, LEARNED_ANSWERS_PATH)
    restrict_file_permissions(LEARNED_ANSWERS_PATH)


def _match_field_to_answer(label_text, intake):
    """Match a form field label to an intake form answer using pattern matching.

    Returns the answer string or empty string if no match.
    """
    label_lower = label_text.lower().strip()

    # Try pattern-based matching first
    for pattern, section, key in _FIELD_PATTERNS:
        if re.search(pattern, label_lower):
            section_data = intake.get(section, {})
            answer = section_data.get(key, "")
            if answer:
                return str(answer)

    # Try custom_answers with fuzzy substring matching
    custom = intake.get("custom_answers", {})
    for question, answer in custom.items():
        q_lower = question.lower()
        # Check if the label is a substring of the question or vice versa
        if label_lower in q_lower or q_lower in label_lower:
            return str(answer)
        # Check word overlap (at least 3 significant words in common)
        label_words = set(w for w in label_lower.split() if len(w) > 3)
        q_words = set(w for w in q_lower.split() if len(w) > 3)
        overlap = label_words & q_words
        if len(overlap) >= 2:
            return str(answer)

    # Try learned answers (previously answered via Telegram Q&A)
    learned = _load_learned_answers()
    for saved_label, saved_answer in learned.items():  # pyre-ignore[16]
        saved_lower = saved_label.lower().strip()
        if label_lower == saved_lower:
            return str(saved_answer)
        if label_lower in saved_lower or saved_lower in label_lower:
            return str(saved_answer)
        # Word overlap check
        label_words = set(w for w in label_lower.split() if len(w) > 3)
        saved_words = set(w for w in saved_lower.split() if len(w) > 3)
        overlap = label_words & saved_words
        if len(overlap) >= 2:
            return str(saved_answer)

    return ""


def _load_run_state():
    """Load run state or return fresh default."""
    if os.path.exists(RUN_STATE_PATH):
        with open(RUN_STATE_PATH, "r") as f:
            return json.load(f)
    return {"run_date": "", "applications_today": 0, "jobs_processed": [], "errors": []}


def _save_run_state(state):
    """Save run state to disk."""
    os.makedirs(os.path.dirname(RUN_STATE_PATH), exist_ok=True)
    with open(RUN_STATE_PATH, "w") as f:
        json.dump(state, f, indent=2)


def _check_daily_cap(max_per_day):
    """Check if daily application cap has been reached."""
    state = _load_run_state()
    today = date.today().isoformat()
    if state.get("run_date") != today:
        state["run_date"] = today  # pyre-ignore[29]
        state["applications_today"] = 0  # pyre-ignore[29]
        state["jobs_processed"] = []  # pyre-ignore[29]
        state["errors"] = []  # pyre-ignore[29]
        _save_run_state(state)
    return state["applications_today"] < max_per_day  # pyre-ignore[29]


async def _fill_text_field(page, element, value, intake):
    """Fill a text input or textarea with the matched value."""
    try:
        await element.click()
        await asyncio.sleep(get_human_delay("click"))
        # Clear and type human-like
        await element.fill("")
        for char in value:
            await page.keyboard.type(char)
            delay = get_human_delay("type_char")
            if random.random() < 0.05:
                delay += random.uniform(0.2, 0.5)
            await asyncio.sleep(delay)
    except Exception:
        # Fallback: direct fill
        try:
            await element.fill(value)
        except Exception:
            pass


async def _handle_select(page, element, value):
    """Handle a <select> dropdown by selecting the best matching option."""
    try:
        options = await element.query_selector_all("option")
        best_match = None
        value_lower = value.lower()

        for option in options:
            text = (await option.text_content() or "").strip().lower()
            opt_value = (await option.get_attribute("value") or "").lower()

            if text == value_lower or opt_value == value_lower:
                best_match = await option.get_attribute("value")
                break
            if value_lower in text or text in value_lower:
                best_match = await option.get_attribute("value")

        if best_match:
            await element.select_option(value=best_match)
            await asyncio.sleep(get_human_delay("click"))
            return True

        # Try selecting by visible text containing "yes"/"no" for boolean questions
        if value_lower in ("yes", "no", "true", "false"):
            for option in options:
                text = (await option.text_content() or "").strip().lower()
                if value_lower in text:
                    opt_val = await option.get_attribute("value")
                    await element.select_option(value=opt_val)
                    await asyncio.sleep(get_human_delay("click"))
                    return True
    except Exception:
        pass
    return False


async def _handle_radio_buttons(page, fieldset, value):
    """Handle radio button groups by clicking the best matching option."""
    try:
        labels = await fieldset.query_selector_all("label")
        value_lower = value.lower()

        for label in labels:
            text = (await label.text_content() or "").strip().lower()
            if text == value_lower or value_lower in text or text in value_lower:
                await label.click()
                await asyncio.sleep(get_human_delay("click"))
                return True

        # For Yes/No questions
        if value_lower in ("yes", "true"):
            for label in labels:
                text = (await label.text_content() or "").strip().lower()
                if "yes" in text:
                    await label.click()
                    await asyncio.sleep(get_human_delay("click"))
                    return True
        elif value_lower in ("no", "false"):
            for label in labels:
                text = (await label.text_content() or "").strip().lower()
                if "no" in text:
                    await label.click()
                    await asyncio.sleep(get_human_delay("click"))
                    return True
    except Exception:
        pass
    return False


def _resolve_option_answer(answer, options):
    """Map a numbered answer like '2' to the actual option text.

    If admin replies '2', return the 2nd option from the list.
    If it's not a number, return the answer as-is.
    """
    answer = answer.strip()
    if answer.isdigit():
        idx = int(answer) - 1  # 1-based
        if 0 <= idx < len(options):
            return options[idx]
    return answer


async def _ask_admin(label, page, job_title, field_type, options, ask_callback):
    """Ask admin via Telegram for an unknown field answer.

    Takes a screenshot, sends it with the question, waits up to 5 min.
    Returns the answer string or None if skipped/timed out.
    """
    # Take screenshot of the current form page
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
    screenshot_path = os.path.join(SCREENSHOTS_DIR, "ask_admin_field.png")
    await page.screenshot(path=screenshot_path, full_page=True)

    # Build the question message
    options_text = ""
    if options:
        options_text = "\n".join(f"  {i+1}. {opt}" for i, opt in enumerate(options))
        options_text = f"\n\nOptions:\n{options_text}\n(Reply with the number)"

    question = (
        f"Unknown field while applying to: {job_title}\n\n"
        f"Field: {label}\n"
        f"Type: {field_type}{options_text}\n\n"
        f"Reply with the answer, or /skip to leave blank."
    )

    # Call the Telegram ask callback
    answer = await ask_callback(question, screenshot_path)

    if answer is None or answer.strip().lower() == "/skip":  # pyre-ignore[16]
        return None

    # If options exist, resolve numbered answers
    if options:
        answer = _resolve_option_answer(answer, options)

    return answer


async def _fill_form_page(page, intake, resume_path, ask_callback=None, job_title=""):
    """Scan and fill all visible form fields on the current Easy Apply page.

    Returns list of (label, filled_status) for logging.
    """
    filled = []
    unfilled = []

    # Handle file upload first (resume)
    try:
        file_inputs = await page.query_selector_all("input[type='file']")
        for file_input in file_inputs:
            if resume_path and os.path.exists(resume_path):
                await file_input.set_input_files(resume_path)
                await asyncio.sleep(get_human_delay("between_fields"))
                filled.append(("resume_upload", True))
    except Exception as e:
        unfilled.append(("resume_upload", str(e)))

    # Find all form groups (LinkedIn wraps each question in a div with label)
    form_groups = await page.query_selector_all(
        ".jobs-easy-apply-form-section__grouping, "
        ".fb-dash-form-element, "
        "[data-test-form-element], "
        ".artdeco-text-input, "
        ".jobs-easy-apply-form-element"
    )

    # Also try generic label + input pairs
    if not form_groups:
        form_groups = await page.query_selector_all("div.mt2, div.mb2, div.mv2, .form-component")

    for group in form_groups:
        try:
            # Get the label text
            label_el = await group.query_selector(
                "label, .fb-dash-form-element__label, "
                "[data-test-form-element-label], span.t-14"
            )
            label_text = ""
            if label_el:
                label_text = (await label_el.text_content() or "").strip()

            # Also check for aria-label or placeholder as fallback
            if not label_text:
                inputs = await group.query_selector_all("input, textarea, select")
                for inp in inputs:
                    label_text = (
                        await inp.get_attribute("aria-label")
                        or await inp.get_attribute("placeholder")
                        or ""
                    )
                    if label_text:
                        break

            if not label_text:
                continue

            # Match label to answer
            answer = _match_field_to_answer(label_text, intake)

            # Detect field type and options for potential admin Q&A
            select_el = await group.query_selector("select")
            radios = await group.query_selector_all("input[type='radio']")
            text_input = await group.query_selector(
                "input[type='text'], input[type='email'], input[type='tel'], "
                "input[type='number'], input[type='url'], input:not([type]), textarea"
            )
            checkbox = await group.query_selector("input[type='checkbox']")

            # If no match and ask_callback is available, ask admin via Telegram
            if not answer and ask_callback:
                field_type = "text"
                options = []

                if select_el:
                    field_type = "select"
                    opt_els = await select_el.query_selector_all("option")
                    for opt_el in opt_els:
                        t = (await opt_el.text_content() or "").strip()
                        if t and t.lower() not in ("select an option", "-- select --", ""):
                            options.append(t)
                elif radios:
                    field_type = "radio"
                    labels_els = await group.query_selector_all("label")
                    for lbl in labels_els:
                        t = (await lbl.text_content() or "").strip()
                        if t:
                            options.append(t)
                elif checkbox:
                    field_type = "checkbox"
                    options = ["Yes", "No"]

                admin_answer = await _ask_admin(
                    label_text, page, job_title, field_type, options, ask_callback
                )
                if admin_answer:
                    answer = admin_answer
                    # Save for future auto-fill
                    _save_learned_answer(label_text, answer)
                    alert("Learned", f"Saved answer for '{label_text}': {answer}")

            if not answer:
                unfilled.append((label_text, "no_match"))
                continue

            # Try to fill the field based on its type
            # Check for select
            if select_el:
                success = await _handle_select(page, select_el, answer)
                filled.append((label_text, success))  # pyre-ignore[29]
                await asyncio.sleep(get_human_delay("between_fields"))
                continue

            # Check for radio buttons
            if radios:
                success = await _handle_radio_buttons(page, group, answer)
                filled.append((label_text, success))  # pyre-ignore[29]
                await asyncio.sleep(get_human_delay("between_fields"))
                continue

            # Check for text input or textarea
            if text_input:
                # Check if already filled
                current_val = await text_input.input_value()
                if current_val and current_val.strip():
                    filled.append((label_text, "already_filled"))  # pyre-ignore[29,6]
                    continue

                await _fill_text_field(page, text_input, answer, intake)
                filled.append((label_text, True))
                await asyncio.sleep(get_human_delay("between_fields"))
                continue

            # Check for checkbox
            if checkbox:
                answer_lower = answer.lower()  # pyre-ignore[16]
                if answer_lower in ("yes", "true", "agree", "i agree"):
                    is_checked = await checkbox.is_checked()
                    if not is_checked:
                        await checkbox.click()
                        await asyncio.sleep(get_human_delay("click"))
                filled.append((label_text, True))
                continue

            unfilled.append((label_text, "no_input_found"))

        except Exception as e:
            unfilled.append(("unknown_field", str(e)))

    return filled, unfilled


async def _click_button(page, button_texts):
    """Try clicking a button matching any of the given texts. Returns True if clicked."""
    for text in button_texts:
        # Try aria-label match
        btn = await page.query_selector(f"button[aria-label*='{text}']")
        if btn and await btn.is_visible():
            await move_and_click(page, f"button[aria-label*='{text}']")
            return True

        # Try text content match
        buttons = await page.query_selector_all("button")
        for b in buttons:
            b_text = (await b.text_content() or "").strip().lower()
            if text.lower() in b_text and await b.is_visible():  # pyre-ignore[29,16]
                await b.click()
                await asyncio.sleep(get_human_delay("click"))
                return True
    return False


async def _apply_async(job, resume_path, cover_letter_text, ask_callback=None):
    """Full automated Easy Apply flow."""
    job_id = safe_job_id(job.get("job_id", "unknown"))
    job_url = job.get("job_url", "")
    title = job.get("title", "Unknown")
    company = job.get("company", "Unknown")

    safe_url = sanitize_url(job_url)
    if not safe_url:
        alert("Easy Apply", f"Blocked unsafe job URL for {title}", "error")
        return False
    job_url = safe_url

    resume_requested = (resume_path or "").strip()
    resume_path = safe_resume_path_with_fallback(resume_requested, BASE_DIR)
    if resume_requested and resume_path is None:
        alert("Easy Apply", "Resume path rejected or not found (allowed: .tmp/, candidate/)", "warning")

    intake = _load_intake_form()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=os.getenv("HEADLESS", "true").lower() == "true")
        viewport = get_viewport()
        ua = get_random_ua()

        context = await load_auth(browser, viewport=viewport, user_agent=ua)
        await apply_stealth_to_context(context)
        page = await context.new_page()

        try:
            # Navigate to job page
            alert("Easy Apply", f"Navigating to {title} at {company}...")
            await page.goto(job_url, wait_until="domcontentloaded")
            await asyncio.sleep(get_human_delay("page_load"))

            # Click Easy Apply button
            easy_btn = await page.query_selector(
                "button.jobs-apply-button, "
                "button[aria-label*='Easy Apply'], "
                "button.jobs-apply-button--top-card"
            )
            if not easy_btn:
                alert("Easy Apply", f"No Easy Apply button found for {title}", "warning")
                await browser.close()
                return False

            await easy_btn.click()
            await asyncio.sleep(get_human_delay("page_load"))

            # Multi-page form loop (max 10 pages as safety)
            submitted = False
            for page_num in range(1, 11):
                alert("Easy Apply", f"Page {page_num} of form for {title}...")
                await asyncio.sleep(get_human_delay("between_fields"))

                # Fill all fields on current page
                filled, unfilled = await _fill_form_page(  # pyre-ignore[29,10]
                    page, intake, resume_path,
                    ask_callback=ask_callback, job_title=f"{title} at {company}",
                )

                for label, status in filled:
                    alert("Field", f"  Filled: {label} = {status}")
                for label, reason in unfilled:
                    alert("Field", f"  Unfilled: {label} ({reason})", "warning")

                # Check for Submit button first (final page)
                submit_btn = await page.query_selector(
                    "button[aria-label*='Submit application'], "
                    "button[aria-label*='Submit'], "
                    "button[data-easy-apply-submit]"
                )
                if submit_btn and await submit_btn.is_visible():
                    submit_text = (await submit_btn.text_content() or "").strip().lower()
                    if "submit" in submit_text:
                        # Take screenshot before submitting
                        os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
                        screenshot_path = os.path.join(
                            SCREENSHOTS_DIR, f"easy_apply_{job_id}_submit.png"
                        )
                        await page.screenshot(path=screenshot_path, full_page=True)

                        # Submit!
                        await submit_btn.click()
                        await asyncio.sleep(get_human_delay("page_load"))
                        submitted = True

                        # Screenshot confirmation
                        confirm_path = os.path.join(
                            SCREENSHOTS_DIR, f"easy_apply_{job_id}_confirmed.png"
                        )
                        await page.screenshot(path=confirm_path, full_page=True)
                        alert("Submitted", f"Application submitted for {title} at {company}")
                        break

                # Check for Review button
                review_clicked = await _click_button(page, ["Review", "review"])
                if review_clicked:
                    await asyncio.sleep(get_human_delay("page_load"))
                    continue

                # Check for Next button
                next_clicked = await _click_button(page, ["Next", "Continue", "next"])
                if next_clicked:
                    await asyncio.sleep(get_human_delay("page_load"))
                    continue

                # If no navigation button found, try Submit one more time
                all_buttons = await page.query_selector_all("button.artdeco-button--primary")
                for btn in all_buttons:
                    btn_text = (await btn.text_content() or "").strip().lower()
                    if "submit" in btn_text:
                        os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
                        screenshot_path = os.path.join(
                            SCREENSHOTS_DIR, f"easy_apply_{job_id}_submit.png"
                        )
                        await page.screenshot(path=screenshot_path, full_page=True)
                        await btn.click()
                        await asyncio.sleep(get_human_delay("page_load"))
                        submitted = True
                        confirm_path = os.path.join(
                            SCREENSHOTS_DIR, f"easy_apply_{job_id}_confirmed.png"
                        )
                        await page.screenshot(path=confirm_path, full_page=True)
                        alert("Submitted", f"Application submitted for {title} at {company}")
                        break

                if submitted:
                    break

                # No button found — might be stuck
                alert("Easy Apply", f"No navigation button found on page {page_num}", "warning")
                break

            if submitted:
                # Update run state
                state = _load_run_state()
                state["applications_today"] = state.get("applications_today", 0) + 1  # pyre-ignore[29]
                processed = state.get("jobs_processed", [])  # pyre-ignore[29]
                processed.append(job_id)  # pyre-ignore[29]
                state["jobs_processed"] = processed  # pyre-ignore[29]
                _save_run_state(state)

                # Random browse between applications
                await random_browse(page)

                await browser.close()
                return True
            else:
                alert("Easy Apply", f"Could not complete application for {title}", "warning")
                os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
                fail_path = os.path.join(
                    SCREENSHOTS_DIR, f"easy_apply_{job_id}_failed.png"
                )
                await page.screenshot(path=fail_path, full_page=True)

        except Exception as e:
            alert("Easy Apply Error", f"Failed for {title}: {e}", "error")
            try:
                os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
                err_path = os.path.join(
                    SCREENSHOTS_DIR, f"easy_apply_{job_id}_error.png"
                )
                await page.screenshot(path=err_path, full_page=True)
            except Exception:
                pass

        await browser.close()
        return False


async def apply_async(job, resume_path, cover_letter, max_per_day=15, ask_callback=None):
    """Async entry point for use inside the bot's event loop.

    Use this instead of apply() when calling from an already-running
    asyncio event loop (e.g. the Telegram bot's _handle_approve).
    """
    if not _check_daily_cap(max_per_day):
        alert("Daily Cap", "Maximum daily applications reached.", "warning")
        return False
    return await _apply_async(job, resume_path, cover_letter, ask_callback=ask_callback)


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
    if not _check_daily_cap(max_per_day):
        alert("Daily Cap", "Maximum daily applications reached.", "warning")
        return False

    # Handle case where we're already inside an event loop (e.g. Telegram bot)
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures

        def _run_apply():  # pyre-ignore[53]
            return asyncio.run(_apply_async(job, resume_path, cover_letter, ask_callback=ask_callback))

        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(_run_apply).result(timeout=300)  # pyre-ignore[6]

    return asyncio.run(_apply_async(job, resume_path, cover_letter, ask_callback=ask_callback))


if __name__ == "__main__":
    print("apply_easy_apply module loaded OK (full auto mode)")
