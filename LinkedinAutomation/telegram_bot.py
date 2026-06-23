"""Interactive Telegram bot for job approval/skip with inline keyboards.

Runs as a long-lived process alongside the daily cron job. When run_daily.py
discovers a qualifying job, it saves it to pending_approval.json. This bot
sends approval cards and handles callback responses.
"""
from __future__ import annotations

import asyncio
import html as html_lib
import json
import os
import re
import subprocess
import sys
import threading

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update  # pyre-ignore[21]
from telegram.ext import (  # pyre-ignore[21]
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, BASE_DIR)

from dotenv import load_dotenv  # pyre-ignore[21]

load_dotenv(os.path.join(BASE_DIR, ".env"))

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.apply_easy_apply import apply as easy_apply, apply_async  # pyre-ignore[21]
from LinkedinAutomation.apply_external_form import apply_external_async  # pyre-ignore[21]
from LinkedinAutomation.log_to_sheets import log_job, update_job_status  # pyre-ignore[21]

PENDING_PATH = os.path.join(BASE_DIR, ".tmp", "pending_approval.json")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
PYTHON_EXE = sys.executable

# Track running background processes launched via Telegram
_running_processes: dict = {}  # {name: {"proc": Popen, "log_lines": []}}

# Admin gets approval cards with Approve/Skip buttons
ADMIN_CHAT_IDS = [
    cid.strip()
    for cid in os.getenv("TELEGRAM_ADMIN_CHAT_IDS", "").split(",")
    if cid.strip()
]
# Viewers get notification-only messages (no buttons)
VIEWER_CHAT_IDS = [
    cid.strip()
    for cid in os.getenv("TELEGRAM_VIEWER_CHAT_IDS", "").split(",")
    if cid.strip()
]


def get_all_chat_ids() -> list:
    """Return deduplicated list of all configured chat IDs (admin + viewer + legacy)."""
    legacy = [
        cid.strip()
        for cid in os.getenv("TELEGRAM_CHAT_IDS", "").split(",")
        if cid.strip()
    ]
    return list(set(ADMIN_CHAT_IDS + VIEWER_CHAT_IDS + legacy))


# ── Interactive Q&A state (for asking admin about unknown form fields) ──
# When the apply flow hits an unknown field, it sets _pending_question
# and waits on the Event. The text_reply_handler fills in the answer.
_pending_question: dict | None = None
_bot_application: Application | None = None
_bot_loop: asyncio.AbstractEventLoop | None = None  # bot's event loop (set in run_bot)


def _esc(text: str) -> str:
    """Escape text for Telegram HTML to prevent injection from scraped data."""
    return html_lib.escape(str(text)) if text else ""


# ── Pending jobs file helpers ────────────────────────────────────────

_pending_lock = threading.Lock()


def load_pending() -> dict:
    """Load pending approval jobs. Keys are job_id strings."""
    if os.path.exists(PENDING_PATH):
        with open(PENDING_PATH, "r") as f:
            try:
                return json.load(f)
            except (json.JSONDecodeError, TypeError):
                return {}
    return {}


def save_pending(data: dict) -> None:
    os.makedirs(os.path.dirname(PENDING_PATH), exist_ok=True)
    with open(PENDING_PATH, "w") as f:
        json.dump(data, f, indent=2)


def add_pending_job(job_data: dict) -> None:
    """Add a job to the pending approval queue (called by run_daily.py)."""
    with _pending_lock:
        pending = load_pending()
        job_id = job_data.get("job_id", "unknown")
        pending[job_id] = job_data
        save_pending(pending)


def remove_pending_job(job_id: str) -> dict | None:
    """Remove and return a job from the pending queue."""
    with _pending_lock:
        pending = load_pending()
        job = pending.pop(job_id, None)
        save_pending(pending)
        return job


# ── Telegram message builders ───────────────────────────────────────

def _build_approval_message(job_data: dict) -> str:
    """Build the rich HTML message for a job approval card."""
    title = _esc(job_data.get("title", "Unknown"))
    company = _esc(job_data.get("company", "Unknown"))
    location = _esc(job_data.get("location", ""))
    salary = _esc(job_data.get("salary", "Not listed"))
    remote = _esc(job_data.get("remote_status", "Unknown"))
    url = _esc(job_data.get("job_url", ""))
    score = job_data.get("score", 0)
    grade = _esc(job_data.get("grade", "N/A"))
    matched = job_data.get("matched_skills", [])
    missing = job_data.get("missing_skills", [])
    app_type = _esc(job_data.get("application_type", "Unknown"))
    outreach = _esc(job_data.get("outreach_message", ""))
    best_contact = _esc(job_data.get("best_contact", ""))
    connections_summary = _esc(job_data.get("connections_summary", ""))

    grade_emoji = {"A": "\u2b50", "B": "\U0001f7e2", "C": "\U0001f7e1", "D": "\U0001f7e0"}.get(job_data.get("grade", ""), "\U0001f534")

    matched_str = ", ".join(_esc(s) for s in matched[:8]) if matched else "None"
    missing_str = ", ".join(_esc(s) for s in missing[:5]) if missing else "None"

    msg = (
        f"{grade_emoji} <b>New Job — Approve or Skip?</b>\n"
        f"\n"
        f"<b>{title}</b>\n"
        f"{company} \u2014 {location}\n"
        f"\n"
        f"\U0001f4bc <b>Type:</b> {app_type}\n"
        f"\U0001f4bc <b>Remote:</b> {remote}\n"
        f"\U0001f4b0 <b>Salary:</b> {salary}\n"
        f"\U0001f3af <b>Score:</b> {score}/100 ({grade})\n"
        f"\n"
        f"\u2705 <b>Matched:</b> {matched_str}\n"
        f"\u274c <b>Missing:</b> {missing_str}\n"
    )

    if connections_summary and connections_summary != _esc("Manual Lookup Required"):
        msg += f"\n\U0001f465 <b>Connection:</b> {connections_summary}"
        if best_contact:
            msg += f" ({best_contact})"
        msg += "\n"

    if outreach:
        msg += f"\n\U0001f4e8 <b>Referral Draft:</b>\n<i>{outreach}</i>\n"

    msg += f'\n<a href="{url}">\U0001f517 View Job on LinkedIn</a>'

    return msg


def _build_keyboard(job_id: str) -> InlineKeyboardMarkup:
    """Build approve/skip/details inline keyboard."""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("\u2705 Approve", callback_data=f"approve:{job_id}"),
            InlineKeyboardButton("\u274c Reject", callback_data=f"skip:{job_id}"),
        ],
        [
            InlineKeyboardButton("\U0001f4cb Details", callback_data=f"details:{job_id}"),
        ],
    ])


