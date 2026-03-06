"""Interview prep automation — generates STAR answers, company research, and prep materials.

Triggered when a job's Application Status is changed to "Interview" in Google Sheets.
Uses Claude API to generate tailored interview prep and sends via Telegram.
"""

import json
import os

import anthropic  # pyre-ignore[21]
import requests  # pyre-ignore[21]
from dotenv import load_dotenv  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.log_to_sheets import get_rows_by_status  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

PROFILE_PATH = os.path.join(BASE_DIR, "candidate", "profile.json")
PREP_SENT_PATH = os.path.join(BASE_DIR, ".tmp", "interview_prep_sent.json")


def _load_profile() -> dict:
    with open(PROFILE_PATH, "r") as f:
        return json.load(f)


def _load_prep_sent() -> set:
    """Track which rows already had prep materials sent."""
    if os.path.exists(PREP_SENT_PATH):
        with open(PREP_SENT_PATH, "r") as f:
            try:
                return set(json.load(f))
            except (json.JSONDecodeError, TypeError):
                return set()
    return set()


def _save_prep_sent(sent: set) -> None:
    os.makedirs(os.path.dirname(PREP_SENT_PATH), exist_ok=True)
    with open(PREP_SENT_PATH, "w") as f:
        json.dump(sorted(sent), f, indent=2)


def _build_prep_prompt(job_row: dict, profile: dict) -> str:
    """Build the Claude prompt for interview prep generation."""
    title = job_row.get("Job Title", "Unknown")
    company = job_row.get("Company", "Unknown")
    description = job_row.get("Cleaned Job Description", "")[:3000]
    matched = job_row.get("Matched Skills", "")
    missing = job_row.get("Missing Skills", "")

    return f"""You are an expert interview coach. Generate comprehensive interview prep materials for this candidate and role.

## Candidate
- Name: {profile['name']}
- Title: {profile['title']}
- Years of Experience: {profile['years_of_experience']}
- Core Skills: {', '.join(profile['core_skills'][:15])}
- Industries: {', '.join(profile['industries'])}
- Key Experience: {json.dumps(profile.get('experience', [])[:2], indent=2)}

## Target Role
- Title: {title}
- Company: {company}
- Description: {description}
- Skills They Want: {matched}
- Skills to Address: {missing}

## Generate the following sections:

### 1. STAR Answers (5 answers)
For each, provide a behavioral interview answer using the STAR format (Situation, Task, Action, Result) drawn from the candidate's actual experience. Target the most likely questions for this role.

### 2. Company Research Brief
- What the company does (2-3 sentences)
- Recent news or achievements
- Company culture indicators
- Tech stack observations from the job posting

### 3. Questions to Ask the Interviewer (5 questions)
Smart, role-specific questions that show deep understanding.

### 4. Technical Discussion Points
Key technical topics likely to come up and how the candidate should frame their experience.

### 5. Salary Negotiation Talking Points
Based on the candidate targeting $165K-$185K range.

Format the output in clean, readable text with clear section headers."""


def generate_prep(job_row: dict) -> str:
    """Generate interview prep materials using Claude API."""
    profile = _load_profile()
    prompt = _build_prep_prompt(job_row, profile)

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return "ERROR: ANTHROPIC_API_KEY not set. Cannot generate interview prep."

    try:
        client = anthropic.Anthropic(api_key=api_key)
        model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

        response = client.messages.create(
            model=model,
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text
    except Exception as e:
        return f"ERROR generating prep: {e}"


def _send_prep_telegram(title: str, company: str, prep_text: str) -> bool:
    """Send interview prep to Telegram (split into chunks if needed)."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_ids_raw = os.getenv("TELEGRAM_CHAT_IDS", "")

    if not bot_token or not chat_ids_raw:
        return False

    chat_ids = [cid.strip() for cid in chat_ids_raw.split(",") if cid.strip()]
    api_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"

    # Telegram max message length is 4096 chars
    header = f"\U0001f393 <b>Interview Prep: {title} at {company}</b>\n\n"
    max_chunk = 4000 - len(header)

    # Split prep text into chunks
    chunks = []
    remaining = prep_text
    while remaining:
        if len(remaining) <= max_chunk:
            chunks.append(remaining)
            break
        # Find a good break point
        cut = remaining[:max_chunk].rfind("\n\n")
        if cut < max_chunk // 2:
            cut = remaining[:max_chunk].rfind("\n")
        if cut < max_chunk // 2:
            cut = max_chunk
        chunks.append(remaining[:cut])
        remaining = remaining[cut:].lstrip()

    success = True
    for chat_id in chat_ids:
        for i, chunk in enumerate(chunks):
            text = header + chunk if i == 0 else chunk
            try:
                resp = requests.post(api_url, json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                }, timeout=15)
                resp.raise_for_status()
            except Exception as e:
                # Retry without HTML parse mode (in case of formatting issues)
                try:
                    resp = requests.post(api_url, json={
                        "chat_id": chat_id,
                        "text": text,
                        "disable_web_page_preview": True,
                    }, timeout=15)
                    resp.raise_for_status()
                except Exception as e2:
                    alert("Prep Error", f"Failed to send to {chat_id}: {e2}", "error")
                    success = False

    return success


def check_interview_statuses() -> int:
    """Check for jobs with 'Interview' status and send prep materials.

    Returns the number of prep packets sent.
    """
    sent_set = _load_prep_sent()
    sent_count = 0

    try:
        interview_rows = get_rows_by_status("Interview")
    except Exception as e:
        alert("Interview Prep", f"Failed to read sheet: {e}", "error")
        return 0

    if not interview_rows:
        alert("Interview Prep", "No jobs with Interview status")
        return 0

    for row in interview_rows:
        row_num = row.get("_row_num", "")
        if row_num in sent_set:
            continue

        title = row.get("Job Title", "Unknown")
        company = row.get("Company", "Unknown")

        alert("Interview Prep", f"Generating prep for {title} at {company}...")

        try:
            prep_text = generate_prep(row)

            if prep_text.startswith("ERROR"):
                alert("Interview Prep", prep_text, "error")
                continue

            # Save to file
            safe_name = f"{company}_{title}".replace(" ", "_")[:50]
            prep_path = os.path.join(BASE_DIR, ".tmp", f"interview_prep_{safe_name}.txt")
            os.makedirs(os.path.dirname(prep_path), exist_ok=True)
            with open(prep_path, "w", encoding="utf-8") as f:
                f.write(prep_text)

            # Send via Telegram
            _send_prep_telegram(title, company, prep_text)

            sent_set.add(row_num)
            _save_prep_sent(sent_set)
            sent_count += 1

            alert("Interview Prep", f"Prep sent for {title} at {company}")

        except Exception as e:
            alert("Interview Prep Error", f"Failed for {title}: {e}", "error")

    return sent_count


if __name__ == "__main__":
    count = check_interview_statuses()
    print(f"Sent {count} interview prep packet(s)")
