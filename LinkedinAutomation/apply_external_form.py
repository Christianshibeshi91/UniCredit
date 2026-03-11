"""Generic ATS external application form filler.

Handles Workday, Greenhouse, Lever, iCIMS, Taleo, SmartRecruiters, and
other ATS platforms by:
1. Navigating to the external application URL
2. Detecting form fields generically (label, aria-label, placeholder)
3. Matching fields to intake_form.json + learned_answers.json
4. Asking admin via Telegram for unknown fields
5. Saving answers for future auto-fill
6. Uploading resume where file inputs are found
7. Navigating multi-page forms and submitting
"""

import asyncio
import json
import os
import re

from playwright.async_api import async_playwright  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation import safe_job_id  # pyre-ignore[21]
from LinkedinAutomation.anti_detect import (  # pyre-ignore[21]
    get_human_delay,
    get_random_ua,
    get_viewport,
    apply_stealth_to_context,
)
from LinkedinAutomation.apply_easy_apply import (  # pyre-ignore[21]
    _match_field_to_answer,
    _load_intake_form,
    _load_learned_answers,
    _save_learned_answer,
    _fill_text_field,
    _handle_select,
    _handle_radio_buttons,
    _check_daily_cap,
    _load_run_state,
    _save_run_state,
    _load_profile,
)
from LinkedinAutomation.apply_external import extract_url  # pyre-ignore[21]
from LinkedinAutomation.apply_security import sanitize_url, safe_resume_path_with_fallback  # pyre-ignore[21]
from LinkedinAutomation.ollama_client import (  # pyre-ignore[21]
    generate_json as ollama_json,
    is_available as ollama_available,
)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
SCREENSHOTS_DIR = os.path.join(BASE_DIR, ".tmp", "screenshots")

# Common ATS submit/next button text patterns
_SUBMIT_TEXTS = [
    "submit", "submit application", "apply", "apply now",
    "complete application", "finish", "send application",
]
_NEXT_TEXTS = [
    "next", "continue", "save and continue", "save & continue",
    "proceed", "next step", "next page",
]
_SKIP_TEXTS = [
    "skip", "skip this step", "not now", "maybe later",
]

# Fields to skip (ATS boilerplate)
_SKIP_FIELD_LABELS = [
    "captcha", "recaptcha", "i agree", "terms and conditions",
    "privacy policy", "cookie", "subscribe", "newsletter",
]


async def _get_field_label(element, page):
    """Extract the label text for a form field using multiple strategies."""
    label_text = ""

    # Strategy 1: aria-label attribute
    label_text = await element.get_attribute("aria-label") or ""

    # Strategy 2: associated <label> via id (sanitize to prevent selector injection)
    if not label_text:
        el_id = (await element.get_attribute("id") or "").strip()
        if el_id and re.match(r"^[a-zA-Z0-9_\-]+$", el_id):
            label_el = await page.query_selector(f"label[for='{el_id}']")
            if label_el:
                label_text = (await label_el.text_content() or "").strip()

    # Strategy 3: parent or sibling label
    if not label_text:
        parent = await element.evaluate_handle("el => el.closest('div, fieldset, li, section')")
        if parent:
            label_el = await parent.as_element().query_selector("label")
            if label_el:
                label_text = (await label_el.text_content() or "").strip()

    # Strategy 4: placeholder
    if not label_text:
        label_text = await element.get_attribute("placeholder") or ""

    # Strategy 5: title attribute
    if not label_text:
        label_text = await element.get_attribute("title") or ""

    # Strategy 6: aria-labelledby
    if not label_text:
        labelled_by = await element.get_attribute("aria-labelledby") or ""
        if labelled_by:
            for lid in labelled_by.split():
                ref_el = await page.query_selector(f"#{lid}")
                if ref_el:
                    label_text = (await ref_el.text_content() or "").strip()
                    if label_text:
                        break

    # Strategy 7: name attribute as last resort
    if not label_text:
        name = await element.get_attribute("name") or ""
        if name:
            label_text = name.replace("_", " ").replace("-", " ").replace("[", " ").replace("]", "")

    return label_text.strip()


