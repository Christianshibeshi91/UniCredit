"""End-to-end test: tailor resume, generate cover letter, log to Sheets, send Telegram card."""

import os
import sys

BASE_DIR = os.path.dirname(__file__)
sys.path.insert(0, BASE_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, ".env"))

from LinkedinAutomation.alert_user import alert
from LinkedinAutomation.score_job import score
from LinkedinAutomation.tailor_resume import tailor
from LinkedinAutomation.generate_cover_letter import generate
from LinkedinAutomation.log_to_sheets import log_job
from LinkedinAutomation.telegram_bot import send_approval_card
from LinkedinAutomation.generate_pdf import generate_resume_pdf, generate_cover_letter_pdf
from LinkedinAutomation.upload_to_drive import upload_file as drive_upload

PROFILE_PATH = os.path.join(BASE_DIR, "candidate", "profile.json")

import json
with open(PROFILE_PATH, "r") as f:
    profile = json.load(f)

# Realistic test job
import time as _time
_test_id = f"test-e2e-{int(_time.time())}"

test_job = {
    "job_id": _test_id,
    "title": "Senior Power Platform Engineer",
    "company": "Microsoft",
    "location": "Redmond, WA (Hybrid)",
    "remote_status": "Hybrid",
    "salary": "$160,000 - $190,000",
    "job_url": f"https://www.linkedin.com/jobs/view/{_test_id}",
    "is_easy_apply": True,
    "description": """We are looking for a Senior Power Platform Engineer to join our Business Applications team.

Responsibilities:
- Design and implement enterprise Power Platform solutions including Canvas Apps, Model-Driven Apps, and Power Automate flows
- Architect Dataverse data models for complex business workflows
- Build and maintain CI/CD pipelines using Azure DevOps for Power Platform solution deployment
- Develop custom connectors and REST API integrations
- Lead Power BI dashboard development for executive reporting
- Collaborate with cross-functional teams to gather requirements and deliver solutions
- Ensure solutions meet GRC (Governance, Risk, and Compliance) standards
- Mentor junior developers and conduct code reviews

Requirements:
- 7+ years of experience with Microsoft Power Platform
- Strong expertise in Power Apps (Canvas and Model-Driven), Power Automate, and Power BI
- Deep knowledge of Dataverse, Dynamics 365 CE, and SharePoint Online
- Experience with Azure services (Logic Apps, API Management, Azure DevOps)
- Proven track record of enterprise-scale solution architecture
- Experience with CI/CD pipelines for Power Platform
- Understanding of GRC frameworks in regulated industries
- Bachelor's degree in Computer Science or related field

Nice to have:
- Microsoft Certified: Power Platform Developer Associate (PL-200)
- Experience in financial services or banking
- Familiarity with Power Pages and SPFx development
""",
}

alert("TEST", "=" * 50)
alert("TEST", "Starting end-to-end test pipeline")
alert("TEST", "=" * 50)

# Step 1: Score the job
alert("TEST", "Step 1: Scoring job with Claude...")
score_result = score(test_job, profile)
job_score = score_result.get("score", 0)
grade = score_result.get("grade", "?")
alert("TEST", f"Score: {job_score}/100 ({grade})")
alert("TEST", f"Matched: {', '.join(score_result.get('matched_skills', []))}")
alert("TEST", f"Missing: {', '.join(score_result.get('missing_skills', []))}")

# Step 2: Tailor resume
alert("TEST", "Step 2: Tailoring resume (ATS-optimized format)...")
resume_text = tailor(test_job, score_result, profile)
alert("TEST", f"Resume length: {len(resume_text)} chars")
alert("TEST", f"Resume preview:\n{resume_text[:300]}...")

# Step 3: Generate cover letter
alert("TEST", "Step 3: Generating cover letter...")
cl_text = generate(test_job, score_result, profile)
alert("TEST", f"Cover letter length: {len(cl_text)} chars")
alert("TEST", f"Cover letter preview:\n{cl_text[:300]}...")

