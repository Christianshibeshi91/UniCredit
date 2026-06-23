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
from __future__ import annotations

import asyncio
import json
import os
import re
import time

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
from LinkedinAutomation.openrouter_client import (  # pyre-ignore[21]
    generate_json as ollama_json,
    is_available as ollama_available,
    MODEL_FORM_FILL,
)
from LinkedinAutomation.session_snapshot import SessionSnapshot  # pyre-ignore[21]

# Deferred imports to avoid circular dependency (telegram_bot imports apply modules)
def _get_batch_ask_callback():
    from LinkedinAutomation.telegram_bot import get_batch_ask_callback  # pyre-ignore[21]
    return get_batch_ask_callback()

def _get_scheduler_batch_ask_callback():
    from LinkedinAutomation.telegram_bot import get_scheduler_batch_ask_callback  # pyre-ignore[21]
    return get_scheduler_batch_ask_callback()

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
_LOGIN_TEXTS = [
    "create account", "create my account", "sign up", "register",
    "sign in", "log in", "login", "sign in with email",
    "create a new account", "get started",
]

# Fields to skip (ATS boilerplate)
_SKIP_FIELD_LABELS = [
    "captcha", "recaptcha", "subscribe", "newsletter",
]

# Agreement/consent checkboxes — auto-check these instead of skipping
_AGREE_LABELS = [
    "i agree", "terms", "privacy", "consent", "acknowledge",
    "accept", "i have read", "agree to",
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

    # Strategy 8: Workday data-automation-id
    if not label_text:
        try:
            automation_id = await element.evaluate(
                "el => el.closest('[data-automation-id]')?.getAttribute('data-automation-id') || ''"
            )
            if automation_id:
                readable = re.sub(r'([a-z])([A-Z])', r'\1 \2', automation_id)
                readable = readable.replace('_', ' ').replace('-', ' ')
                for prefix in ['section ', 'input ', 'field ']:
                    if readable.lower().startswith(prefix):
                        readable = readable[len(prefix):]
                label_text = readable.strip()
        except Exception:
            pass

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


async def _collect_page_fields(page, max_wait=8):
    """Scan all visible form fields on the current page into a manifest.

    Waits up to *max_wait* seconds for JS-rendered fields (Workday, etc.)
    before scanning.  Returns list of dicts with label, field_type, options,
    element, tag, input_type.
    """
    # --- Wait for JS-rendered fields (Workday renders after page load) ---
    start = time.time()
    elements = []

    while time.time() - start < max_wait:
        elements = await page.query_selector_all(
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), '
            'textarea, select'
        )
        # Also try Workday-specific selectors
        workday_els = await page.query_selector_all(
            '[data-automation-id] input, [data-automation-id] select, '
            '[data-automation-id] textarea, [data-uxi-element-id] input'
        )
        for el in workday_els:
            if el not in elements:
                elements.append(el)

        # Filter to only visible elements
        visible = []
        for el in elements:
            try:
                if await el.is_visible():
                    visible.append(el)
            except Exception:
                continue

        if visible:
            elements = visible
            break

        await page.wait_for_timeout(1000)

    # --- Build manifest from discovered elements ---
    manifest = []

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


def _get_ats_credentials():
    """Return ATS portal credentials from environment.

    Credentials are used for Workday, Greenhouse, etc. account
    creation and login pages. Fail-secure: returns empty strings
    if not configured (fields will be left unfilled).
    """
    email = os.getenv("ATS_EMAIL", "")
    password = os.getenv("ATS_PASSWORD", "")
    if not email or not password:
        alert("ATS Credentials", "ATS_EMAIL/ATS_PASSWORD not set in .env", "warning")
    return email, password


def _match_ats_login_fields(manifest):
    """Pre-match login/signup fields using ATS credentials (not Ollama).

    Handles email, password, and verify-password fields on ATS portals.
    Returns dict of label -> answer for matched fields.
    Skips honeypot/robot-trap fields.
    """
    ats_email, ats_password = _get_ats_credentials()
    if not ats_email:
        return {}

    matched = {}
    for field in manifest:
        label_lower = field["label"].lower()
        input_type = field["input_type"]

        # Skip honeypot / robot trap fields
        if "robot" in label_lower or "bot" in label_lower or "honey" in label_lower:
            continue

        # Email fields on login/signup pages
        if input_type == "email" or re.search(r"e[\-\s]?mail", label_lower):
            matched[field["label"]] = ats_email

        # Password fields (password, verify, confirm)
        elif input_type == "password" or re.search(
            r"password|passcode|pass\s*word", label_lower
        ):
            matched[field["label"]] = ats_password

    return matched


