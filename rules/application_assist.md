---
goal: Assist Christian through LinkedIn Easy Apply or External application, with mandatory human confirmation gate
inputs:
  - job object (title, company, url, is_easy_apply)
  - tailored_resume_text
  - cover_letter_text
outputs:
  - application_status: "Pending Review" | "Submitted" | "External - Action Required"
scripts:
  - implementation/apply_easy_apply.py
  - implementation/apply_external.py
  - implementation/alert_user.py
---

# Rule: Application Assist

## Goal
Assist Christian in submitting job applications. For Easy Apply: autofill and stage the application, then STOP and notify. For External: extract the URL, log it, and notify. Never submit without human confirmation.

## Mode A: Assisted Easy Apply

### Step 1: Navigate to Job
- Open LinkedIn job URL in Playwright browser (headful mode — visible to user)
- Verify "Easy Apply" button is present
- Click "Easy Apply"

### Step 2: Autofill Known Data
Fill in any form fields using candidate profile data:
- First Name: Christian
- Last Name: Shibeshi
- Email: christianshibeshi@outlook.com
- Phone: (leave for user to fill)
- Location: Seattle, WA
- Resume: Upload file from `.tmp/resume_tailored_{job_id}.docx` (if generated) or `.tmp/resume_tailored_{job_id}.txt`
- Cover Letter text box: paste `cover_letter_text`
- LinkedIn Profile URL: auto-detect from session

### Step 3: STOP Gate (MANDATORY)
**DO NOT click the final "Submit Application" button.**

At the final review page:
1. Take a screenshot: `.tmp/screenshots/easy_apply_{job_id}.png`
2. Log status as "Pending Review" in sheet
3. Call `alert_user.py waiting`
4. Print to console:
   ```
   ⚠️  HUMAN REVIEW REQUIRED
   Job: {title} at {company}
   Browser is open and staged for submission.
   Review the form, then MANUALLY click Submit.
   Press ENTER here when done to log as Submitted.
   ```
5. Wait for user input (ENTER key)
6. After ENTER: update sheet status to "Submitted", log timestamp

### Randomized Delays
- Between page loads: random 3–7 seconds
- Between form field fills: random 0.5–2 seconds
- Before clicking any button: random 1–3 seconds

### Daily Cap Enforcement
- Track submissions in `.tmp/run_state.json → applications_today`
- If count ≥ `MAX_APPLICATIONS_PER_DAY`: stop, alert user, exit

## Mode B: External Apply

### Step 1: Extract External URL
- Navigate to LinkedIn job URL
- Look for "Apply" button that redirects to an external site
- Extract and validate the external URL
- If URL not found: log "External URL not found", skip

### Step 2: Log to Sheet
- Update Application Type to "External"
- Update Application Status to "External - Action Required"
- Log external URL in Job URL column (overwrite LinkedIn URL)

### Step 3: Notify User
- Call `alert_user.py waiting`
- Print to console:
  ```
  📋 EXTERNAL APPLICATION REQUIRED
  Job: {title} at {company}
  Apply here: {external_url}
  Logged to Google Sheet row {row_number}
  ```

## Safety Controls
| Control | Rule |
|---|---|
| Daily cap | Max `MAX_APPLICATIONS_PER_DAY` per day |
| Human gate | ALWAYS required before Easy Apply submission |
| Duplicates | Never apply to the same job twice |
| Min score | Only apply to jobs with score ≥ 70 |
| Delays | Randomized — never robotic constant timing |

## Version History
- v1: Playwright Easy Apply staging + External URL extraction
