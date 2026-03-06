---
goal: Generate ATS-optimized tailored resume versions for each high-fit job
inputs:
  - job description text
  - candidate/profile.json
  - score_output from score_job.py
outputs:
  - tailored_resume_text: full resume as plain text string
scripts:
  - implementation/tailor_resume.py
---

# Rule: Resume Tailoring

## Goal
Produce a tailored version of Christian's resume for each A/B-grade job. Mirror the job description's language and keyword density while preserving complete factual accuracy. Never fabricate experience or skills.

## Tailoring Rules (MANDATORY)

### 1. Summary Rewrite
- Rewrite the professional summary to mirror the JD's exact language
- Use the job's title as Christian's current-seeking title
- Reference the company's industry if identifiable
- Keep to 4–5 sentences maximum

### 2. Skills Reordering
- Move matched skills to the top of the skills section
- List matched skills using the JD's exact terminology (e.g., if JD says "Canvas Apps", use that — not "Canvas Applications")

### 3. Experience Bullet Reordering
- For each role in experience, reorder bullets so the most JD-relevant bullet appears first
- Keep all bullets factual — only reorder, never rewrite content beyond keyword mirroring

### 4. Elevate These Always
The following must always appear prominently in the tailored resume:
- Enterprise architecture experience
- GRC / compliance environment work
- CI/CD via Azure DevOps
- API and Azure integrations
- Dataverse design

### 5. ATS Keyword Density
- Include at least 80% of keywords from `candidate/profile.json → keywords_for_ats`
- Also include top keywords extracted from the JD by the scoring step
- Do NOT keyword-stuff — integrate naturally

### 6. Factual Integrity (CRITICAL)
- NEVER add skills, tools, or technologies not listed in `candidate/profile.json`
- NEVER change company names, dates, or titles
- NEVER inflate years of experience
- If a JD requires a hard skill not in the profile, list it only in "Missing Skills" — do not add it to the resume

## Tone and Voice
- Executive and strategic
- First-person implied (no "I" — standard resume style)
- Action-verb led bullets (Architected, Designed, Built, Delivered, Led, Owned)

## Resume Structure
```
[Full Name]
[Title] | Seattle, WA (Remote)
[Email] | [LinkedIn]

PROFESSIONAL SUMMARY
[Tailored 4–5 sentence summary]

CORE COMPETENCIES
[2-column skill grid, matched skills first]

PROFESSIONAL EXPERIENCE
[4 roles with reordered bullets]

CERTIFICATIONS
[3 Microsoft certifications]

EDUCATION
[Degree]
```

## Output Format
Return as a plain text string. No markdown formatting. No HTML. Clean ASCII only for ATS compatibility.

## Validation
- Confirm output length is between 600 and 1200 words
- Confirm all 4 employer names appear unchanged
- Confirm at least 5 matched skills appear in the text

## Edge Cases
- If job is a close match to a previous tailored resume: still generate fresh — never reuse
- If GPT output fails validation: retry once with stricter prompt, then fail

## Version History
- v1: Full ATS tailoring with factual integrity constraints
