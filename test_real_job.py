"""End-to-end test with a real LinkedIn job URL."""

import os
import sys
import json
import re
import html as html_mod

import requests

BASE_DIR = os.path.dirname(__file__)
sys.path.insert(0, BASE_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, ".env"))

from LinkedinAutomation.alert_user import alert
from LinkedinAutomation.anti_detect import get_random_ua
from LinkedinAutomation.score_job import score
from LinkedinAutomation.tailor_resume import tailor
from LinkedinAutomation.generate_cover_letter import generate
from LinkedinAutomation.log_to_sheets import log_job
from LinkedinAutomation.telegram_bot import send_job_notification
from LinkedinAutomation.generate_pdf import generate_resume_pdf, generate_cover_letter_pdf
from LinkedinAutomation.upload_to_drive import upload_file as drive_upload

PROFILE_PATH = os.path.join(BASE_DIR, "candidate", "profile.json")
with open(PROFILE_PATH, "r") as f:
    profile = json.load(f)

# ── Step 0: Scrape the real LinkedIn job ──────────────────────────
JOB_ID = "4381112986"
JOB_URL = f"https://www.linkedin.com/jobs/view/{JOB_ID}"

alert("TEST", "=" * 50)
alert("TEST", f"Scraping real LinkedIn job: {JOB_URL}")

job = {
    "job_id": JOB_ID,
    "title": "",
    "company": "",
    "location": "",
    "remote_status": "",
    "salary": "",
    "job_url": JOB_URL,
    "description": "",
    "is_easy_apply": False,
    "source": "linkedin",
}

r = requests.get(JOB_URL, headers={"User-Agent": get_random_ua()}, timeout=15)
if r.status_code == 200:
    text = r.text

    # Title
    title_m = re.search(r'<h1[^>]*>([^<]+)</h1>', text)
    if title_m:
        job["title"] = html_mod.unescape(title_m.group(1).strip())

    # Company
    comp_m = re.search(r'"companyName":"([^"]+)"', text)
    if not comp_m:
        comp_m = re.search(r'topcard__org-name-link[^>]*>([^<]+)<', text)
    if comp_m:
        job["company"] = html_mod.unescape(comp_m.group(1).strip())

    # Location
    loc_m = re.search(r'topcard__flavor--bullet[^>]*>([^<]+)<', text)
    if loc_m:
        job["location"] = html_mod.unescape(loc_m.group(1).strip())

    # Description
    desc_m = re.search(r'description__text[^>]*>(.*?)</div>', text, re.DOTALL)
    if desc_m:
        desc_clean = re.sub(r'<[^>]+>', ' ', desc_m.group(1)).strip()
        desc_clean = re.sub(r'\s+', ' ', desc_clean)
        job["description"] = desc_clean[:5000]

    # Easy Apply
    if "Easy Apply" in text or "easy-apply" in text.lower():
        job["is_easy_apply"] = True

    # Salary
    salary_m = re.search(
        r'\$[\d,]+(?:\.\d+)?\s*[-/\u2013\u2014]\s*\$[\d,]+(?:\.\d+)?(?:\s*/\s*yr)?',
        text,
    )
    if salary_m:
        job["salary"] = html_mod.unescape(salary_m.group(0).strip())

    # Remote status
    if "remote" in text.lower():
        if "hybrid" in text.lower():
            job["remote_status"] = "Hybrid"
        else:
            job["remote_status"] = "Remote"
    elif "on-site" in text.lower() or "onsite" in text.lower():
        job["remote_status"] = "Onsite"
else:
    alert("TEST", f"HTTP {r.status_code} — could not scrape job page", "error")
    sys.exit(1)

alert("TEST", f"Title: {job['title']}")
alert("TEST", f"Company: {job['company']}")
alert("TEST", f"Location: {job['location']}")
alert("TEST", f"Salary: {job['salary']}")
alert("TEST", f"Easy Apply: {job['is_easy_apply']}")
alert("TEST", f"Description: {job['description'][:200]}...")

if not job["title"]:
    alert("TEST", "Could not parse job title — aborting", "error")
    sys.exit(1)

# ── Step 1: Score ─────────────────────────────────────────────────
alert("TEST", "Step 1: Scoring job...")
score_result = score(job, profile)
job_score = score_result.get("score", 0)
grade = score_result.get("grade", "?")
alert("TEST", f"Score: {job_score}/100 ({grade})")
alert("TEST", f"Matched: {', '.join(score_result.get('matched_skills', []))}")
alert("TEST", f"Missing: {', '.join(score_result.get('missing_skills', []))}")

# ── Step 2: Tailor resume ────────────────────────────────────────
alert("TEST", "Step 2: Tailoring resume...")
resume_text = tailor(job, score_result, profile)
alert("TEST", f"Resume length: {len(resume_text)} chars")