# ---------------------------------------------------------------------------
# Email verification for ATS account creation (Gmail API / OAuth2)
# ---------------------------------------------------------------------------

_ATS_SENDER_DOMAINS = [
    "workday.com", "myworkdayjobs.com", "workday.net",
    "greenhouse.io", "greenhouse-mail.io",
    "lever.co", "lever-mail.com",
    "icims.com",
    "taleo.net", "oracle.com",
    "smartrecruiters.com",
    "jobvite.com",
    "successfactors.com", "sap.com",
    "brassring.com", "kenexa.com",
    "ultipro.com", "ukg.com",
    "dayforce.com", "ceridian.com",
    "ashbyhq.com",
    "recruitee.com",
    "bamboohr.com",
    "jazz.co", "resumator.com",
    "applytojob.com",
    "noreply",
]

_VERIFY_SUBJECT_KEYWORDS = [
    "verify", "confirm", "activate", "validation", "validate",
    "email verification", "account activation", "complete your",
    "action required", "one more step",
]

_VERIFY_LINK_KEYWORDS = [
    "verify", "confirm", "activate", "validate", "token",
    "auth", "registration", "complete",
]

_GMAIL_TOKEN_PATH = os.path.join(BASE_DIR, "token_gmail.json")
_GMAIL_CREDS_PATH = os.path.join(BASE_DIR, "credentials.json")
_GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]


def _get_gmail_service():
    """Build Gmail API service using OAuth2 (same credentials.json as Sheets).

    Uses a separate token file (token_gmail.json) to avoid scope conflicts
    with the existing Sheets/Drive token. First run will open a browser
    for OAuth consent.
    """
    try:
        from google.oauth2.credentials import Credentials  # pyre-ignore[21]
        from google_auth_oauthlib.flow import InstalledAppFlow  # pyre-ignore[21]
        from google.auth.transport.requests import Request  # pyre-ignore[21]
        from googleapiclient.discovery import build  # pyre-ignore[21]
    except ImportError:
        alert("Gmail API", "google-api-python-client not installed", "warning")
        return None

    if not os.path.exists(_GMAIL_CREDS_PATH):
        alert("Gmail API", "credentials.json not found — cannot check emails", "warning")
        return None

    creds = None
    if os.path.exists(_GMAIL_TOKEN_PATH):
        try:
            creds = Credentials.from_authorized_user_file(_GMAIL_TOKEN_PATH, _GMAIL_SCOPES)
        except Exception:
            pass

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            try:
                flow = InstalledAppFlow.from_client_secrets_file(
                    _GMAIL_CREDS_PATH, _GMAIL_SCOPES,
                )
                creds = flow.run_local_server(port=0)
            except Exception as e:
                alert("Gmail API", f"OAuth flow failed: {e}", "error")
                return None
        with open(_GMAIL_TOKEN_PATH, "w") as f:
            f.write(creds.to_json())

    return build("gmail", "v1", credentials=creds)


def _gmail_get_body(payload):
    """Extract text and HTML body from a Gmail API message payload."""
    import base64

    text_body = ""
    html_body = ""

    def _extract(part):
        nonlocal text_body, html_body
        mime = part.get("mimeType", "")
        data = part.get("body", {}).get("data", "")
        if data:
            decoded = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
            if mime == "text/plain":
                text_body += decoded
            elif mime == "text/html":
                html_body += decoded
        for sub in part.get("parts", []):
            _extract(sub)

    _extract(payload)
    return text_body, html_body


def _extract_verification_link(text_body, html_body):
    """Extract a verification/confirmation link from email body."""
    links = []
    if html_body:
        links = re.findall(r'href=["\']([^"\']{10,})["\']', html_body)
    if text_body:
        links.extend(re.findall(r'https?://[^\s<>"\')\]]{10,}', text_body))

    # Prefer links with verification keywords
    for link in links:
        link_lower = link.lower()
        if any(kw in link_lower for kw in _VERIFY_LINK_KEYWORDS):
            if link.startswith(("http://", "https://")):
                return link

    # Fallback: long URLs with token parameters (common in verification emails)
    for link in links:
        if ("token=" in link.lower() or "code=" in link.lower() or len(link) > 120):
            if link.startswith(("http://", "https://")):
                return link

    return None