async def _should_skip_field(element, label_text):
    """Check if this field should be skipped."""
    if not label_text:
        return True

    lower = label_text.lower()
    # Skip ATS boilerplate
    if any(skip in lower for skip in _SKIP_FIELD_LABELS):
        return True

    # Skip hidden fields
    try:
        is_visible = await element.is_visible()
        if not is_visible:
            return True
    except Exception:
        return True

    # Skip already-filled fields
    try:
        tag = await element.evaluate("el => el.tagName.toLowerCase()")
        if tag in ("input", "textarea"):
            input_type = (await element.get_attribute("type") or "text").lower()
            if input_type in ("hidden", "submit", "button", "reset", "image"):
                return True
            val = await element.input_value()
            if val and val.strip():
                return True
    except Exception:
        pass

    return False


async def _collect_page_fields(page):
    """Scan all visible form fields on the current page into a manifest.

    Returns list of dicts with label, field_type, options, element, tag, input_type.
    """
    selectors = [
        "input:not([type='hidden']):not([type='submit']):not([type='button'])",
        "textarea",
        "select",
    ]
    manifest = []

    for selector in selectors:
        elements = await page.query_selector_all(selector)
        for element in elements:
            try:
                label_text = await _get_field_label(element, page)
                if await _should_skip_field(element, label_text):
                    continue

                tag = await element.evaluate("el => el.tagName.toLowerCase()")
                input_type = ""
                if tag == "input":
                    input_type = (await element.get_attribute("type") or "text").lower()

                # Determine field type and extract options
                field_type = "text"
                options = []

                if tag == "select":
                    field_type = "select"
                    opt_els = await element.query_selector_all("option")
                    for opt_el in opt_els:
                        t = (await opt_el.text_content() or "").strip()
                        if t and t.lower() not in (
                            "select", "select an option", "-- select --",
                            "choose", "please select", "",
                        ):
                            options.append(t)
                elif input_type == "radio":
                    field_type = "radio"
                elif input_type == "checkbox":
                    field_type = "checkbox"
                    options = ["Yes", "No"]
                elif tag == "textarea":
                    field_type = "textarea"

                manifest.append({
                    "label": label_text,
                    "field_type": field_type,
                    "options": options,
                    "element": element,
                    "tag": tag,
                    "input_type": input_type,
                })
            except Exception:
                continue

    return manifest