def _build_details_keyboard(job_id: str) -> InlineKeyboardMarkup:
    """Build keyboard for the details view with back/approve/reject."""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("\u2705 Approve", callback_data=f"approve:{job_id}"),
            InlineKeyboardButton("\u274c Reject", callback_data=f"skip:{job_id}"),
        ],
        [
            InlineKeyboardButton("\U0001f4dc Cover Letter", callback_data=f"coverletter:{job_id}"),
            InlineKeyboardButton("\U0001f4c4 Resume", callback_data=f"resume:{job_id}"),
        ],
        [
            InlineKeyboardButton("\u25c0\ufe0f Back", callback_data=f"back:{job_id}"),
        ],
    ])


# ── Bot handlers ────────────────────────────────────────────────────

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command."""
    await update.message.reply_text(
        "\U0001f916 <b>LinkApply Bot</b>\n\n"
        "I'll send you job matches for approval before applying.\n\n"
        "<b>Job Management:</b>\n"
        "/pending — Show pending jobs\n"
        "/stats — Today's stats\n\n"
        "<b>Remote Control:</b>\n"
        "/run — Start daily job discovery\n"
        "/run_test — Run E2E test pipeline\n"
        "/stop — Stop running task\n"
        "/status — Show running tasks\n"
        "/logs — Show recent output\n"
        "/shell <cmd> — Run a shell command\n"
        "/claude <prompt> — Run Claude Code AI\n\n"
        "/start — This message",
        parse_mode="HTML",
    )


async def pending_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /pending — list all pending approval jobs."""
    pending = load_pending()
    if not pending:
        await update.message.reply_text("\u2705 No jobs pending approval.")
        return

    msg = f"\U0001f4cb <b>Pending Jobs ({len(pending)})</b>\n\n"
    for job_id, job in pending.items():
        title = job.get("title", "Unknown")
        company = job.get("company", "Unknown")
        score = job.get("score", 0)
        msg += f"\u2022 {title} @ {company} — {score}/100\n"

    await update.message.reply_text(msg, parse_mode="HTML")


async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /stats — show today's run stats."""
    state_path = os.path.join(BASE_DIR, ".tmp", "run_state.json")
    if not os.path.exists(state_path):
        await update.message.reply_text("No run data available yet.")
        return

    with open(state_path, "r") as f:
        state = json.load(f)

    pending = load_pending()

    msg = (
        f"\U0001f4ca <b>Today's Stats</b> ({state.get('run_date', 'N/A')})\n\n"
        f"\U0001f4e5 Jobs processed: {len(state.get('jobs_processed', []))}\n"
        f"\u2705 Applications: {state.get('applications_today', 0)}\n"
        f"\u23f3 Pending approval: {len(pending)}\n"
        f"\u26a0\ufe0f Errors: {len(state.get('errors', []))}\n"
    )
    await update.message.reply_text(msg, parse_mode="HTML")


