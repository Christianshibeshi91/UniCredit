"""Send Telegram notification when a new job is discovered and scored."""

import os
import requests  # pyre-ignore[21]
from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]


def _build_message(job, score_result):
    """Build a Telegram message with HTML formatting."""
    title = job.get("title", "Unknown")
    company = job.get("company", "Unknown")
    location = job.get("location", "")
    salary = job.get("salary", "Not listed")
    remote = job.get("remote_status", "Unknown")
    url = job.get("job_url", "")
    job_score = score_result.get("score", 0)
    grade = score_result.get("grade", "N/A")
    matched = score_result.get("matched_skills", [])
    missing = score_result.get("missing_skills", [])

    grade_emoji = {"A": "\u2b50", "B": "\U0001f7e2", "C": "\U0001f7e1", "D": "\U0001f7e0"}.get(grade, "\U0001f534")

    matched_str = ", ".join(matched) if matched else "None"
    missing_str = ", ".join(missing) if missing else "None"

    return (
        f"{grade_emoji} <b>New Job Match</b>\n"
        f"\n"
        f"<b>{title}</b>\n"
        f"{company} \u2014 {location}\n"
        f"\n"
        f"\U0001f4bc <b>Remote:</b> {remote}\n"
        f"\U0001f4b0 <b>Salary:</b> {salary}\n"
        f"\U0001f3af <b>Score:</b> {job_score}/100 ({grade})\n"
        f"\n"
        f"\u2705 <b>Matched:</b> {matched_str}\n"
        f"\u274c <b>Missing:</b> {missing_str}\n"
        f"\n"
        f'<a href="{url}">\U0001f517 View Job on LinkedIn</a>'
    )


def send_job_notification(job, score_result):
    """Send a Telegram message for a newly discovered and scored job.

    Requires these .env vars:
        TELEGRAM_BOT_TOKEN  – from @BotFather
        TELEGRAM_CHAT_IDS   – comma-separated chat IDs to notify
    """
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_ids_raw = os.getenv("TELEGRAM_CHAT_IDS", "")

    if not bot_token or not chat_ids_raw:
        alert("Telegram", "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_IDS not set — skipping.", "warning")
        return False

    chat_ids = [cid.strip() for cid in chat_ids_raw.split(",") if cid.strip()]
    title = job.get("title", "Unknown")
    message = _build_message(job, score_result)
    api_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"

    success = True
    for chat_id in chat_ids:
        try:
            resp = requests.post(api_url, json={
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "HTML",
                "disable_web_page_preview": False,
            }, timeout=10)
            resp.raise_for_status()
        except Exception as e:
            alert("Telegram Error", f"Failed to send to {chat_id}: {e}", "error")
            success = False

    if success:
        alert("Telegram", f"Job alert sent to {len(chat_ids)} chats: {title}")
    return success