def _build_form_fill_prompt(fields, intake, profile, job_title):
    """Build the Ollama prompt for batch-matching form fields to candidate answers."""
    # Merge candidate data from profile.json and intake_form.json
    name = profile.get("name", "")
    parts = name.split() if name else []
    location = profile.get("location", "")
    loc_parts = location.split(",") if location else []

    candidate_data = {
        "name": name,
        "first_name": parts[0] if parts else "",
        "last_name": " ".join(parts[1:]) if len(parts) > 1 else "",  # pyre-ignore[29]
        "email": profile.get("email", ""),
        "phone": profile.get("phone", intake.get("contact", "")),
        "location": location,
        "city": loc_parts[0].strip() if loc_parts else "",
        "state": loc_parts[-1].strip().split()[0] if len(loc_parts) > 1 else "",
        "zip_code": location.split()[-1] if location and location.split()[-1].isdigit() else "",
        "country": "United States",
        "linkedin_url": profile.get("linkedin", ""),
        "title": profile.get("title", ""),
        "years_of_experience": profile.get("years_of_experience", intake.get("experience", "")),
        "work_authorization": intake.get("work_authorization", ""),
        "education": profile.get("education", intake.get("education", "")),
        "salary_range": f"${profile.get('salary_target_min', 0):,}-${profile.get('salary_target_max', 0):,}",
        "willing_to_relocate": "Yes",
        "remote_ok": profile.get("remote_ok", True),
        "certifications": ", ".join(profile.get("certifications", [])),
        "core_skills": ", ".join(profile.get("core_skills", [])[:10]),
        "summary": profile.get("summary", ""),
    }

    # Screening data from intake_form
    screening = intake.get("screening", {})
    if isinstance(screening, dict):
        candidate_data.update({
            "security_clearance": screening.get("security_clearance", ""),
            "willing_to_travel": screening.get("willing_to_travel", ""),
            "travel_percentage": screening.get("travel_percentage", ""),
            "veteran_status": screening.get("veteran_status", ""),
            "disability_status": screening.get("disability_status", ""),
            "gender": screening.get("gender", ""),
            "race_ethnicity": screening.get("race_ethnicity", ""),
        })

    custom_answers = intake.get("custom_answers", {})

    # Build field manifest for prompt (strip element handles)
    fields_for_prompt = []
    for i, f in enumerate(fields):
        desc = {"id": i, "label": f["label"], "type": f["field_type"]}
        if f["options"]:
            desc["options"] = f["options"]
        fields_for_prompt.append(desc)

    # Detect qwen model for /no_think prefix
    ollama_model = os.getenv("OLLAMA_MODEL", "qwen3:8b").lower()
    think_prefix = "/no_think\n" if "qwen" in ollama_model else ""

    prompt = f"""{think_prefix}You are a job application form filler. Given candidate data and form fields, return the correct answer for each field.

## Candidate Data
{json.dumps(candidate_data, indent=2)}

## Custom Q&A
{json.dumps(custom_answers, indent=2)}

## Job
{job_title}

## Form Fields
{json.dumps(fields_for_prompt, indent=2)}

## Rules
1. Return ONLY a JSON object mapping each field's "label" to the answer string.
2. For "select" or "radio" fields, the answer MUST be one of the provided "options" exactly.
3. For "checkbox" fields, answer "Yes" or "No".
4. For text fields asking about experience years, return just the number.
5. For open-ended questions, use Custom Q&A if a match exists, otherwise write a brief professional answer using candidate data.
6. If you cannot determine an answer, omit that field entirely.
7. NEVER invent data not present in the candidate data above.
8. Output ONLY valid JSON, no other text.
"""
    return prompt


def _ollama_match_fields(fields, intake, profile, job_title):
    """Use Ollama to batch-match form fields to candidate answers.

    Returns dict mapping field label -> answer string, or None if unavailable.
    """
    if not ollama_available():
        return None

    prompt = _build_form_fill_prompt(fields, intake, profile, job_title)
    result = ollama_json(prompt, max_tokens=2000)

    if not result or not isinstance(result, dict):
        alert("Ollama Form Fill", "No valid response from Ollama", "warning")
        return None

    # Build lookup from label -> field info for option validation
    field_lookup = {}
    for f in fields:
        field_lookup[f["label"]] = f
        field_lookup[f["label"].lower()] = f

    validated = {}
    for label, answer in result.items():
        if not isinstance(answer, str):
            answer = str(answer)
        answer = answer.strip()
        if not answer:
            continue

        # Find matching field info (case-insensitive)
        field_info = field_lookup.get(label) or field_lookup.get(label.lower())
        if not field_info:
            # Try substring match as last resort
            for fl, fi in field_lookup.items():
                if isinstance(fl, str) and fl.lower() == label.lower():  # pyre-ignore[16]
                    field_info = fi
                    label = fl
                    break

        # Validate select/radio answers against options
        if field_info and field_info["options"]:
            options_lower = [o.lower() for o in field_info["options"]]
            if answer.lower() not in options_lower:
                matched_option = None
                for opt in field_info["options"]:
                    if answer.lower() in opt.lower() or opt.lower() in answer.lower():
                        matched_option = opt
                        break
                if matched_option:
                    answer = matched_option
                else:
                    alert("Ollama Form Fill",
                          f"Skipping '{label}': '{answer}' not in options", "warning")
                    continue

        # Use the original label casing from the manifest
        original_label = field_info["label"] if field_info else label
        validated[original_label] = answer

    alert("Ollama Form Fill", f"Matched {len(validated)}/{len(fields)} fields")
    return validated