async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle approve/skip/details button callbacks."""
    query = update.callback_query
    await query.answer()

    chat_id = str(query.message.chat_id)
    if chat_id not in ADMIN_CHAT_IDS:
        await query.edit_message_text("Unauthorized.")
        return

    data = query.data
    if not data or ":" not in data:
        await query.edit_message_text("Invalid callback data.")
        return
    action, job_id = data.split(":", 1)

    pending = load_pending()
    job_data = pending.get(job_id)

    if not job_data:
        await query.edit_message_text(
            f"\u26a0\ufe0f Job {job_id} is no longer pending (already processed)."
        )
        return

    if action == "approve":
        await _handle_approve(query, job_id, job_data)
    elif action == "skip":
        await _handle_skip(query, job_id, job_data)
    elif action == "details":
        await _handle_details(query, job_id, job_data)
    elif action == "coverletter":
        await _handle_cover_letter(query, job_id, job_data)
    elif action == "resume":
        await _handle_resume(query, job_id, job_data)
    elif action == "back":
        await _handle_back(query, job_id, job_data)


# ── Remote control: run automation from phone ────────────────────────

def _is_admin(update: Update) -> bool:
    """Check if the message sender is an admin."""
    chat_id = str(update.message.chat_id)
    return chat_id in ADMIN_CHAT_IDS


async def _stream_process_output(proc, name: str, chat_id: str, bot) -> None:
    """Background task: read process stdout and collect logs."""
    log_lines = _running_processes.get(name, {}).get("log_lines", [])
    try:
        while True:
            line = await asyncio.get_event_loop().run_in_executor(
                None, proc.stdout.readline
            )
            if not line:
                break
            decoded = line.decode("utf-8", errors="replace").rstrip()
            if decoded:
                log_lines.append(decoded)
                # Keep only last 200 lines
                if len(log_lines) > 200:
                    log_lines.pop(0)
    except Exception:
        pass
    finally:
        proc.wait()
        exit_code = proc.returncode
        emoji = "\u2705" if exit_code == 0 else "\u274c"
        try:
            await bot.send_message(
                chat_id=chat_id,
                text=f"{emoji} <b>{name}</b> finished (exit code {exit_code})",
                parse_mode="HTML",
            )
        except Exception:
            pass
        _running_processes.pop(name, None)


async def run_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /run — start run_daily.py remotely."""
    if not _is_admin(update):
        await update.message.reply_text("\u26d4 Unauthorized.")
        return

    if "daily" in _running_processes:
        await update.message.reply_text("\u26a0\ufe0f Daily run is already running. Use /stop to cancel.")
        return

    # Parse optional --max-jobs argument
    args_text = " ".join(context.args) if context.args else ""
    cmd = [PYTHON_EXE, os.path.join(BASE_DIR, "run_daily.py")]
    if args_text:
        cmd.extend(args_text.split())

    await update.message.reply_text(
        f"\U0001f680 <b>Starting daily run...</b>\n<code>{' '.join(cmd)}</code>",
        parse_mode="HTML",
    )

    proc = subprocess.Popen(
        cmd, cwd=BASE_DIR, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    _running_processes["daily"] = {"proc": proc, "log_lines": []}

    bot = context.application.bot
    chat_id = str(update.message.chat_id)
    asyncio.create_task(_stream_process_output(proc, "daily", chat_id, bot))


async def run_test_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /run_test — start test_end_to_end.py remotely."""
    if not _is_admin(update):
        await update.message.reply_text("\u26d4 Unauthorized.")
        return

    if "test" in _running_processes:
        await update.message.reply_text("\u26a0\ufe0f Test is already running. Use /stop to cancel.")
        return

    cmd = [PYTHON_EXE, os.path.join(BASE_DIR, "test_end_to_end.py")]

    await update.message.reply_text(
        f"\U0001f9ea <b>Starting E2E test...</b>\n<code>{' '.join(cmd)}</code>",
        parse_mode="HTML",
    )

    proc = subprocess.Popen(
        cmd, cwd=BASE_DIR, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    _running_processes["test"] = {"proc": proc, "log_lines": []}

    bot = context.application.bot
    chat_id = str(update.message.chat_id)
    asyncio.create_task(_stream_process_output(proc, "test", chat_id, bot))


async def stop_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /stop — kill running background processes."""
    if not _is_admin(update):
        await update.message.reply_text("\u26d4 Unauthorized.")
        return

    if not _running_processes:
        await update.message.reply_text("\u2705 No tasks are currently running.")
        return

    # If a specific name given, stop that; otherwise stop all
    target = context.args[0] if context.args else None

    stopped = []
    for name in list(_running_processes.keys()):
        if target and name != target:
            continue
        entry = _running_processes[name]
        proc = entry["proc"]
        try:
            proc.terminate()
            stopped.append(name)
        except Exception:
            try:
                proc.kill()
                stopped.append(name)
            except Exception:
                pass
        _running_processes.pop(name, None)

    if stopped:
        await update.message.reply_text(
            f"\U0001f6d1 Stopped: {', '.join(stopped)}"
        )
    else:
        await update.message.reply_text("\u26a0\ufe0f No matching task found.")


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /status — show running tasks and system info."""
    if not _is_admin(update):
        await update.message.reply_text("\u26d4 Unauthorized.")
        return

    if not _running_processes:
        # Fall through to /stats behavior
        await stats_command(update, context)
        return

    msg = "\U0001f4e1 <b>Running Tasks</b>\n\n"
    for name, entry in _running_processes.items():
        proc = entry["proc"]
        lines = entry.get("log_lines", [])
        status = "Running" if proc.poll() is None else f"Exited ({proc.returncode})"
        last_line = lines[-1][:80] if lines else "(no output yet)"
        msg += (
            f"\u25b6\ufe0f <b>{name}</b> — PID {proc.pid}\n"
            f"   Status: {status}\n"
            f"   Lines: {len(lines)}\n"
            f"   Last: <code>{last_line}</code>\n\n"
        )

    await update.message.reply_text(msg, parse_mode="HTML")


async def logs_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /logs [name] [N] — show last N lines of a running task."""
    if not _is_admin(update):
        await update.message.reply_text("\u26d4 Unauthorized.")
        return

    if not _running_processes:
        await update.message.reply_text("No tasks running. Showing daily_run.log instead.")
        log_path = os.path.join(BASE_DIR, "daily_run.log")
        if os.path.exists(log_path):
            with open(log_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()[-20:]  # pyre-ignore[29]
            text = "".join(lines)[:3500]  # pyre-ignore[29]
            await update.message.reply_text(f"<pre>{text}</pre>", parse_mode="HTML")
        else:
            await update.message.reply_text("No log file found.")
        return

    # Parse args: /logs [name] [count]
    args = context.args or []
    name = args[0] if args else list(_running_processes.keys())[0]
    count = 20
    if len(args) >= 2:
        try:
            count = int(args[1])
        except ValueError:
            pass

    entry = _running_processes.get(name)
    if not entry:
        await update.message.reply_text(f"No task named '{name}'. Running: {', '.join(_running_processes.keys())}")
        return

    lines = entry.get("log_lines", [])
    tail = lines[-count:]
    if not tail:
        await update.message.reply_text(f"No output from '{name}' yet.")
        return

    text = "\n".join(tail)[:3500]  # pyre-ignore[29]
    await update.message.reply_text(
        f"\U0001f4c3 <b>Logs: {name}</b> (last {len(tail)} lines)\n\n<pre>{text}</pre>",
        parse_mode="HTML",
    )


# Shell PIN must be set in .env (no default). If unset, /shell is disabled.
_SHELL_PIN = os.getenv("SHELL_PIN", "").strip()


async def shell_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /shell <PIN> <command> — run a shell command (requires PIN)."""
    if not _is_admin(update):
        await update.message.reply_text("\u26d4 Unauthorized.")
        return

    if not _SHELL_PIN:
        await update.message.reply_text("\u26a0\ufe0f Shell is disabled. Set SHELL_PIN in .env to enable.")
        return

    if not context.args or len(context.args) < 2:
        await update.message.reply_text("Usage: /shell <PIN> <command>")
        return

    pin = context.args[0]
    if pin != _SHELL_PIN:
        await update.message.reply_text("\u26d4 Invalid PIN.")
        return

    cmd = " ".join(context.args[1:])
    await update.message.reply_text(f"\u23f3 Running: <code>{cmd}</code>", parse_mode="HTML")

    try:
        def _run_shell() -> subprocess.CompletedProcess[bytes]:
            return subprocess.run(
                cmd, shell=True, cwd=BASE_DIR, capture_output=True, timeout=30,
            )

        result = await asyncio.get_event_loop().run_in_executor(None, _run_shell)  # pyre-ignore[6]
        output = (result.stdout or b"").decode("utf-8", errors="replace")
        stderr = (result.stderr or b"").decode("utf-8", errors="replace")

        text = ""
        if output:
            text += output[:3000]  # pyre-ignore[29]
        if stderr:
            text += f"\n\nSTDERR:\n{stderr[:500]}"  # pyre-ignore[29]
        if not text:
            text = "(no output)"

        emoji = "\u2705" if result.returncode == 0 else "\u274c"
        await update.message.reply_text(
            f"{emoji} Exit {result.returncode}\n<pre>{text}</pre>",
            parse_mode="HTML",
        )
    except subprocess.TimeoutExpired:
        await update.message.reply_text("\u26a0\ufe0f Command timed out (30s limit).")
    except Exception as e:
        await update.message.reply_text(f"\u274c Error: {e}")


async def claude_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /claude <prompt> — run Claude Code CLI in headless mode."""
    if not _is_admin(update):
        await update.message.reply_text("\u26d4 Unauthorized.")
        return

    if not context.args:
        await update.message.reply_text(
            "Usage: /claude <prompt>\n\n"
            "Examples:\n"
            "<code>/claude fix the lint errors in score_job.py</code>\n"
            "<code>/claude add error handling to run_daily.py</code>\n"
            "<code>/claude explain what tailor_resume.py does</code>\n"
            "<code>/claude run the tests and fix any failures</code>",
            parse_mode="HTML",
        )
        return

    prompt = " ".join(context.args)

    if "claude" in _running_processes:
        await update.message.reply_text(
            "\u26a0\ufe0f A Claude session is already running.\n"
            "Use /stop claude to cancel it, or /logs claude to see output."
        )
        return

    await update.message.reply_text(
        f"\U0001f9e0 <b>Claude Code</b>\n\n"
        f"Prompt: <i>{prompt[:200]}</i>\n\n"  # pyre-ignore[29]
        f"Running... Use /logs claude to check progress.",
        parse_mode="HTML",
    )

    # Run claude -p in print (non-interactive) mode
    cmd = ["claude", "-p", prompt, "--output-format", "text"]

    proc = subprocess.Popen(
        cmd, cwd=BASE_DIR, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    _running_processes["claude"] = {"proc": proc, "log_lines": []}

    bot = context.application.bot
    chat_id = str(update.message.chat_id)

    # Stream output in background and send result when done
    async def _monitor_claude():
        log_lines = _running_processes.get("claude", {}).get("log_lines", [])
        try:
            while True:
                line = await asyncio.get_event_loop().run_in_executor(
                    None, proc.stdout.readline  # pyre-ignore[16]
                )
                if not line:
                    break
                decoded = line.decode("utf-8", errors="replace").rstrip()  # pyre-ignore[16]
                if decoded:
                    log_lines.append(decoded)
                    if len(log_lines) > 500:
                        log_lines.pop(0)
        except Exception:
            pass
        finally:
            proc.wait()
            exit_code = proc.returncode
            _running_processes.pop("claude", None)

            # Send the full result
            result_text = "\n".join(log_lines)
            if not result_text:
                result_text = "(no output)"

            # Split into chunks if too long for Telegram (4096 char limit)
            emoji = "\u2705" if exit_code == 0 else "\u274c"
            header = f"{emoji} <b>Claude Code finished</b> (exit {exit_code})\n\n"

            if len(result_text) <= 3500:
                await bot.send_message(
                    chat_id=chat_id,
                    text=f"{header}<pre>{result_text}</pre>",
                    parse_mode="HTML",
                )
            else:
                # Send in chunks
                await bot.send_message(
                    chat_id=chat_id,
                    text=f"{header}Output is long, sending in parts...",
                    parse_mode="HTML",
                )
                for i in range(0, len(result_text), 3500):
                    chunk = result_text[i:i + 3500]  # pyre-ignore[29]
                    try:
                        await bot.send_message(
                            chat_id=chat_id,
                            text=f"<pre>{chunk}</pre>",
                            parse_mode="HTML",
                        )
                    except Exception:
                        # If HTML fails, send as plain text
                        await bot.send_message(chat_id=chat_id, text=chunk)

    asyncio.create_task(_monitor_claude())


# ── Batched Q&A: send ALL unknown fields in one message ───────────

def parse_numbered_replies(text: str, expected_count: int = 1) -> list[str]:
    """Parse numbered reply formats into a list of answers.

    Supports formats: "1. Yes", "1: Yes", "1) Yes", "1- Yes".
    Falls back to treating the entire text as a single answer when
    expected_count is 1 and no numbered pattern is found.
    """
    # Match lines starting with a number followed by . : ) or -
    pattern = r"^\s*\d+\s*[.:\)\-]\s*(.+)"
    matches = re.findall(pattern, text, re.MULTILINE)

    if matches:
        return [m.strip() for m in matches]

    # Fallback: single answer when only one question was asked
    if expected_count == 1 and text.strip():
        return [text.strip()]

    return []


async def send_batch_questions(
    job_title: str,
    job_url: str,
    fields: list[dict],
    screenshot_path: str = "",
) -> None:
    """Send a single Telegram message with all unknown fields as numbered questions.

    Each field dict should contain:
        - label (str): the form field label
        - type (str): "select", "radio", "checkbox", "text", etc.
        - options (list[str], optional): available choices for select/radio
    """
    if not _bot_application or not ADMIN_CHAT_IDS:
        return

    bot = _bot_application.bot  # pyre-ignore[16]

    lines = [
        "\U0001f514 <b>Application needs your input</b>",
        f"\U0001f4cb {_esc(job_title)}",
        f"\U0001f517 {_esc(job_url)}",
        "",
    ]

    for i, field in enumerate(fields, 1):
        label = _esc(field.get("label", f"Field {i}"))
        field_type = field.get("type", "text").lower()
        options = field.get("options", [])

        if field_type in ("select", "radio") and options:
            display_opts = options[:6]
            hint = " / ".join(_esc(o) for o in display_opts)
            if len(options) > 6:
                hint += " / ..."
            lines.append(f"{i}. {label} [{hint}]")
        elif field_type == "checkbox":
            lines.append(f"{i}. {label} [Yes/No]")
        else:
            lines.append(f"{i}. {label} [text]")

    lines.extend([
        "",
        "Reply with numbered answers, e.g.:",
        "1. Yes",
        "2. 8",
        "3. Remote",
        "",
        "\u23f1 Auto-skip in 60 min if no reply",
        "Type /skip to skip this application",
    ])

    message_text = "\n".join(lines)

    for chat_id in ADMIN_CHAT_IDS:
        try:
            if screenshot_path and os.path.exists(screenshot_path):
                with open(screenshot_path, "rb") as photo:
                    await bot.send_photo(chat_id=chat_id, photo=photo)
            await bot.send_message(
                chat_id=chat_id,
                text=message_text,
                parse_mode="HTML",
            )
        except Exception as e:
            alert("Telegram Batch Q&A", f"Failed to send questions: {e}", "error")


async def wait_for_batch_reply(
    expected_count: int,
    timeout: int | None = None,
) -> list[str] | None:
    """Wait for admin's numbered reply to batch questions.

    Returns a list of answers or None on timeout / /skip.
    Sends a follow-up prompt if the reply has fewer answers than expected.
    """
    global _pending_question

    if not _bot_application or not ADMIN_CHAT_IDS:
        return None

    if timeout is None:
        timeout = int(os.getenv("TELEGRAM_QA_TIMEOUT", "3600"))

    bot = _bot_application.bot  # pyre-ignore[16]
    event = asyncio.Event()
    _pending_question = {"event": event, "answer": None}

    try:
        await asyncio.wait_for(event.wait(), timeout=timeout)
    except asyncio.TimeoutError:
        for chat_id in ADMIN_CHAT_IDS:
            try:
                await bot.send_message(
                    chat_id=chat_id,
                    text="\u23f0 Timed out waiting for batch answers. Skipping application.",
                )
            except Exception:
                pass
        _pending_question = None
        return None

    raw_answer = _pending_question.get("answer", "") if _pending_question else ""
    _pending_question = None

    if not raw_answer or raw_answer.strip().lower() == "/skip":
        return None

    answers = parse_numbered_replies(raw_answer, expected_count)

    # If partial answers received, ask for remaining
    if 0 < len(answers) < expected_count:
        missing_start = len(answers) + 1
        for chat_id in ADMIN_CHAT_IDS:
            try:
                await bot.send_message(
                    chat_id=chat_id,
                    text=(
                        f"Got {len(answers)} of {expected_count} answers. "
                        f"Please reply with answers for questions "
                        f"{missing_start}-{expected_count}:"
                    ),
                )
            except Exception:
                pass

        # Wait again for remaining answers
        event2 = asyncio.Event()
        _pending_question = {"event": event2, "answer": None}

        try:
            await asyncio.wait_for(event2.wait(), timeout=timeout)
        except asyncio.TimeoutError:
            _pending_question = None
            return answers  # Return partial answers rather than nothing

        raw_remaining = _pending_question.get("answer", "") if _pending_question else ""
        _pending_question = None

        if raw_remaining and raw_remaining.strip().lower() != "/skip":
            remaining = parse_numbered_replies(raw_remaining, expected_count - len(answers))
            answers.extend(remaining)

    return answers if answers else None


def get_batch_ask_callback():
    """Factory for batched Q&A callback (used by apply functions).

    Returns an async callable that sends all unknown fields in one message
    and waits for a single numbered reply, or None if bot is not running.
    """
    async def _batch_ask(
        job_title: str,
        job_url: str,
        fields: list[dict],
        screenshot_path: str = "",
    ) -> list[str] | None:
        await send_batch_questions(job_title, job_url, fields, screenshot_path)
        return await wait_for_batch_reply(len(fields))

    if not _bot_application or not ADMIN_CHAT_IDS or not _bot_loop:
        return None
    return _batch_ask


def get_scheduler_batch_ask_callback():
    """Thread-safe batched Q&A callback for the scheduler thread.

    Bridges the scheduler thread to the bot's event loop, same pattern
    as get_scheduler_ask_callback but for batched field questions.
    """
    import threading as _threading

    async def _batch_ask(
        job_title: str,
        job_url: str,
        fields: list[dict],
        screenshot_path: str = "",
    ) -> list[str] | None:
        global _pending_question

        if not _bot_application or not ADMIN_CHAT_IDS or not _bot_loop:
            return None

        reply_event = _threading.Event()
        qa_timeout = int(os.getenv("TELEGRAM_QA_TIMEOUT", "3600"))

        async def _send_and_wait():
            global _pending_question

            await send_batch_questions(job_title, job_url, fields, screenshot_path)

            async_event = asyncio.Event()
            _pending_question = {
                "event": async_event,
                "answer": None,
                "thread_event": reply_event,
                "thread_answer": None,
            }

        future = asyncio.run_coroutine_threadsafe(_send_and_wait(), _bot_loop)
        try:
            future.result(timeout=15)
        except Exception as e:
            alert("Telegram Batch Q&A", f"Could not send questions: {e}", "error")
            return None

        loop = asyncio.get_event_loop()
        replied = await loop.run_in_executor(
            None, lambda: reply_event.wait(timeout=qa_timeout)
        )

        if not replied:
            async def _send_timeout():
                global _pending_question
                bot = _bot_application.bot  # pyre-ignore[16]
                for chat_id in ADMIN_CHAT_IDS:
                    try:
                        await bot.send_message(
                            chat_id=chat_id,
                            text="\u23f0 Timed out waiting for batch answers. Skipping.",
                        )
                    except Exception:
                        pass
                _pending_question = None

            asyncio.run_coroutine_threadsafe(_send_timeout(), _bot_loop)
            return None

        raw_answer = (
            _pending_question.get("thread_answer", "")
            if _pending_question else ""
        )

        async def _cleanup():
            global _pending_question
            _pending_question = None
        asyncio.run_coroutine_threadsafe(_cleanup(), _bot_loop)

        if not raw_answer or raw_answer.strip().lower() == "/skip":
            return None

        return parse_numbered_replies(raw_answer, len(fields)) or None

    if not _bot_application or not ADMIN_CHAT_IDS or not _bot_loop:
        return None
    return _batch_ask


# ── Interactive Q&A: ask admin for unknown form fields ─────────────

def _create_ask_admin_callback():
    """Factory that returns an async callback for asking admin via Telegram.

    The callback sends a screenshot + question to admin chat IDs,
    then waits on an asyncio.Event for the admin's text reply.
    """
    async def ask_callback(question: str, screenshot_path: str) -> str | None:
        global _pending_question

        if not _bot_application or not ADMIN_CHAT_IDS:
            return None

        bot = _bot_application.bot  # pyre-ignore[16]
        event = asyncio.Event()
        _pending_question = {"event": event, "answer": None}

        for chat_id in ADMIN_CHAT_IDS:
            try:
                # Send the screenshot first
                if screenshot_path and os.path.exists(screenshot_path):
                    with open(screenshot_path, "rb") as photo:
                        await bot.send_photo(
                            chat_id=chat_id,
                            photo=photo,
                            caption=question[:1024],  # pyre-ignore[6] Telegram caption limit
                        )
                else:
                    await bot.send_message(
                        chat_id=chat_id,
                        text=question,
                    )
            except Exception as e:
                alert("Telegram Q&A", f"Failed to send question: {e}", "error")
                _pending_question = None
                return None

        # Wait for admin reply (5 minute timeout)
        try:
            await asyncio.wait_for(event.wait(), timeout=300)
        except asyncio.TimeoutError:
            alert("Telegram Q&A", "Admin did not reply within 5 minutes", "warning")
            for chat_id in ADMIN_CHAT_IDS:
                try:
                    await bot.send_message(chat_id=chat_id, text="Timed out waiting for answer. Skipping field.")
                except Exception:
                    pass
            _pending_question = None
            return None

        answer = _pending_question.get("answer") if _pending_question else None
        _pending_question = None
        return answer

    return ask_callback


def get_scheduler_ask_callback():
    """Create a thread-safe ask_callback for use from the scheduler thread.

    This bridges the scheduler thread (which runs its own asyncio loop for
    Playwright) to the bot's event loop (which handles Telegram messaging).
    Uses threading.Event for cross-thread synchronization.
    """
    import threading as _threading

    async def ask_callback(question: str, screenshot_path: str) -> str | None:
        global _pending_question

        if not _bot_application or not ADMIN_CHAT_IDS or not _bot_loop:
            return None

        # Threading event for cross-thread sync
        reply_event = _threading.Event()

        # Send question via bot's event loop
        async def _send_question():
            global _pending_question
            bot = _bot_application.bot  # pyre-ignore[16]

            async_event = asyncio.Event()
            _pending_question = {
                "event": async_event,
                "answer": None,
                "thread_event": reply_event,
                "thread_answer": None,
            }

            for chat_id in ADMIN_CHAT_IDS:
                try:
                    if screenshot_path and os.path.exists(screenshot_path):
                        with open(screenshot_path, "rb") as photo:
                            await bot.send_photo(
                                chat_id=chat_id,
                                photo=photo,
                                caption=question[:1024],
                            )
                    else:
                        await bot.send_message(chat_id=chat_id, text=question)
                except Exception as e:
                    alert("Telegram Q&A", f"Failed to send question: {e}", "error")
                    _pending_question = None
                    reply_event.set()  # unblock the waiting thread
                    return

        # Submit send to the bot's loop
        future = asyncio.run_coroutine_threadsafe(_send_question(), _bot_loop)
        try:
            future.result(timeout=15)
        except Exception as e:
            alert("Telegram Q&A", f"Could not send question: {e}", "error")
            return None

        # Wait for admin reply using run_in_executor (non-blocking for our event loop)
        loop = asyncio.get_event_loop()
        replied = await loop.run_in_executor(None, lambda: reply_event.wait(timeout=300))

        if not replied:
            # Timeout — notify admin
            async def _send_timeout():
                global _pending_question
                bot = _bot_application.bot  # pyre-ignore[16]
                for chat_id in ADMIN_CHAT_IDS:
                    try:
                        await bot.send_message(
                            chat_id=chat_id,
                            text="Timed out waiting for answer. Skipping field.",
                        )
                    except Exception:
                        pass
                _pending_question = None

            asyncio.run_coroutine_threadsafe(_send_timeout(), _bot_loop)
            return None

        answer = _pending_question.get("thread_answer") if _pending_question else None
        # Clean up
        async def _cleanup():
            global _pending_question
            _pending_question = None
        asyncio.run_coroutine_threadsafe(_cleanup(), _bot_loop)

        if answer and answer.strip().lower() == "/skip":
            return None
        return answer

    return ask_callback


async def text_reply_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle admin's text reply to a form field question."""
    global _pending_question

    if not update.message or not update.message.text:
        return

    chat_id = str(update.message.chat_id)
    if chat_id not in ADMIN_CHAT_IDS:
        return

    # Only process if there's a pending question
    if _pending_question is None:
        return

    answer = update.message.text.strip()
    _pending_question["answer"] = answer  # pyre-ignore[29]
    _pending_question["event"].set()  # pyre-ignore[29]

    # Also signal threading event for cross-thread callers (scheduler)
    thread_event = _pending_question.get("thread_event")  # pyre-ignore[29]
    if thread_event is not None:
        _pending_question["thread_answer"] = answer  # pyre-ignore[29]
        thread_event.set()

    if answer.lower() == "/skip":
        await update.message.reply_text("Skipping this field/application.")
    else:
        # Show parsed count for numbered replies so admin knows it was understood
        parsed = parse_numbered_replies(answer)
        if len(parsed) > 1:
            await update.message.reply_text(f"Got {len(parsed)} answers. Processing...")
        else:
            await update.message.reply_text(f"Got it: {_esc(answer)}")


async def _handle_approve(query, job_id: str, job_data: dict) -> None:
    """Apply to the job and update sheet."""
    global _pending_question

    title = job_data.get("title", "Unknown")
    company = job_data.get("company", "Unknown")

    await query.edit_message_text(
        f"\u23f3 Applying to <b>{title}</b> at {company}...",
        parse_mode="HTML",
    )

    applied = "No"
    ask_cb = _create_ask_admin_callback()

    try:
        if job_data.get("application_type") == "Easy Apply":
            resume_file = job_data.get("resume_file", "")
            cl_text = job_data.get("cover_letter_text", "")
            result = await apply_async(
                {"job_url": job_data.get("job_url"), "job_id": job_id,
                 "title": title, "company": company, "is_easy_apply": True},
                resume_file, cl_text, ask_callback=ask_cb,
            )
            if result:
                applied = "Yes"
        else:
            # External application — auto-fill ATS form
            resume_file = job_data.get("resume_file", "")
            result = await apply_external_async(
                {"job_url": job_data.get("job_url"), "job_id": job_id,
                 "title": title, "company": company},
                resume_file, ask_callback=ask_cb,
            )
            if result:
                applied = "Yes"
    except Exception as e:
        alert("Apply Error", str(e), "error")
    finally:
        _pending_question = None

    # Update Google Sheet
    sheet_row = job_data.get("sheet_row")
    sheet_ok = False
    status = "Applied" if applied == "Yes" else "Approved - Manual Apply"
    if sheet_row:
        try:
            update_job_status(sheet_row, status, applied)
            sheet_ok = True
        except Exception as e:
            alert("Sheet Update Error", str(e), "warning")

    # Remove from pending
    remove_pending_job(job_id)

    status_emoji = "\u2705" if applied == "Yes" else "\U0001f4dd"
    sheet_msg = "Sheet updated" if sheet_ok else "Sheet update failed"
    await query.edit_message_text(
        f"{status_emoji} <b>{title}</b> at {company}\n"
        f"\U0001f4bc Status: {status}\n"
        f"\U0001f4ca {sheet_msg} (row {sheet_row})",
        parse_mode="HTML",
    )


async def _handle_skip(query, job_id: str, job_data: dict) -> None:
    """Reject the job and update sheet."""
    title = job_data.get("title", "Unknown")
    company = job_data.get("company", "Unknown")

    # Update Google Sheet
    sheet_row = job_data.get("sheet_row")
    sheet_ok = False
    if sheet_row:
        try:
            update_job_status(sheet_row, "Rejected", "No")
            sheet_ok = True
        except Exception as e:
            alert("Sheet Update Error", str(e), "warning")

    remove_pending_job(job_id)

    sheet_msg = "Sheet updated" if sheet_ok else "Sheet update failed"
    await query.edit_message_text(
        f"\u274c <b>Rejected:</b> {title} at {company}\n"
        f"\U0001f4ca {sheet_msg} \u2014 Status: Rejected",
        parse_mode="HTML",
    )


async def _handle_details(query, job_id: str, job_data: dict) -> None:
    """Show comprehensive job details."""
    title = _esc(job_data.get("title", "Unknown"))
    company = _esc(job_data.get("company", "Unknown"))
    location = _esc(job_data.get("location", ""))
    salary = _esc(job_data.get("salary", "Not listed"))
    remote = _esc(job_data.get("remote_status", "Unknown"))
    url = _esc(job_data.get("job_url", ""))
    score_val = job_data.get("score", 0)
    grade = _esc(job_data.get("grade", "N/A"))
    matched = job_data.get("matched_skills", [])
    missing = job_data.get("missing_skills", [])
    app_type = _esc(job_data.get("application_type", "Unknown"))
    desc = _esc(job_data.get("description", "No description available."))
    connections = _esc(job_data.get("connections_summary", ""))
    best_contact = _esc(job_data.get("best_contact", ""))
    leadership = _esc(job_data.get("leadership_opportunity_level", ""))
    enterprise = _esc(job_data.get("enterprise_relevance_score", ""))
    resume_drive = _esc(job_data.get("resume_drive_link", ""))
    cl_drive = _esc(job_data.get("cover_letter_drive_link", ""))
    sheet_row = job_data.get("sheet_row", "")

    grade_emoji = {"A": "\u2b50", "B": "\U0001f7e2", "C": "\U0001f7e1", "D": "\U0001f7e0"}.get(job_data.get("grade", ""), "\U0001f534")
    matched_str = ", ".join(_esc(s) for s in matched) if matched else "None"
    missing_str = ", ".join(_esc(s) for s in missing) if missing else "None"

    msg = (
        f"\U0001f4cb <b>FULL DETAILS</b>\n"
        f"\n"
        f"<b>{title}</b>\n"
        f"{company} \u2014 {location}\n"
        f"\n"
        f"\U0001f4bc <b>Type:</b> {app_type}\n"
        f"\U0001f3e0 <b>Remote:</b> {remote}\n"
        f"\U0001f4b0 <b>Salary:</b> {salary}\n"
        f"\n"
        f"{grade_emoji} <b>Score:</b> {score_val}/100 ({grade})\n"
    )

    if leadership:
        msg += f"\U0001f451 <b>Leadership Level:</b> {leadership}\n"
    if enterprise:
        msg += f"\U0001f3e2 <b>Enterprise Relevance:</b> {enterprise}\n"

    msg += (
        f"\n"
        f"\u2705 <b>Matched Skills:</b>\n{matched_str}\n"
        f"\n"
        f"\u274c <b>Missing Skills:</b>\n{missing_str}\n"
    )

    if connections and connections not in ("", "Manual Lookup Required"):
        msg += f"\n\U0001f465 <b>Connections:</b> {connections}\n"
    if best_contact and best_contact not in ("", "Manual Lookup Required", "TEST"):
        msg += f"\U0001f464 <b>Best Contact:</b> {best_contact}\n"

    # Drive links
    if resume_drive or cl_drive:
        msg += "\n\U0001f4ce <b>Documents:</b>\n"
        if resume_drive:
            msg += f'  \u2022 <a href="{resume_drive}">Download Resume</a>\n'
        if cl_drive:
            msg += f'  \u2022 <a href="{cl_drive}">Download Cover Letter</a>\n'

    if sheet_row:
        msg += f"\n\U0001f4ca <b>Sheet Row:</b> {sheet_row}\n"

    if url:
        msg += f'\n<a href="{url}">\U0001f517 View Job on LinkedIn</a>\n'

    # Trim description to fit Telegram 4096 char limit
    remaining = 4096 - len(msg) - 50
    if remaining > 200:
        desc_trimmed = desc[:remaining] if len(desc) > remaining else desc
        if len(desc) > remaining:
            desc_trimmed += "..."
        msg += f"\n<b>Description:</b>\n{desc_trimmed}"

    keyboard = _build_details_keyboard(job_id)
    await query.edit_message_text(msg, parse_mode="HTML", reply_markup=keyboard, disable_web_page_preview=True)


async def _handle_cover_letter(query, job_id: str, job_data: dict) -> None:
    """Show the cover letter text."""
    title = job_data.get("title", "Unknown")
    company = job_data.get("company", "Unknown")
    cl_text = job_data.get("cover_letter_text", "")

    if not cl_text:
        cl_drive = job_data.get("cover_letter_drive_link", "")
        if cl_drive:
            msg = f'\U0001f4dc <b>Cover Letter for {title}</b>\n\nNo preview available.\n<a href="{cl_drive}">Download PDF</a>'
        else:
            msg = f"\U0001f4dc <b>Cover Letter for {title}</b>\n\nNo cover letter generated yet."
    else:
        # Telegram 4096 limit
        preview = cl_text[:3500] if len(cl_text) > 3500 else cl_text
        if len(cl_text) > 3500:
            preview += "..."
        msg = f"\U0001f4dc <b>Cover Letter — {title} at {company}</b>\n\n{preview}"

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("\u2705 Approve", callback_data=f"approve:{job_id}"),
            InlineKeyboardButton("\u274c Reject", callback_data=f"skip:{job_id}"),
        ],
        [InlineKeyboardButton("\u25c0\ufe0f Back to Details", callback_data=f"details:{job_id}")],
    ])
    await query.edit_message_text(msg, parse_mode="HTML", reply_markup=keyboard, disable_web_page_preview=True)


