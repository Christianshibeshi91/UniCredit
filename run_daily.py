"""Daily LinkedIn job discovery orchestrator.

Usage:
    python run_daily.py               # Use MAX_APPLICATIONS_PER_DAY from .env
    python run_daily.py --max-jobs 3  # Process up to 3 jobs
"""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
import random
import sys
import time
from datetime import date
from dotenv import load_dotenv  # pyre-ignore[21]

BASE_DIR = os.path.dirname(__file__)
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Add project root to path for imports
sys.path.insert(0, BASE_DIR)

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.search_linkedin_jobs import search  # pyre-ignore[21]
from LinkedinAutomation.search_aggregator import aggregate_jobs  # pyre-ignore[21]
from LinkedinAutomation.deduplicate_jobs import deduplicate  # pyre-ignore[21]
from LinkedinAutomation.extract_job_intelligence import extract  # pyre-ignore[21]
from LinkedinAutomation.score_job import score  # pyre-ignore[21]
from LinkedinAutomation.tailor_resume import tailor  # pyre-ignore[21]
from LinkedinAutomation.generate_cover_letter import generate  # pyre-ignore[21]
from LinkedinAutomation.find_connections import find  # pyre-ignore[21]
from LinkedinAutomation.log_to_sheets import log_job  # pyre-ignore[21]
from LinkedinAutomation.apply_easy_apply import apply as easy_apply  # pyre-ignore[21]
from LinkedinAutomation.apply_external_form import apply_external  # pyre-ignore[21]
from LinkedinAutomation.mark_job_seen import mark_seen  # pyre-ignore[21]
from LinkedinAutomation.telegram_bot import send_job_notification  # pyre-ignore[21]
from LinkedinAutomation.log_to_sheets import update_job_status  # pyre-ignore[21]
from LinkedinAutomation.generate_daily_report import send_daily_report  # pyre-ignore[21]
from LinkedinAutomation.follow_up_tracker import check_follow_ups  # pyre-ignore[21]
from LinkedinAutomation.interview_prep import check_interview_statuses  # pyre-ignore[21]
from LinkedinAutomation.anti_detect import get_human_delay  # pyre-ignore[21]
from LinkedinAutomation.upload_to_drive import upload_file as drive_upload  # pyre-ignore[21]
from LinkedinAutomation.generate_pdf import generate_resume_pdf, generate_cover_letter_pdf  # pyre-ignore[21]

RUN_STATE_PATH = os.path.join(BASE_DIR, ".tmp", "run_state.json")
PROFILE_PATH = os.path.join(BASE_DIR, "candidate", "profile.json")

# Companies to never apply to (case-insensitive match)
BLOCKED_COMPANIES = [
    "tsc", "ima financial", "quisitive", "planet technology",
]


def _load_run_state():
    """Load run state or return a fresh default."""
    if os.path.exists(RUN_STATE_PATH):
        with open(RUN_STATE_PATH, "r") as f:
            return json.load(f)
    return {"run_date": "", "applications_today": 0, "jobs_processed": [], "errors": []}


def _save_run_state(state):
    os.makedirs(os.path.dirname(RUN_STATE_PATH), exist_ok=True)
    with open(RUN_STATE_PATH, "w") as f:
        json.dump(state, f, indent=2)