# ── Step 3: Cover letter ─────────────────────────────────────────
alert("TEST", "Step 3: Generating cover letter...")
cl_text = generate(job, score_result, profile)
alert("TEST", f"Cover letter length: {len(cl_text)} chars")

# ── Step 4: PDFs ─────────────────────────────────────────────────
alert("TEST", "Step 4: Generating PDFs...")
os.makedirs(os.path.join(BASE_DIR, ".tmp"), exist_ok=True)
resume_pdf = os.path.join(BASE_DIR, ".tmp", f"resume_{JOB_ID}.pdf")
cl_pdf = os.path.join(BASE_DIR, ".tmp", f"cl_{JOB_ID}.pdf")
try:
    generate_resume_pdf(resume_text, resume_pdf)
    alert("TEST", f"Resume PDF: {resume_pdf}")
except Exception as e:
    alert("TEST", f"Resume PDF failed: {e}", "warning")
    resume_pdf = os.path.join(BASE_DIR, ".tmp", f"resume_{JOB_ID}.txt")

try:
    generate_cover_letter_pdf(cl_text, cl_pdf, job["title"], job["company"])
    alert("TEST", f"Cover letter PDF: {cl_pdf}")
except Exception as e:
    alert("TEST", f"Cover letter PDF failed: {e}", "warning")
    cl_pdf = os.path.join(BASE_DIR, ".tmp", f"cl_{JOB_ID}.txt")

# ── Step 5: Upload to Drive ──────────────────────────────────────
alert("TEST", "Step 5: Uploading to Drive...")
safe_title = re.sub(r'[^a-zA-Z0-9]+', '_', job["title"])[:50]
safe_company = re.sub(r'[^a-zA-Z0-9]+', '_', job["company"])[:30]
resume_drive_link = drive_upload(resume_pdf, f"Resume_{safe_company}_{safe_title}.pdf")
cl_drive_link = drive_upload(cl_pdf, f"CoverLetter_{safe_company}_{safe_title}.pdf")
alert("TEST", f"Resume Drive: {resume_drive_link}")
alert("TEST", f"CL Drive: {cl_drive_link}")

# ── Step 6: Log to Google Sheets ─────────────────────────────────
alert("TEST", "Step 6: Logging to Google Sheets...")
log_data = {
    "title": job["title"],
    "company": job["company"],
    "location": job["location"],
    "remote_status": job["remote_status"],
    "salary": job["salary"],
    "job_url": job["job_url"],
    "description": job["description"],
    "score": job_score,
    "grade": grade,
    "matched_skills": score_result.get("matched_skills", []),
    "missing_skills": score_result.get("missing_skills", []),
    "leadership_opportunity_level": score_result.get("leadership_opportunity_level", ""),
    "enterprise_relevance_score": score_result.get("enterprise_relevance_score", ""),
    "connections_summary": "",
    "best_contact": "",
    "resume_file": os.path.basename(resume_pdf),
    "cover_letter_file": os.path.basename(cl_pdf),
    "resume_drive_link": resume_drive_link,
    "cover_letter_drive_link": cl_drive_link,
    "application_type": "Easy Apply" if job["is_easy_apply"] else "External",
    "application_status": "Pending Review",
    "applied": "No",
}
sheet_row = log_job(log_data)
alert("TEST", f"Logged to row: {sheet_row}")

# ── Step 7: Send Telegram notification ────────────────────────────
alert("TEST", "Step 7: Sending Telegram notification...")
notification_data = {
    "job_id": JOB_ID,
    "title": job["title"],
    "company": job["company"],
    "location": job["location"],
    "remote_status": job["remote_status"],
    "salary": job["salary"],
    "job_url": job["job_url"],
    "score": job_score,
    "grade": grade,
    "matched_skills": score_result.get("matched_skills", []),
    "application_type": "Easy Apply" if job["is_easy_apply"] else "External",
    "apply_status": "external",
    "resume_drive_link": resume_drive_link,
    "cover_letter_drive_link": cl_drive_link,
}
telegram_ok = send_job_notification(notification_data)
alert("TEST", f"Telegram sent: {telegram_ok}")

# ── Summary ──────────────────────────────────────────────────────
alert("TEST", "=" * 50)
alert("TEST", "END-TO-END TEST COMPLETE!")
alert("TEST", f"  Job: {job['title']} at {job['company']}")
alert("TEST", f"  Score: {job_score}/100 ({grade})")
alert("TEST", f"  Sheet row: {sheet_row}")
alert("TEST", f"  Telegram: {'OK' if telegram_ok else 'FAILED'}")
alert("TEST", "=" * 50)