async def _handle_resume(query, job_id: str, job_data: dict) -> None:
    """Show the resume text or link."""
    title = job_data.get("title", "Unknown")
    resume_file = job_data.get("resume_file", "")
    resume_drive = job_data.get("resume_drive_link", "")

    # Try to read the resume text from disk
    resume_text = ""
    tmp_dir = os.path.normpath(os.path.join(BASE_DIR, ".tmp"))
    if resume_file:
        txt_path = resume_file
        if not os.path.isabs(txt_path):
            txt_path = os.path.join(tmp_dir, resume_file)
        # Try .txt version
        txt_fallback = txt_path.replace(".pdf", ".txt")
        for path in [txt_fallback, txt_path]:
            resolved = os.path.normpath(path)
            # Prevent path traversal outside .tmp/
            if not resolved.startswith(tmp_dir):
                continue
            if os.path.exists(resolved) and resolved.endswith(".txt"):
                try:
                    with open(resolved, "r", encoding="utf-8") as f:
                        resume_text = f.read()
                    break
                except Exception:
                    pass

    if resume_text:
        preview = resume_text[:3500] if len(resume_text) > 3500 else resume_text  # pyre-ignore[29]
        if len(resume_text) > 3500:
            preview += "..."
        msg = f"\U0001f4c4 <b>Tailored Resume — {title}</b>\n\n<pre>{preview}</pre>"
    elif resume_drive:
        msg = f'\U0001f4c4 <b>Tailored Resume — {title}</b>\n\nNo text preview available.\n<a href="{resume_drive}">Download PDF</a>'
    else:
        msg = f"\U0001f4c4 <b>Tailored Resume — {title}</b>\n\nNo resume generated yet."

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("\u2705 Approve", callback_data=f"approve:{job_id}"),
            InlineKeyboardButton("\u274c Reject", callback_data=f"skip:{job_id}"),
        ],
        [InlineKeyboardButton("\u25c0\ufe0f Back to Details", callback_data=f"details:{job_id}")],
    ])
    await query.edit_message_text(msg, parse_mode="HTML", reply_markup=keyboard, disable_web_page_preview=True)