def _extract_verification_code(text_body, html_body):
    """Extract a verification code (4-8 digits) from email body."""
    combined = text_body + " " + html_body
    code_patterns = [
        r'(?:code|pin|otp|verification).{0,20}?(\d{4,8})',
        r'(\d{4,8})\s*(?:is your|verification|code)',
        r'<strong>(\d{4,8})</strong>',
        r'<b>(\d{4,8})</b>',
    ]
    for pattern in code_patterns:
        match = re.search(pattern, combined, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


async def _poll_verification_email(ats_email, timeout=90, poll_interval=10):
    """Poll Gmail API for a verification email from ATS platforms.

    Returns (link, code) tuple — one or both may be None.
    Uses OAuth2 via credentials.json (same as Google Sheets).
    """
    service = _get_gmail_service()
    if not service:
        return None, None

    start_time = time.time()

    while (time.time() - start_time) < timeout:
        try:
            # Search for recent unread emails (last 10 minutes)
            results = service.users().messages().list(
                userId="me", q="is:unread newer_than:10m", maxResults=10,
            ).execute()

            for msg_meta in results.get("messages", []):
                msg = service.users().messages().get(
                    userId="me", id=msg_meta["id"], format="full",
                ).execute()

                headers = {
                    h["name"].lower(): h["value"]
                    for h in msg.get("payload", {}).get("headers", [])
                }
                from_addr = headers.get("from", "").lower()
                subject = headers.get("subject", "").lower()

                from_ats = any(d in from_addr for d in _ATS_SENDER_DOMAINS)
                subject_verify = any(
                    kw in subject for kw in _VERIFY_SUBJECT_KEYWORDS
                )

                if not (from_ats or subject_verify):
                    continue

                alert("Email Verify", f"Found verification email: {subject[:60]}")

                text_body, html_body = _gmail_get_body(msg.get("payload", {}))
                link = _extract_verification_link(text_body, html_body)
                code = _extract_verification_code(text_body, html_body)

                if link or code:
                    # Mark as read
                    service.users().messages().modify(
                        userId="me", id=msg_meta["id"],
                        body={"removeLabelIds": ["UNREAD"]},
                    ).execute()
                    return link, code

        except Exception as e:
            alert("Email Verify", f"Gmail API error: {e}", "warning")

        alert("Email Verify",
              f"No verification email yet, retrying in {poll_interval}s...")
        await asyncio.sleep(poll_interval)

    alert("Email Verify", f"No verification email found after {timeout}s", "warning")
    return None, None


async def _handle_email_verification(page, ats_email):
    """Detect and complete email verification after ATS account creation.

    Checks if the current page requests email verification, polls Gmail
    for the verification email, and either opens the link or enters the code.
    Returns True if verification was handled.
    """
    page_text = (await page.text_content("body") or "").lower()
    needs_verify = any(phrase in page_text for phrase in [
        "verify your email", "check your email", "verification email",
        "we sent", "confirm your email", "we've sent", "check your inbox",
        "email has been sent", "verify your account", "confirmation email",
        "verify email", "verify account", "verification link",
    ])

    if not needs_verify:
        return False

    alert("Email Verify", "Email verification required — checking Gmail inbox...")

    link, code = await _poll_verification_email(ats_email)  # pyre-ignore[29]

    if link:
        alert("Email Verify", "Found verification link, opening in new tab...")
        # Open in a new tab to preserve the application page
        verify_page = await page.context.new_page()
        try:
            await verify_page.goto(link, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(5)

            os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
            await verify_page.screenshot(
                path=os.path.join(SCREENSHOTS_DIR, "email_verified.png"),
                full_page=False,
            )
            alert("Email Verify", "Verification link opened successfully!")
        except Exception as e:
            alert("Email Verify", f"Error opening verification link: {e}", "warning")
        finally:
            await verify_page.close()

        # Reload the original page so it picks up the verified state
        await page.reload(wait_until="domcontentloaded")
        await asyncio.sleep(3)
        return True

    elif code:
        alert("Email Verify", f"Found verification code: {code}")
        # Find code input field on the page
        code_inputs = await page.query_selector_all(
            "input[type='text'], input[type='number'], input[type='tel'], input:not([type])"
        )
        for inp in code_inputs:
            try:
                if not await inp.is_visible():
                    continue
                label = await _get_field_label(inp, page)  # pyre-ignore[29]
                if any(kw in label.lower() for kw in [
                    "code", "verify", "otp", "pin", "confirmation",
                ]):
                    await inp.fill(code)
                    await asyncio.sleep(1)
                    await _click_page_button(
                        page, ["verify", "confirm", "submit", "continue"],
                    )
                    await asyncio.sleep(3)
                    alert("Email Verify", "Verification code entered!")
                    return True
            except Exception:
                continue

        # Fallback: try the first empty visible input
        for inp in code_inputs:
            try:
                if not await inp.is_visible():
                    continue
                val = await inp.input_value()
                if not val:
                    await inp.fill(code)
                    await asyncio.sleep(1)
                    await _click_page_button(
                        page, ["verify", "confirm", "submit", "continue"],
                    )
                    await asyncio.sleep(3)
                    alert("Email Verify", "Verification code entered!")
                    return True
            except Exception:
                continue

    alert("Email Verify", "Could not complete email verification", "warning")
    return False


def _build_form_fill_prompt(fields, intake, profile, job_title):
    """Build the OpenRouter prompt for batch-matching form fields to candidate answers."""
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

    # Build field manifest for prompt (strip element handles and login fields)
    fields_for_prompt = []
    for i, f in enumerate(fields):
        # Skip password/login fields — handled by ATS credentials, not LLM
        if f["input_type"] == "password" or "robot" in f["label"].lower():
            continue
        desc = {"id": i, "label": f["label"], "type": f["field_type"]}
        if f["options"]:
            desc["options"] = f["options"]
        fields_for_prompt.append(desc)

    prompt = f"""You are a job application form filler. Given candidate data and form fields, return the correct answer for each field.

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
    """Use OpenRouter to batch-match form fields to candidate answers.

    Returns dict mapping field label -> answer string, or None if unavailable.
    """
    if not ollama_available():
        return None

    prompt = _build_form_fill_prompt(fields, intake, profile, job_title)
    result = ollama_json(prompt, model=MODEL_FORM_FILL, max_tokens=2000)

    if not result or not isinstance(result, dict):
        alert("OpenRouter Form Fill", "No valid response from OpenRouter", "warning")
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
                    alert("OpenRouter Form Fill",
                          f"Skipping '{label}': '{answer}' not in options", "warning")
                    continue

        # Use the original label casing from the manifest
        original_label = field_info["label"] if field_info else label
        validated[original_label] = answer

    alert("OpenRouter Form Fill", f"Matched {len(validated)}/{len(fields)} fields")
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


async def _keepalive_loop(page):
    """Subtle scroll to prevent session timeout during Q&A wait."""
    try:
        while True:
            await asyncio.sleep(30)
            try:
                await page.evaluate("window.scrollBy(0, 1); window.scrollBy(0, -1);")
            except Exception:
                break
    except asyncio.CancelledError:
        pass


async def _fill_page_fields(page, intake, resume_path, ask_callback, job_title,
                             batch_ask_callback=None, job_url="", job_id="",
                             page_num=0):
    """Scan and fill all visible form fields on the current page.

    Uses a fallback chain: OpenRouter -> regex patterns -> learned answers -> Telegram Q&A.
    Returns (filled_count, unfilled_count, asked_count).
    """
    filled = 0
    unfilled = 0
    asked = 0

    # Step 1: Collect all fields on the page
    manifest = await _collect_page_fields(page)  # pyre-ignore[29]

    # Step 2a: Pre-match ATS login/signup fields (email + password from env)
    ats_answers = _match_ats_login_fields(manifest)

    # Step 2b: Batch-match remaining fields via OpenRouter (if available and enabled)
    use_ollama = os.getenv("OPENROUTER_FORM_FILL", "true").lower() == "true"
    ollama_answers = {}
    if use_ollama:
        profile = _load_profile()
        ollama_answers = _ollama_match_fields(manifest, intake, profile, job_title) or {}

    # Step 3: First pass — fill fields using stages 0-2, collect unknowns
    answers_map = {}  # label -> answer (resolved so far)
    unknown_fields = []  # field_info dicts that still need answers

    for field_info in manifest:
        label_text = field_info["label"]
        input_type = field_info["input_type"]

        # Handle file upload (resume) — not part of Q&A
        if input_type == "file":
            if resume_path and os.path.exists(resume_path):
                try:
                    await field_info["element"].set_input_files(resume_path)
                    await asyncio.sleep(get_human_delay("click"))
                    alert("External Fill", f"  Uploaded resume: {label_text}")
                    filled += 1
                except Exception as e:
                    alert("External Fill", f"  Resume upload failed: {e}", "warning")
                    unfilled += 1
            continue

        # Fallback 0: ATS credentials
        answer = ats_answers.get(label_text, "")

        # Fallback 1: OpenRouter answer
        if not answer:
            answer = ollama_answers.get(label_text, "")

        # Fallback 2: Regex patterns + custom + learned answers
        if not answer:
            answer = _match_field_to_answer(label_text, intake)

        if answer:
            answers_map[label_text] = answer
        else:
            unknown_fields.append(field_info)

    # Step 4: Batch-ask all unknowns via Telegram (or fall back to per-field)
    if unknown_fields:
        if batch_ask_callback:
            # Save session snapshot before pausing for Q&A
            snapshot = SessionSnapshot(job_id or "external")
            filled_so_far = {k: v for k, v in answers_map.items()}
            await snapshot.save(page, filled_so_far, page_num)

            # Take screenshot for context
            os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
            screenshot_path = os.path.join(SCREENSHOTS_DIR, "batch_ask_external.png")
            await page.screenshot(path=screenshot_path, full_page=False)

            # Build field descriptors for batch callback
            batch_fields = [
                {
                    "label": fi["label"],
                    "type": fi["field_type"],
                    "options": fi["options"],
                }
                for fi in unknown_fields
            ]

            # Keep page alive while waiting for admin replies
            keepalive_task = asyncio.create_task(_keepalive_loop(page))
            try:
                batch_answers = await batch_ask_callback(
                    job_title, job_url, batch_fields, screenshot_path,
                )
            finally:
                keepalive_task.cancel()
                try:
                    await keepalive_task
                except asyncio.CancelledError:
                    pass

            # Map batch replies back to fields
            if batch_answers:
                for fi, raw_answer in zip(unknown_fields, batch_answers):
                    if not raw_answer or raw_answer.strip().lower() == "/skip":
                        continue
                    answer = raw_answer.strip()
                    # Resolve numbered option answers
                    if fi["options"] and answer.isdigit():
                        idx = int(answer) - 1
                        if 0 <= idx < len(fi["options"]):
                            answer = fi["options"][idx]
                    answers_map[fi["label"]] = answer
                    _save_learned_answer(fi["label"], answer)
                    alert("Learned", f"Saved answer for '{fi['label']}': {answer}")
                    asked += 1

        elif ask_callback:
            # Fallback: per-field Telegram Q&A (original behavior)
            for fi in unknown_fields:
                admin_answer = await _ask_admin_external(
                    fi["label"], page, job_title,
                    fi["field_type"], fi["options"],
                    ask_callback,
                )
                if admin_answer:
                    answers_map[fi["label"]] = admin_answer
                    _save_learned_answer(fi["label"], admin_answer)
                    alert("Learned", f"Saved answer for '{fi['label']}': {admin_answer}")
                    asked += 1

    # Step 4.5: Auto-check agreement/consent checkboxes
    for field_info in manifest:
        label_lower = field_info["label"].lower()
        if field_info["input_type"] == "checkbox" and field_info["label"] not in answers_map:
            if any(kw in label_lower for kw in _AGREE_LABELS):
                answers_map[field_info["label"]] = "yes"

    # Step 5: Fill all fields using resolved answers
    for field_info in manifest:
        element = field_info["element"]
        label_text = field_info["label"]
        tag = field_info["tag"]
        input_type = field_info["input_type"]

        if input_type == "file":
            continue  # already handled above

        answer = answers_map.get(label_text, "")
        if not answer:
            unfilled += 1
            alert("External Fill", f"  Unfilled: {label_text}", "warning")
            continue

        try:
            # Save OpenRouter-sourced answers to learned_answers for future cache
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
                        try:
                            await element.click(timeout=3000)
                        except Exception:
                            # Workday overlays intercept clicks — use force or JS
                            try:
                                await element.click(force=True, timeout=3000)
                            except Exception:
                                await element.evaluate("el => el.click()")
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
                    try:
                        await btn.click(timeout=5000)
                    except Exception:
                        # Workday uses overlay divs that intercept clicks — force click
                        await btn.click(force=True, timeout=5000)
                    await asyncio.sleep(get_human_delay("page_load"))
                    return True
            except Exception:
                continue

    return False


async def _apply_external_async(job, resume_path, ask_callback=None, batch_ask_callback=None):
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
            try:
                await page.goto(external_url, wait_until="domcontentloaded", timeout=30000)
            except Exception as e:
                alert("External Apply", f"Navigation warning: {e}", "warning")
                # Page may still be usable even if domcontentloaded timed out
            await asyncio.sleep(get_human_delay("page_load"))
            # Extra wait for Workday/heavy JS sites
            await asyncio.sleep(3)

            # Screenshot initial page
            os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
            try:
                await page.screenshot(
                    path=os.path.join(SCREENSHOTS_DIR, f"external_{job_id}_start.png"),
                    full_page=False,
                )
            except Exception as e:
                alert("External Apply", f"Screenshot failed: {e}", "warning")

            # Dismiss cookie banners before interacting
            for cookie_sel in [
                'button:has-text("Accept Cookies")', 'button:has-text("Accept")',
                'button:has-text("Accept All")', '[data-automation-id="legalNoticeAcceptButton"]',
            ]:
                try:
                    btn = await page.query_selector(cookie_sel)
                    if btn and await btn.is_visible():
                        await btn.click()
                        await asyncio.sleep(1)
                        break
                except Exception:
                    continue

            # Click "Apply" button on job description pages (Workday, Greenhouse, etc.)
            # The external URL often lands on the job posting, not the form itself.
            for apply_sel in [
                '[data-automation-id="adventureButton"]',  # Workday
                'a:has-text("Apply")', 'button:has-text("Apply")',
                'a:has-text("Apply Now")', 'button:has-text("Apply Now")',
                'a:has-text("Apply for this job")', 'button:has-text("Apply for this job")',
                '[data-automation-id="jobPostingApplyButton"]',
            ]:
                try:
                    btn = await page.query_selector(apply_sel)
                    if btn and await btn.is_visible():
                        alert("External Apply", "Clicking Apply button to start application...")
                        await btn.click()
                        await asyncio.sleep(get_human_delay("page_load"))
                        await asyncio.sleep(3)
                        break
                except Exception:
                    continue

            # Workday shows "Apply Manually" / "Autofill with Resume" / "Use Last Application"
            # after clicking Apply. Navigate to the Apply Manually href directly
            # (clicking doesn't always work — Workday uses <a> links, not JS buttons).
            for manual_sel in [
                '[data-automation-id="applyManually"]',
                'a:has-text("Apply Manually")',
                'button:has-text("Apply Manually")',
                'button:has-text("Apply without")',
            ]:
                try:
                    btn = await page.query_selector(manual_sel)
                    if btn and await btn.is_visible():
                        href = await btn.get_attribute("href")
                        if href:
                            # Navigate directly — clicking <a> in modals is unreliable
                            full_url = href if href.startswith("http") else f"{page.url.split('/job/')[0]}{href}"
                            alert("External Apply", f"Navigating to Apply Manually form...")
                            await page.goto(full_url, wait_until="domcontentloaded", timeout=30000)
                        else:
                            alert("External Apply", "Clicking 'Apply Manually'...")
                            await btn.click()
                        await asyncio.sleep(get_human_delay("page_load"))
                        await asyncio.sleep(3)
                        break
                except Exception:
                    continue

            # Multi-page form loop (max 15 pages as safety)
            submitted = False
            total_filled = 0
            total_unfilled = 0
            total_asked = 0

            for page_num in range(1, 16):
                alert("External Apply", f"Page {page_num} of application for {title}...")
                await asyncio.sleep(get_human_delay("between_fields"))

                # Check for email verification prompt on current page
                _ats_email = os.getenv("ATS_EMAIL", "")
                if _ats_email and os.path.exists(_GMAIL_CREDS_PATH):
                    if await _handle_email_verification(page, _ats_email):
                        alert("External Apply", "Email verified, re-processing page...")
                        continue

                # Detect page type: login vs signup vs application
                page_url = page.url.lower()
                is_login_page = any(kw in page_url for kw in [
                    "/login", "/signin", "/sign-in", "/sso", "/auth",
                ])
                is_signup_page = any(kw in page_url for kw in [
                    "/register", "/signup", "/sign-up", "/create-account",
                ])
                has_password_fields = len(
                    await page.query_selector_all('input[type="password"]')
                ) > 0
                has_confirm_password = await page.query_selector(
                    'input[name*="confirm"], input[autocomplete="new-password"]'
                )

                # Check page text for account-already-exists or verification messages
                try:
                    page_text_check = (await page.inner_text("body")).lower()[:2000]
                except Exception:
                    page_text_check = ""

                if any(phrase in page_text_check for phrase in [
                    "account already exists", "already registered", "email is already in use",
                    "already have an account", "existing account", "email already",
                ]):
                    alert("External Apply", "  Account already exists — switching to Sign In...")
                    signed_in = False
                    # Try finding a Sign In link with href (navigate directly)
                    for sign_in_sel in [
                        'a:has-text("Sign In")', 'a:has-text("Log In")',
                        '[data-automation-id="signInLink"]',
                    ]:
                        try:
                            link = await page.query_selector(sign_in_sel)
                            if link and await link.is_visible():
                                href = await link.get_attribute("href")
                                if href:
                                    full = href if href.startswith("http") else f"https://{page.url.split('/')[2]}{href}"
                                    await page.goto(full, wait_until="domcontentloaded", timeout=30000)
                                    signed_in = True
                                else:
                                    await link.click()
                                    signed_in = True
                                await asyncio.sleep(3)
                                break
                        except Exception:
                            continue
                    if not signed_in:
                        # Workday fallback: replace /applyManually with /signIn in URL
                        current = page.url
                        if "applyManually" in current:
                            sign_in_url = current.replace("applyManually", "signIn")
                            alert("External Apply", "  Navigating to Workday sign-in URL...")
                            await page.goto(sign_in_url, wait_until="domcontentloaded", timeout=30000)
                            await asyncio.sleep(3)
                    continue  # Re-enter loop on the sign-in page

                if is_signup_page or (has_confirm_password and has_password_fields):
                    alert("External Apply", "  Signup page detected, creating account...")
                elif is_login_page or (has_password_fields and not has_confirm_password):
                    alert("External Apply", "  Login page detected, filling credentials...")

                # Fill all fields on current page
                filled, unfilled, asked = await _fill_page_fields(  # pyre-ignore[29]
                    page, intake, resume_path, ask_callback, job_title,
                    batch_ask_callback=batch_ask_callback,
                    job_url=job.get("job_url", ""), job_id=job_id,
                )
                total_filled += filled
                total_unfilled += unfilled
                total_asked += asked

                alert("External Apply", f"  Page {page_num}: {filled} filled, {unfilled} unfilled, {asked} asked")

                # Try login/signup buttons first (account creation pages)
                if await _click_page_button(page, _LOGIN_TEXTS):
                    alert("External Apply", "Clicked login/signup button...")
                    await asyncio.sleep(get_human_delay("page_load"))
                    # Wait extra for Workday-style JS-heavy page transitions
                    await asyncio.sleep(3)
                    continue

                # Check for submit button
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


async def apply_external_async(job, resume_path, max_per_day=15, ask_callback=None, batch_ask_callback=None):
    """Async entry point for external applications.

    Use from the Telegram bot's event loop.
    """
    if not _check_daily_cap(max_per_day):
        alert("Daily Cap", "Maximum daily applications reached.", "warning")
        return False
    if batch_ask_callback is None:
        batch_ask_callback = _get_batch_ask_callback()
    return await _apply_external_async(job, resume_path, ask_callback=ask_callback, batch_ask_callback=batch_ask_callback)


def apply_external(job, resume_path, max_per_day=15, ask_callback=None, batch_ask_callback=None):
    """Sync entry point for external applications.

    Use from run_daily.py.
    """
    if not _check_daily_cap(max_per_day):
        alert("Daily Cap", "Maximum daily applications reached.", "warning")
        return False
    if batch_ask_callback is None:
        batch_ask_callback = _get_batch_ask_callback()
    return asyncio.run(_apply_external_async(job, resume_path, ask_callback=ask_callback, batch_ask_callback=batch_ask_callback))


if __name__ == "__main__":
    print("apply_external_form module loaded OK")