async def _ask_admin_external(label, page, job_title, field_type, options, ask_callback):
    """Ask admin via Telegram for an unknown field answer on external site."""
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
    screenshot_path = os.path.join(SCREENSHOTS_DIR, "ask_admin_external.png")
    await page.screenshot(path=screenshot_path, full_page=False)

    options_text = ""
    if options:
        options_text = "\n".join(f"  {i+1}. {opt}" for i, opt in enumerate(options))
        options_text = f"\n\nOptions:\n{options_text}\n(Reply with the number)"

    question = (
        f"External application: {job_title}\n\n"
        f"Field: {label}\n"
        f"Type: {field_type}{options_text}\n\n"
        f"Reply with the answer, or /skip to leave blank."
    )

    answer = await ask_callback(question, screenshot_path)

    if answer is None or answer.strip().lower() == "/skip":  # pyre-ignore[16]
        return None

    # Resolve numbered answers for option-based fields
    if options:
        answer = answer.strip()
        if answer.isdigit():
            idx = int(answer) - 1
            if 0 <= idx < len(options):
                return options[idx]

    return answer


async def _fill_page_fields(page, intake, resume_path, ask_callback, job_title):
    """Scan and fill all visible form fields on the current page.

    Uses a fallback chain: Ollama -> regex patterns -> learned answers -> Telegram Q&A.
    Returns (filled_count, unfilled_count, asked_count).
    """
    filled = 0
    unfilled = 0
    asked = 0

    # Step 1: Collect all fields on the page
    manifest = await _collect_page_fields(page)  # pyre-ignore[29]

    # Step 2: Batch-match via Ollama (if available and enabled)
    use_ollama = os.getenv("OLLAMA_FORM_FILL", "true").lower() == "true"
    ollama_answers = {}
    if use_ollama:
        profile = _load_profile()
        ollama_answers = _ollama_match_fields(manifest, intake, profile, job_title) or {}

    # Step 3: Fill each field using fallback chain
    for field_info in manifest:
        element = field_info["element"]
        label_text = field_info["label"]
        tag = field_info["tag"]
        input_type = field_info["input_type"]

        try:
            # Handle file upload (resume)
            if input_type == "file":
                if resume_path and os.path.exists(resume_path):
                    try:
                        await element.set_input_files(resume_path)
                        await asyncio.sleep(get_human_delay("click"))
                        alert("External Fill", f"  Uploaded resume: {label_text}")
                        filled += 1
                    except Exception as e:
                        alert("External Fill", f"  Resume upload failed: {e}", "warning")
                        unfilled += 1
                continue

            # Fallback 1: Ollama answer
            answer = ollama_answers.get(label_text, "")

            # Fallback 2: Regex patterns + custom + learned answers
            if not answer:
                answer = _match_field_to_answer(label_text, intake)

            # Fallback 3: Ask admin via Telegram
            if not answer and ask_callback:
                admin_answer = await _ask_admin_external(
                    label_text, page, job_title,
                    field_info["field_type"], field_info["options"],
                    ask_callback,
                )
                if admin_answer:
                    answer = admin_answer
                    _save_learned_answer(label_text, answer)
                    alert("Learned", f"Saved answer for '{label_text}': {answer}")
                    asked += 1

            if not answer:
                unfilled += 1
                alert("External Fill", f"  Unfilled: {label_text}", "warning")
                continue

            # Save Ollama-sourced answers to learned_answers for future cache
            if label_text in ollama_answers and answer == ollama_answers[label_text]:
                _save_learned_answer(label_text, answer)

            # Fill the field based on its type
            if tag == "select":
                success = await _handle_select(page, element, answer)
                if success:
                    filled += 1
                    alert("External Fill", f"  Filled select: {label_text}")
                else:
                    unfilled += 1
            elif input_type in ("checkbox",):
                answer_lower = answer.lower()  # pyre-ignore[16]
                if answer_lower in ("yes", "true", "agree", "i agree"):
                    is_checked = await element.is_checked()
                    if not is_checked:
                        await element.click()
                        await asyncio.sleep(get_human_delay("click"))
                filled += 1
                alert("External Fill", f"  Filled checkbox: {label_text}")
            elif input_type == "radio":
                parent = await element.evaluate_handle("el => el.closest('fieldset, div, li')")
                if parent:
                    success = await _handle_radio_buttons(page, parent.as_element(), answer)
                    if success:
                        filled += 1
                        alert("External Fill", f"  Filled radio: {label_text}")
                    else:
                        unfilled += 1
                else:
                    unfilled += 1
            else:
                # Text input or textarea
                await _fill_text_field(page, element, answer, intake)
                filled += 1
                alert("External Fill", f"  Filled: {label_text}")

            await asyncio.sleep(get_human_delay("between_fields"))

        except Exception as e:
            alert("External Fill", f"  Error on field: {e}", "warning")
            unfilled += 1

    return filled, unfilled, asked