async def _handle_back(query, job_id: str, job_data: dict) -> None:
    """Go back to the approval card summary."""
    msg = _build_approval_message(job_data)
    keyboard = _build_keyboard(job_id)
    await query.edit_message_text(msg, parse_mode="HTML", reply_markup=keyboard, disable_web_page_preview=False)


# ── Send approval card (called from run_daily.py) ───────────────────

def _build_viewer_message(job_data: dict) -> str:
    """Build a notification-only message (no approve/skip) for viewers."""
    title = _esc(job_data.get("title", "Unknown"))
    company = _esc(job_data.get("company", "Unknown"))
    location = _esc(job_data.get("location", ""))
    salary = _esc(job_data.get("salary", "Not listed"))
    remote = _esc(job_data.get("remote_status", "Unknown"))
    url = _esc(job_data.get("job_url", ""))
    score = job_data.get("score", 0)
    grade = _esc(job_data.get("grade", "N/A"))
    matched = job_data.get("matched_skills", [])
    missing = job_data.get("missing_skills", [])

    grade_emoji = {"A": "\u2b50", "B": "\U0001f7e2", "C": "\U0001f7e1", "D": "\U0001f7e0"}.get(job_data.get("grade", ""), "\U0001f534")
    matched_str = ", ".join(_esc(s) for s in matched[:8]) if matched else "None"
    missing_str = ", ".join(_esc(s) for s in missing[:5]) if missing else "None"

    return (
        f"{grade_emoji} <b>New Job Match</b>\n"
        f"\n"
        f"<b>{title}</b>\n"
        f"{company} \u2014 {location}\n"
        f"\n"
        f"\U0001f4bc <b>Remote:</b> {remote}\n"
        f"\U0001f4b0 <b>Salary:</b> {salary}\n"
        f"\U0001f3af <b>Score:</b> {score}/100 ({grade})\n"
        f"\n"
        f"\u2705 <b>Matched:</b> {matched_str}\n"
        f"\u274c <b>Missing:</b> {missing_str}\n"
        f"\n"
        f'<a href="{url}">\U0001f517 View Job on LinkedIn</a>'
    )