def _load_profile():
    with open(PROFILE_PATH, "r") as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(description="Daily LinkedIn job discovery")
    parser.add_argument(
        "--max-jobs", type=int,
        default=int(os.getenv("MAX_APPLICATIONS_PER_DAY", "15")),
        help="Maximum jobs to process this run",
    )
    args = parser.parse_args()

    alert("Daily Run", f"Starting job discovery (max {args.max_jobs} jobs)")

    # Reset state if new day
    state = _load_run_state()
    today = date.today().isoformat()
    if state.get("run_date") != today:
        state = {"run_date": today, "applications_today": 0, "jobs_processed": [], "errors": []}
        _save_run_state(state)

    profile = _load_profile()
    min_score = int(os.getenv("MIN_SCORE_THRESHOLD", "70"))

    # Step 1: Search all platforms (LinkedIn + Indeed + Glassdoor)
    alert("Step 1", "Searching all platforms for jobs...")
    try:
        raw_jobs = aggregate_jobs(max_jobs=args.max_jobs * 2)
    except Exception as e:
        alert("Search Failed", str(e), "error")
        errors = state.get("errors", [])  # pyre-ignore[29]
        errors.append("job_search_failed")
        state["errors"] = errors  # pyre-ignore[29]
        _save_run_state(state)
        return

    if not raw_jobs:
        alert("No Jobs", "No jobs found in this search run.")
        _save_run_state(state)
        return

    # Step 2: Deduplicate
    alert("Step 2", "Deduplicating against previously seen jobs...")
    new_jobs = deduplicate(raw_jobs)
    alert("Dedup", f"{len(raw_jobs)} found, {len(new_jobs)} new")

    if not new_jobs:
        alert("No New Jobs", "All discovered jobs were previously seen.")
        _save_run_state(state)
        return

    # Step 3: Process each job
    processed = 0
    jobs_processed_list = state.get("jobs_processed", [])  # pyre-ignore[29]
    errors_list = state.get("errors", [])  # pyre-ignore[29]

    for i, job in enumerate(new_jobs):
        if processed >= args.max_jobs:
            break

        # Random 10% skip to vary application pattern
        if random.random() < 0.10:
            alert("Random Skip", f"Skipping job {i+1} to vary pattern")
            continue

        job_id = job.get("job_id", f"job-{i}")
        title = job.get("title", "Unknown")
        company = job.get("company", "Unknown")

        # Skip blocked companies
        if any(blocked.lower() in company.lower() for blocked in BLOCKED_COMPANIES):
            alert("Blocked", f"Skipping {company} (blocked company)")
            mark_seen(job.get("job_url", ""))
            continue

        alert("Processing", f"[{i+1}/{len(new_jobs)}] {title} at {company}")

        try:
            # 3a: Extract intelligence
            intel = extract(job)
            job["salary"] = job.get("salary") or intel["salary"]
            job["remote_status"] = intel["remote_status"]
            job["required_skills"] = intel["required_skills"]

            # 3b: Score with Claude
            alert("Scoring", f"Scoring {title}...")
            score_result = score(job, profile)
            job_score = score_result.get("score", 0)
            grade = score_result.get("grade", "F")
            alert("Score", f"{title}: {job_score}/100 ({grade})")

            if score_result.get("should_reject", False) or job_score < min_score:
                alert("Rejected", f"{title} scored {job_score} (below {min_score}). Skipping.")
                mark_seen(job["job_url"])
                continue

            # 3c/3d/3f: Run resume, cover letter, and connections IN PARALLEL
            alert("Parallel", f"Generating resume + cover letter + connections for {title}...")
            resume_file = os.path.join(BASE_DIR, ".tmp", f"resume_{job_id}.txt")
            cl_file = os.path.join(BASE_DIR, ".tmp", f"cl_{job_id}.txt")

            with ThreadPoolExecutor(max_workers=3) as pool:
                fut_resume = pool.submit(tailor, job, score_result, profile)
                fut_cl = pool.submit(generate, job, score_result, profile)
                fut_conn = pool.submit(find, company, title)  # pyre-ignore[29]
                resume_text = fut_resume.result()
                cl_text = fut_cl.result()
                try:
                    conn = fut_conn.result()
                except Exception:
                    conn = {"connection_name": "Manual Lookup Required", "manual_search_url": ""}

            # 3e: Generate PDFs IN PARALLEL
            alert("PDF", "Generating professional PDFs...")
            resume_pdf_path = os.path.join(BASE_DIR, ".tmp", f"resume_{job_id}.pdf")
            cl_pdf_path = os.path.join(BASE_DIR, ".tmp", f"cl_{job_id}.pdf")

            with ThreadPoolExecutor(max_workers=2) as pool:
                fut_rpdf = pool.submit(generate_resume_pdf, resume_text, resume_pdf_path)  # pyre-ignore[29]
                fut_cpdf = pool.submit(generate_cover_letter_pdf, cl_text, cl_pdf_path, title, company)  # pyre-ignore[29]
                try:
                    fut_rpdf.result()
                    resume_pdf = resume_pdf_path
                except Exception as e:
                    alert("PDF", f"Resume PDF failed ({e}), using txt", "warning")
                    resume_pdf = resume_file
                try:
                    fut_cpdf.result()
                    cl_pdf = cl_pdf_path
                except Exception as e:
                    alert("PDF", f"Cover letter PDF failed ({e}), using txt", "warning")
                    cl_pdf = cl_file

            # 3g: Upload PDFs to Google Drive IN PARALLEL
            alert("Upload", "Uploading PDFs to Drive...")
            safe_name = f"{company}_{title}".replace(" ", "_")

            with ThreadPoolExecutor(max_workers=2) as pool:
                fut_rdrive = pool.submit(drive_upload, resume_pdf, f"Resume_{safe_name}.pdf")
                fut_cdrive = pool.submit(drive_upload, cl_pdf, f"CoverLetter_{safe_name}.pdf")
                resume_drive_link = fut_rdrive.result()
                cl_drive_link = fut_cdrive.result()

            # 3h: Auto-apply for Easy Apply jobs
            app_type = "Easy Apply" if job.get("is_easy_apply") else "External"
            apply_status = "external"
            applied_str = "No"

            if job.get("is_easy_apply"):
                alert("Auto Apply", f"Attempting Easy Apply for {title}...")
                try:
                    result = easy_apply(job, resume_pdf, cl_text)
                    if result:
                        apply_status = "applied"
                        applied_str = "Yes"
                        alert("Applied", f"Successfully applied to {title} at {company}")
                    else:
                        apply_status = "failed"
                        applied_str = "No"
                        alert("Apply Failed", f"Easy Apply returned False for {title}", "warning")
                except Exception as e:
                    apply_status = "failed"
                    applied_str = "No"
                    alert("Apply Error", f"Easy Apply failed for {title}: {e}", "warning")
            else:
                # External application — auto-fill ATS forms
                alert("External Apply", f"Attempting external application for {title}...")
                try:
                    result = apply_external(job, resume_pdf)
                    if result:
                        apply_status = "applied"
                        applied_str = "Yes"
                        alert("Applied", f"External application submitted for {title} at {company}")
                    else:
                        apply_status = "failed"
                        applied_str = "No"
                        alert("External Failed", f"External apply returned False for {title}", "warning")
                except Exception as e:
                    apply_status = "failed"
                    applied_str = "No"
                    alert("External Error", f"External apply failed for {title}: {e}", "warning")

            # 3i: Log to Google Sheets
            alert("Logging", "Writing to Google Sheets...")
            status_map = {"applied": "Applied", "failed": "Application Failed", "external": "Ready to Apply"}
            log_data = {
                "title": title,
                "company": company,
                "location": job.get("location", ""),
                "remote_status": job.get("remote_status", ""),
                "salary": job.get("salary", ""),
                "job_url": job.get("job_url", ""),
                "description": job.get("description", ""),
                "score": job_score,
                "grade": grade,
                "matched_skills": score_result.get("matched_skills", []),
                "missing_skills": score_result.get("missing_skills", []),
                "leadership_opportunity_level": score_result.get("leadership_opportunity_level", ""),
                "enterprise_relevance_score": score_result.get("enterprise_relevance_score", ""),
                "connections_summary": conn.get("connection_name", ""),
                "best_contact": conn.get("connection_title", ""),
                "resume_file": f"resume_{job_id}.txt",
                "cover_letter_file": f"cl_{job_id}.txt",
                "resume_drive_link": resume_drive_link,
                "cover_letter_drive_link": cl_drive_link,
                "application_type": app_type,
                "application_status": status_map[apply_status],
                "applied": applied_str,
            }
            sheet_row = -1
            try:
                sheet_row = log_job(log_data)
            except Exception as e:
                alert("Sheets Error", str(e), "warning")

            # 3j: Send Telegram notification (no buttons, just info)
            alert("Telegram", f"Sending notification for {title}...")
            notification_data = {
                "job_id": job_id,
                "title": title,
                "company": company,
                "location": job.get("location", ""),
                "remote_status": job.get("remote_status", ""),
                "salary": job.get("salary", ""),
                "job_url": job.get("job_url", ""),
                "score": job_score,
                "grade": grade,
                "matched_skills": score_result.get("matched_skills", []),
                "application_type": app_type,
                "apply_status": apply_status,
                "resume_drive_link": resume_drive_link,
                "cover_letter_drive_link": cl_drive_link,
            }
            try:
                send_job_notification(notification_data)
            except Exception as e:
                alert("Telegram Error", f"Could not send notification: {e}", "warning")

            # 3k: Mark as seen
            mark_seen(job["job_url"])
            processed += 1
            jobs_processed_list.append(job_id)  # pyre-ignore[29]

            # Human-like delay between job applications
            if processed < args.max_jobs:
                delay = get_human_delay("between_jobs")
                alert("Waiting", f"Pausing {delay:.0f}s between applications...")
                time.sleep(delay)

        except Exception as e:
            alert("Job Error", f"Failed to process {title}: {e}", "error")
            errors_list.append(f"process_failed:{job_id}")  # pyre-ignore[29]
            mark_seen(job.get("job_url", ""))

    # Save final state
    state["applications_today"] = processed  # pyre-ignore[29]
    state["jobs_processed"] = jobs_processed_list  # pyre-ignore[29]
    state["errors"] = errors_list  # pyre-ignore[29]
    _save_run_state(state)

    alert("Daily Run Complete", f"Processed {processed} jobs out of {len(new_jobs)} new discoveries")

    # Step 4: Check for follow-up reminders
    alert("Step 4", "Checking for follow-up reminders...")
    try:
        check_follow_ups()
    except Exception as e:
        alert("Follow-Up Error", str(e), "warning")

    # Step 5: Check for interview prep needs
    alert("Step 5", "Checking for interview prep needs...")
    try:
        check_interview_statuses()
    except Exception as e:
        alert("Interview Prep Error", str(e), "warning")

    # Step 6: Send daily analytics report
    alert("Step 6", "Sending daily analytics report...")
    try:
        send_daily_report()
    except Exception as e:
        alert("Report Error", str(e), "warning")


if __name__ == "__main__":
    main()