# Step 4: Generate PDFs
alert("TEST", "Step 4: Generating PDFs...")
os.makedirs(os.path.join(BASE_DIR, ".tmp"), exist_ok=True)
resume_pdf = os.path.join(BASE_DIR, ".tmp", "resume_test-e2e-001.pdf")
cl_pdf = os.path.join(BASE_DIR, ".tmp", "cl_test-e2e-001.pdf")
try:
    generate_resume_pdf(resume_text, resume_pdf)
    alert("TEST", f"Resume PDF: {resume_pdf}")
except Exception as e:
    alert("TEST", f"Resume PDF failed: {e}", "warning")
    resume_pdf = os.path.join(BASE_DIR, ".tmp", "resume_test-e2e-001.txt")

try:
    generate_cover_letter_pdf(cl_text, cl_pdf, test_job["title"], test_job["company"])
    alert("TEST", f"Cover letter PDF: {cl_pdf}")
except Exception as e:
    alert("TEST", f"Cover letter PDF failed: {e}", "warning")
    cl_pdf = os.path.join(BASE_DIR, ".tmp", "cl_test-e2e-001.txt")

# Step 5: Upload to Drive
alert("TEST", "Step 5: Uploading PDFs to Drive...")
resume_drive_link = drive_upload(resume_pdf, "Resume_Microsoft_Senior_Power_Platform_Engineer_TEST.pdf")
cl_drive_link = drive_upload(cl_pdf, "CoverLetter_Microsoft_Senior_Power_Platform_Engineer_TEST.pdf")
alert("TEST", f"Resume Drive link: {resume_drive_link}")
alert("TEST", f"Cover letter Drive link: {cl_drive_link}")

# Step 6: Log to Google Sheets
alert("TEST", "Step 6: Logging to Google Sheets...")
log_data = {
    "title": test_job["title"],
    "company": test_job["company"],
    "location": test_job["location"],
    "remote_status": test_job["remote_status"],
    "salary": test_job["salary"],
    "job_url": test_job["job_url"],
    "description": test_job["description"],
    "score": job_score,
    "grade": grade,
    "matched_skills": score_result.get("matched_skills", []),
    "missing_skills": score_result.get("missing_skills", []),
    "leadership_opportunity_level": score_result.get("leadership_opportunity_level", ""),
    "enterprise_relevance_score": score_result.get("enterprise_relevance_score", ""),
    "connections_summary": "TEST - No real connection lookup",
    "best_contact": "TEST",
    "resume_file": "resume_test-e2e-001.txt",
    "cover_letter_file": "cl_test-e2e-001.txt",
    "resume_drive_link": resume_drive_link,
    "cover_letter_drive_link": cl_drive_link,
    "application_type": "Easy Apply",
    "application_status": "TEST - Pending Approval",
    "applied": "No, TEST Job",
}
sheet_row = log_job(log_data)
alert("TEST", f"Logged to Google Sheet row: {sheet_row}")

# Step 7: Send Telegram approval card
alert("TEST", "Step 7: Sending Telegram approval card...")
approval_data = {
    "job_id": "test-e2e-001",
    "title": test_job["title"],
    "company": test_job["company"],
    "location": test_job["location"],
    "remote_status": test_job["remote_status"],
    "salary": test_job["salary"],
    "job_url": test_job["job_url"],
    "description": test_job["description"],
    "score": job_score,
    "grade": grade,
    "matched_skills": score_result.get("matched_skills", []),
    "missing_skills": score_result.get("missing_skills", []),
    "application_type": "Easy Apply",
    "connections_summary": "TEST - No real connection lookup",
    "best_contact": "TEST",
    "outreach_message": "",
    "resume_file": resume_pdf,
    "cover_letter_text": cl_text,
    "sheet_row": sheet_row,
}
telegram_ok = send_approval_card(approval_data)
alert("TEST", f"Telegram sent: {telegram_ok}")

alert("TEST", "=" * 50)
alert("TEST", "End-to-end test COMPLETE!")
alert("TEST", f"  Score: {job_score}/100 ({grade})")
alert("TEST", f"  Sheet row: {sheet_row}")
alert("TEST", f"  Telegram: {'OK' if telegram_ok else 'FAILED'}")
alert("TEST", "=" * 50)