def send_approval_card(job_data: dict) -> bool:
    """Send approval card to admins (with buttons) and plain notification to viewers."""
    if not BOT_TOKEN or not get_all_chat_ids():
        alert("Telegram Bot", "BOT_TOKEN or CHAT_IDS not configured", "warning")
        return False

    job_id = job_data.get("job_id", "unknown")
    add_pending_job(job_data)

    import requests  # pyre-ignore[21]

    api_url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    success = True

    # Admins get the full approval card with Approve/Skip/Details buttons
    if ADMIN_CHAT_IDS:
        admin_message = _build_approval_message(job_data)
        keyboard = _build_keyboard(job_id)
        keyboard_json = {
            "inline_keyboard": [
                [{"text": btn.text, "callback_data": btn.callback_data} for btn in row]
                for row in keyboard.inline_keyboard
            ]
        }

        for chat_id in ADMIN_CHAT_IDS:
            try:
                resp = requests.post(api_url, json={
                    "chat_id": chat_id,
                    "text": admin_message,
                    "parse_mode": "HTML",
                    "reply_markup": keyboard_json,
                    "disable_web_page_preview": False,
                }, timeout=10)
                resp.raise_for_status()
            except Exception as e:
                alert("Telegram Error", f"Failed to send to admin {chat_id}: {e}", "error")
                success = False

    # Viewers get notification-only (no buttons)
    if VIEWER_CHAT_IDS:
        viewer_message = _build_viewer_message(job_data)

        for chat_id in VIEWER_CHAT_IDS:
            try:
                resp = requests.post(api_url, json={
                    "chat_id": chat_id,
                    "text": viewer_message,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": False,
                }, timeout=10)
                resp.raise_for_status()
            except Exception as e:
                alert("Telegram Error", f"Failed to send to viewer {chat_id}: {e}", "error")
                success = False

    return success