async def _click_page_button(page, text_patterns, timeout=3000):
    """Try clicking a button matching any of the given text patterns.

    Returns True if a button was clicked.
    """
    for pattern in text_patterns:
        pattern_lower = pattern.lower()

        # Try by text content
        buttons = await page.query_selector_all(
            "button, input[type='submit'], input[type='button'], "
            "a.btn, a.button, [role='button']"
        )
        for btn in buttons:
            try:
                is_visible = await btn.is_visible()
                if not is_visible:
                    continue

                text = (await btn.text_content() or "").strip().lower()
                btn_value = (await btn.get_attribute("value") or "").lower()
                btn_aria = (await btn.get_attribute("aria-label") or "").lower()

                if (pattern_lower in text or
                        pattern_lower in btn_value or
                        pattern_lower in btn_aria):
                    await btn.click()
                    await asyncio.sleep(get_human_delay("page_load"))
                    return True
            except Exception:
                continue

    return False


async def _apply_external_async(job, resume_path, ask_callback=None):
    """Full automated external application flow."""
    job_id = safe_job_id(job.get("job_id", "unknown"))
    title = job.get("title", "Unknown")
    company = job.get("company", "Unknown")
    job_title = f"{title} at {company}"

    # Step 1: Extract external application URL (extract_url already sanitizes)
    alert("External Apply", f"Finding application URL for {title}...")
    external_url = extract_url(job)

    if not external_url:
        alert("External Apply", f"No external URL found for {title}", "warning")
        return False
    if not sanitize_url(external_url):
        alert("External Apply", "Blocked unsafe external URL", "error")
        return False

    resume_requested = (resume_path or "").strip()
    resume_path = safe_resume_path_with_fallback(resume_requested, BASE_DIR)
    if resume_requested and resume_path is None:
        alert("External Apply", "Resume path rejected or not found (allowed: .tmp/, candidate/)", "warning")

    alert("External Apply", f"Applying at: {external_url}")
    intake = _load_intake_form()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=os.getenv("HEADLESS", "true").lower() == "true")
        context = await browser.new_context(
            viewport=get_viewport(),
            user_agent=get_random_ua(),
        )
        await apply_stealth_to_context(context)
        page = await context.new_page()

        try:
            # Navigate to external application page
            await page.goto(external_url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(get_human_delay("page_load"))

            # Screenshot initial page
            os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
            await page.screenshot(
                path=os.path.join(SCREENSHOTS_DIR, f"external_{job_id}_start.png"),
                full_page=False,
            )

            # Multi-page form loop (max 15 pages as safety)
            submitted = False
            total_filled = 0
            total_unfilled = 0
            total_asked = 0

            for page_num in range(1, 16):
                alert("External Apply", f"Page {page_num} of application for {title}...")
                await asyncio.sleep(get_human_delay("between_fields"))

                # Fill all fields on current page
                filled, unfilled, asked = await _fill_page_fields(  # pyre-ignore[29]
                    page, intake, resume_path, ask_callback, job_title,
                )
                total_filled += filled
                total_unfilled += unfilled
                total_asked += asked

                alert("External Apply", f"  Page {page_num}: {filled} filled, {unfilled} unfilled, {asked} asked")

                # Check for submit button first
                if await _click_page_button(page, _SUBMIT_TEXTS):
                    await asyncio.sleep(get_human_delay("page_load"))

                    # Screenshot confirmation
                    await page.screenshot(
                        path=os.path.join(SCREENSHOTS_DIR, f"external_{job_id}_submitted.png"),
                        full_page=False,
                    )

                    # Check if we're still on a form (some ATS have confirmation pages)
                    page_text = (await page.text_content("body") or "").lower()
                    if any(w in page_text for w in [
                        "thank you", "application received", "successfully submitted",
                        "application complete", "we have received", "confirmation",
                    ]):
                        submitted = True
                        alert("External Apply", f"Application submitted for {title} at {company}!")
                        break

                    # If page changed but no confirmation, might be another form page
                    alert("External Apply", "Submit clicked but no confirmation detected. Continuing...")
                    submitted = True  # Give benefit of the doubt
                    break

                # Try skip buttons (for optional steps like demographics)
                await _click_page_button(page, _SKIP_TEXTS)

                # Try next/continue buttons
                if await _click_page_button(page, _NEXT_TEXTS):
                    await asyncio.sleep(get_human_delay("page_load"))
                    continue

                # No navigation button found — might be stuck or single-page form
                alert("External Apply", f"No navigation button found on page {page_num}", "warning")

                # Take failure screenshot
                await page.screenshot(
                    path=os.path.join(SCREENSHOTS_DIR, f"external_{job_id}_stuck.png"),
                    full_page=False,
                )
                break

            if submitted:
                # Update run state
                state = _load_run_state()
                state["applications_today"] = state.get("applications_today", 0) + 1  # pyre-ignore[29]
                processed = state.get("jobs_processed", [])  # pyre-ignore[29]
                processed.append(job_id)  # pyre-ignore[29]
                state["jobs_processed"] = processed  # pyre-ignore[29]
                _save_run_state(state)

                alert("External Apply", f"DONE: {total_filled} filled, {total_unfilled} unfilled, {total_asked} asked via Telegram")
                await browser.close()
                return True
            else:
                alert("External Apply", f"Could not complete application for {title}", "warning")

        except Exception as e:
            alert("External Apply Error", f"Failed for {title}: {e}", "error")
            try:
                os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
                await page.screenshot(
                    path=os.path.join(SCREENSHOTS_DIR, f"external_{job_id}_error.png"),
                    full_page=False,
                )
            except Exception:
                pass

        await browser.close()
        return False


async def apply_external_async(job, resume_path, max_per_day=15, ask_callback=None):
    """Async entry point for external applications.

    Use from the Telegram bot's event loop.
    """
    if not _check_daily_cap(max_per_day):
        alert("Daily Cap", "Maximum daily applications reached.", "warning")
        return False
    return await _apply_external_async(job, resume_path, ask_callback=ask_callback)


def apply_external(job, resume_path, max_per_day=15, ask_callback=None):
    """Sync entry point for external applications.

    Use from run_daily.py.
    """
    if not _check_daily_cap(max_per_day):
        alert("Daily Cap", "Maximum daily applications reached.", "warning")
        return False
    return asyncio.run(_apply_external_async(job, resume_path, ask_callback=ask_callback))


if __name__ == "__main__":
    print("apply_external_form module loaded OK")