def send_early_alert(job_data: dict) -> bool:
    """Send a lightweight 'New Match Found' alert immediately after scoring.

    Only fires when score >= 50. Sends to all configured chat IDs.
    """
    job_score = job_data.get("score", 0)
    if job_score < 50:
        return False

    all_ids = get_all_chat_ids()
    if not BOT_TOKEN or not all_ids:
        alert("Telegram Bot", "BOT_TOKEN or CHAT_IDS not configured", "warning")
        return False

    import requests  # pyre-ignore[21]

    title = _esc(job_data.get("title", "Unknown"))
    company = _esc(job_data.get("company", "Unknown"))
    grade = _esc(job_data.get("grade", "N/A"))
    url = _esc(job_data.get("job_url", ""))

    message = (
        "\U0001f514 <b>New Match Found!</b>\n"
        f"{title} at {company}\n"
        f"Score: {job_score}/100 ({grade})\n"
        f'<a href="{url}">View Job</a>'
    )

    api_url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    success = True

    for chat_id in all_ids:
        try:
            resp = requests.post(api_url, json={
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            }, timeout=10)
            resp.raise_for_status()
        except Exception as e:
            alert("Telegram Error", f"Failed to send early alert to {chat_id}: {e}", "error")
            success = False

    return success


def send_job_notification(job_data: dict) -> bool:
    """Send a notification-only card (no buttons) to all chat IDs after auto-apply."""
    if not BOT_TOKEN or not get_all_chat_ids():
        alert("Telegram Bot", "BOT_TOKEN or CHAT_IDS not configured", "warning")
        return False

    import requests  # pyre-ignore[21]

    title = _esc(job_data.get("title", "Unknown"))
    company = _esc(job_data.get("company", "Unknown"))
    location = _esc(job_data.get("location", ""))
    salary = _esc(job_data.get("salary", "Not listed"))
    remote = _esc(job_data.get("remote_status", "Unknown"))
    url = _esc(job_data.get("job_url", ""))
    job_score = job_data.get("score", 0)
    grade = _esc(job_data.get("grade", "N/A"))
    matched = job_data.get("matched_skills", [])
    app_type = _esc(job_data.get("application_type", ""))
    apply_status = job_data.get("apply_status", "applied")
    resume_link = _esc(job_data.get("resume_drive_link", ""))
    cl_link = _esc(job_data.get("cover_letter_drive_link", ""))

    matched_str = ", ".join(_esc(s) for s in matched[:8]) if matched else "None"

    if apply_status == "applied":
        header = f"\u2705 <b>Applied \u2014 {title}</b>"
    elif apply_status == "failed":
        header = f"\u274c <b>Application Failed \u2014 {title}</b>"
    else:
        header = f"\U0001f4cb <b>External \u2014 {title}</b>"

    lines = [
        header,
        f"{company} \u2014 {location}",
        "",
        f"\U0001f3af Score: {job_score}/100 ({grade})",
        f"\U0001f4bc Type: {app_type} | Remote: {remote}",
        f"\U0001f4b0 Salary: {salary}",
        f"\u2705 Matched: {matched_str}",
    ]
    if resume_link:
        lines.append(f'\U0001f4c4 <a href="{resume_link}">Resume</a>')
    if cl_link:
        lines.append(f'\U0001f4dd <a href="{cl_link}">Cover Letter</a>')
    lines.append(f'\U0001f517 <a href="{url}">View Job</a>')

    message = "\n".join(lines)

    api_url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    success = True
    all_ids = ADMIN_CHAT_IDS

    for chat_id in all_ids:
        try:
            resp = requests.post(api_url, json={
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            }, timeout=10)
            resp.raise_for_status()
        except Exception as e:
            alert("Telegram Error", f"Failed to send notification to {chat_id}: {e}", "error")
            success = False

    return success


# ── Bot runner ──────────────────────────────────────────────────────

def run_bot() -> None:
    """Start the long-running Telegram bot."""
    global _bot_application, _bot_loop

    if not BOT_TOKEN:
        print("ERROR: TELEGRAM_BOT_TOKEN not set in .env")
        sys.exit(1)

    alert("Telegram Bot", "Starting LinkApply bot...")

    async def _post_init(application: Application) -> None:
        global _bot_loop
        _bot_loop = asyncio.get_running_loop()
        alert("Telegram Bot", "Bot event loop captured for scheduler bridge")

    app = Application.builder().token(BOT_TOKEN).post_init(_post_init).build()
    _bot_application = app

    # Register handlers
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("pending", pending_command))
    app.add_handler(CommandHandler("stats", stats_command))
    # Remote control commands
    app.add_handler(CommandHandler("run", run_command))
    app.add_handler(CommandHandler("run_test", run_test_command))
    app.add_handler(CommandHandler("stop", stop_command))
    app.add_handler(CommandHandler("status", status_command))
    app.add_handler(CommandHandler("logs", logs_command))
    app.add_handler(CommandHandler("shell", shell_command))
    app.add_handler(CommandHandler("claude", claude_command))
    app.add_handler(CallbackQueryHandler(callback_handler))
    # Text reply handler for interactive Q&A (must be after command handlers)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, text_reply_handler))

    alert("Telegram Bot", "Bot is now polling for updates...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    run_bot()
