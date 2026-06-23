"""Resume Writer Agent — Multi-pass LLM pipeline for elite resume generation.

Architecture:
  Pass 1 - DRAFT:    Full resume tailored to JD using gold standard as source of truth
  Pass 2 - CRITIQUE: Self-critique against 12 quality criteria (ATS, realism, tone)
  Pass 3 - REFINE:   Apply critique fixes to produce final polished version
  Pass 4 - VALIDATE: Rule-based checks (no placeholders, no AI tells, facts intact)

Result: A realistic, ATS-optimized resume that reads like a human wrote it.
"""
from __future__ import annotations

import os
import re
import time
import requests  # pyre-ignore[21]
from dotenv import load_dotenv  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Read env after load_dotenv
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
WRITING_MODEL      = os.getenv("OPENROUTER_MODEL_WRITING", "meta-llama/llama-3.3-70b-instruct:free")

# Fallback chain if primary writing model is rate-limited
WRITING_FALLBACK_CHAIN = [
    WRITING_MODEL,
    "nvidia/nemotron-3-super-120b-a12b:free",    # 120B - reliable, 1M ctx
    "nvidia/nemotron-3-ultra-550b-a55b:free",    # 550B - largest free model
    "nousresearch/hermes-3-llama-3.1-405b:free", # 405B fallback
]

_session = requests.Session()

# Banned phrases that make resumes sound AI-generated
AI_TELLS = [
    "spearheaded", "synergized", "leveraged", "cutting-edge", "passionate about",
    "results-driven", "dynamic professional", "thought leader", "game-changer",
    "proactive", "go-getter", "guru", "ninja", "rockstar", "wizard",
    "transformative", "innovative solutions", "best-in-class", "world-class",
    "holistic", "robust", "scalable solutions", "paradigm", "synergy",
    "deliverables", "deep dive", "bandwidth", "move the needle",
    "I am excited", "I am thrilled", "I am passionate",
]

# Placeholder patterns that must never appear in final output
PLACEHOLDER_PATTERNS = [
    r"\[.*?\]",     # [Company Name], [X years], [Date]
    r"\{.*?\}",     # {insert here}
    r"X years",     # X years of experience
    r"Your Name",
    r"Company Name",
    r"INSERT",
    r"TODO",
]


# ── LLM Caller ───────────────────────────────────────────────────────────────

def _call_openrouter(prompt: str, model: str, max_tokens: int = 3000) -> str | None:
    """Call OpenRouter with retry on 429. Returns text or None."""
    if not OPENROUTER_API_KEY:
        return None
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/linkedin-automation",
        "X-Title": "LinkedIn Resume Agent",
    }
    for attempt in range(3):
        try:
            r = _session.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                    "temperature": 0.7,
                },
                timeout=120,
            )
            if r.status_code == 200:
                content = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                return content if content else None
            elif r.status_code == 429:
                wait = 8 * (attempt + 1)
                alert("ResumeAgent", f"Rate limited (429) on {model} - waiting {wait}s (attempt {attempt+1}/3)", "warning")
                time.sleep(wait)
            else:
                alert("ResumeAgent", f"HTTP {r.status_code} from {model}: {r.text[:150]}", "warning")
                return None
        except Exception as e:
            alert("ResumeAgent", f"Request error: {e}", "warning")
            return None
    return None


def _llm(prompt: str, max_tokens: int = 3000) -> str | None:
    """Call the best available writing model with automatic fallback chain."""
    if not OPENROUTER_API_KEY:
        alert("ResumeAgent", "No OPENROUTER_API_KEY set", "error")
        return None

    seen = set()
    for model in WRITING_FALLBACK_CHAIN:
        if model in seen:
            continue
        seen.add(model)
        alert("ResumeAgent", f"Trying model: {model}")
        result = _call_openrouter(prompt, model=model, max_tokens=max_tokens)
        if result:
            alert("ResumeAgent", f"Response from {model} ({len(result)} chars)")
            return result
        alert("ResumeAgent", f"Model {model} failed - trying next fallback", "warning")

    alert("ResumeAgent", "All models in fallback chain exhausted", "error")
    return None


# ── Resume Loading ────────────────────────────────────────────────────────────

def _load_gold_resume() -> str:
    """Load the gold standard resume from DOCX (fallback to txt)."""
    path = os.path.join(BASE_DIR, "candidate", "gold_standard_resume.docx")
    if os.path.exists(path):
        try:
            from docx import Document  # pyre-ignore[21]
            doc = Document(path)
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            pass
    # Fallback to txt
    txt_path = os.path.join(BASE_DIR, "candidate", "Chris_Shibeshi_Resume.txt")
    if os.path.exists(txt_path):
        with open(txt_path, encoding="utf-8") as f:
            return f.read()
    return ""


# ── Prompts ───────────────────────────────────────────────────────────────────

def _pass1_draft_prompt(job: dict, score_data: dict, gold_resume: str) -> str:
    """Pass 1: Full resume draft - ATS-optimized, JD-mirrored."""
    title       = job.get("title", "Power Platform Developer")
    company     = job.get("company", "")
    description = job.get("description", "")[:3500]
    matched     = ", ".join(score_data.get("matched_skills", []))
    missing     = ", ".join(score_data.get("missing_skills", []))

    return f"""You are an elite resume writer. Your task is to produce a COMPLETE, TAILORED resume for a {title} role at {company}.

--- SOURCE OF TRUTH (GOLD RESUME) ---
Use ONLY facts from this resume. Do not invent details:
{gold_resume}
--- END SOURCE OF TRUTH ---

--- TARGET JOB DESCRIPTION ---
{description}
--- END TARGET JOB DESCRIPTION ---

--- ATS SKILL MATCHING ---
Matched skills to highlight: {matched}
Missing skills (only include if candidate actually has them): {missing}
--- END ATS SKILL MATCHING ---

YOUR MISSION - PRODUCE A WORLD-CLASS TAILORED RESUME:

1. PROFESSIONAL SUMMARY (4 sentences):
- Sentence 1: Years of experience + primary specialty + 1 major strength from JD
- Sentence 2: Key technical skills that directly match JD requirements
- Sentence 3: A specific business outcome or enterprise-scale achievement
- Sentence 4: What the candidate brings to this specific role at {company}
- Start with "Power Platform Developer with over 8 years..."

2. CORE COMPETENCIES:
- Group skills by category (one category per line) in this format: Category: Skill1 | Skill2 | Skill3
- Group 5-7 lines max. Include Copilot Studio, Power Apps, Power Automate, Dataverse.

3. PROFESSIONAL EXPERIENCE:
- Copy job titles, company names, locations, dates VERBATIM from the Gold Resume. Do NOT invent new employers.
- Rewrite achievement bullets to incorporate terms and keywords from the Job Description.
- Ensure every bullet starts with a strong past-tense action verb.
- Include quantified metrics (%, $, time saved) for achievements.

4. EDUCATION AND CERTIFICATIONS:
- Copy verbatim from Gold Resume.

FORMAT RULES:
- Strictly plain text. No markdown, no asterisks (**), no bolding, no backticks.
- ALL CAPS for section headings (PROFESSIONAL SUMMARY, CORE COMPETENCIES, PROFESSIONAL EXPERIENCE, EDUCATION, CERTIFICATIONS).
- Use hyphens (-) for bullet points.
- Experience lines must use verbatim format: Title | Company | Location | Dates
- No contractions ("do not" instead of "don't").
- No first person ("I", "my", "me"). Use third person.
- No conversational introduction, preamble, or comments. Start directly with the candidate's name.

Start directly with the candidate's name:"""


def _pass2_critique_prompt(draft: str, job: dict) -> str:
    """Pass 2: Self-critique the draft against 12 quality criteria."""
    title   = job.get("title", "")
    company = job.get("company", "")

    return f"""You are a senior hiring manager reviewing a resume for a {title} role at {company}.

Evaluate the resume draft below against the following 12 quality criteria:
1. ATS_KEYWORDS: Uses exact keywords from job title "{title}"? Key technologies named explicitly?
2. NO_PLACEHOLDERS: Any [brackets], X years, "Company Name", or template text?
3. NO_AI_TELLS: Any banned phrases: spearheaded, leveraged, synergized, passionate, results-driven, cutting-edge?
4. QUANTIFIED_RESULTS: Each role has at least one number (%, users, $, time)?
5. STRONG_VERBS: Bullets start with past-tense action verbs (Developed, Built, Automated, Deployed)?
6. THIRD_PERSON: No "I", "my", "me" anywhere?
7. NO_CONTRACTIONS: No "don't", "I've", "can't", etc.?
8. PLAIN_TEXT: No asterisks, markdown bold, hashtags, backticks?
9. REALISTIC_FACTS: Job titles, companies, dates look accurate (no invented employers)?
10. JD_MIRROR: Summary and competencies mirror the language and priorities of the target role?
11. COPILOT_COVERAGE: If Copilot Studio or Microsoft Copilot was in JD, is it represented?
12. SUMMARY_QUALITY: Summary is 3-4 sentences, specific, impactful, free of fluff?

--- START RESUME DRAFT ---
{draft}
--- END RESUME DRAFT ---

For each criterion, output exactly:
CRITERION: [Name]
SCORE: [1-10]
ISSUE: [Describe specific problem, or "None"]
FIX: [Exact instruction to fix, or "None"]

At the end, output:
OVERALL_VERDICT: [PASS or NEEDS_REVISION]
TOP_3_FIXES: [List 3 changes needed, or "None"]"""


def _pass3_refine_prompt(draft: str, critique: str, job: dict) -> str:
    """Pass 3: Apply critique to produce the polished final resume."""
    title   = job.get("title", "")
    company = job.get("company", "")

    return f"""You are an elite professional resume writer. Your job is to rewrite the resume draft below to apply the fixes recommended in the critique feedback.

TARGET ROLE: {title} at {company}

--- INPUT RESUME DRAFT ---
{draft}
--- END INPUT RESUME DRAFT ---

--- CRITIQUE FEEDBACK (APPLY THESE FIXES) ---
{critique}
--- END CRITIQUE FEEDBACK ---

INSTRUCTIONS:
1. Rewrite the input resume draft to fix all issues identified in the critique feedback.
2. If a section had a passing score, keep it as-is.
3. The output must be the complete, tailored, final resume.
4. Maintain all formatting rules: plain text only, no markdown bold/asterisks, capital headings, hyphens for bullets.
5. Do not include any explanations, introduction, comments, or preamble. Start directly with the candidate's name.

Start directly with the candidate's name:"""


# ── Validation ────────────────────────────────────────────────────────────────

def _validate(resume: str, job: dict) -> tuple[bool, list[str]]:
    """Pass 4: Rule-based validation. Returns (passed, failures)."""
    failures = []
    text_lower = resume.lower()

    name = "Christian Shibeshi"
    if name.lower() not in text_lower:
        failures.append(f"Candidate name '{name}' not found")

    for pattern in PLACEHOLDER_PATTERNS:
        if re.search(pattern, resume, re.IGNORECASE):
            failures.append(f"Placeholder: {pattern}")

    for phrase in AI_TELLS:
        if phrase.lower() in text_lower:
            failures.append(f"AI tell: '{phrase}'")

    if re.search(r'\b(I am|I have|I will|I\'ve|I\'m)\b', resume, re.IGNORECASE):
        failures.append("First-person language detected")

    contractions = re.findall(r"\b\w+'[a-z]{1,2}\b", resume)
    if contractions:
        failures.append(f"Contractions: {contractions[:3]}")

    company = job.get("company", "").strip().lower()
    if company and len(company) > 3:
        exp_pattern = rf'{re.escape(company)}.{{0,50}}(developer|engineer|consultant|analyst|manager)'
        if re.search(exp_pattern, text_lower):
            failures.append(f"Target company '{company}' appears as employer - hallucination risk")

    if len(resume) < 800:
        failures.append(f"Resume too short ({len(resume)} chars)")

    for section in ["PROFESSIONAL SUMMARY", "CORE COMPETENCIES", "PROFESSIONAL EXPERIENCE"]:
        if section not in resume.upper():
            failures.append(f"Missing section: {section}")

    return len(failures) == 0, failures


# ── Text Cleaner ──────────────────────────────────────────────────────────────

def _clean(text: str) -> str:
    """Strip markdown artifacts and AI preamble from LLM output."""
    lines = text.split("\n")
    for i, line in enumerate(lines):
        stripped = line.strip().lower()
        if stripped.startswith(("here is", "below is", "here's the", "certainly,", "sure,")):
            lines = lines[i + 1:]
            break
    text = "\n".join(lines)

    text = re.sub(r'\*{1,3}([^*]+)\*{1,3}', r'\1', text)
    text = re.sub(r'^#{1,4}\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^(\s*)[*\u2022]\s+', r'\1- ', text, flags=re.MULTILINE)
    text = text.replace('`', '')
    text = re.sub(r'(\w)\u2014(\w)', r'\1-\2', text)
    text = re.sub(r'(\w)\u2013(\w)', r'\1-\2', text)
    text = text.replace('\u2014', ',').replace('\u2013', ',')

    contractions = {
        "I've": "I have", "I'm": "I am", "I'll": "I will", "I'd": "I would",
        "don't": "do not", "doesn't": "does not", "didn't": "did not",
        "won't": "will not", "wouldn't": "would not", "couldn't": "could not",
        "can't": "cannot", "isn't": "is not", "aren't": "are not",
        "it's": "it is", "that's": "that is", "we're": "we are",
        "they're": "they are", "you're": "you are",
    }
    for c, e in contractions.items():
        text = text.replace(c, e).replace(c.capitalize(), e.capitalize())

    # Strip any preamble before the candidate's name
    name = "Christian Shibeshi"
    lines = text.split("\n")
    for i, line in enumerate(lines):
        cleaned_line = re.sub(r'^(candidate|name)\s*:\s*', '', line.strip(), flags=re.IGNORECASE)
        if cleaned_line.lower() == name.lower():
            lines = [cleaned_line] + lines[i+1:]
            break
    text = "\n".join(lines)

    return text.strip()


# ── Main Entry Point ──────────────────────────────────────────────────────────

def write_resume(job: dict, score_data: dict, profile: dict = None) -> str:
    """
    Run the full 4-pass resume writer agent pipeline.
    Returns the final polished plain-text resume.
    Falls back to tailor_resume.py template if LLM unavailable.
    """
    gold_resume = _load_gold_resume()

    if not OPENROUTER_API_KEY:
        alert("ResumeAgent", "No OPENROUTER_API_KEY - falling back to template", "warning")
        from LinkedinAutomation.tailor_resume import tailor  # pyre-ignore[21]
        return tailor(job, score_data, profile)

    if not gold_resume:
        alert("ResumeAgent", "Gold resume not found - falling back to template", "warning")
        from LinkedinAutomation.tailor_resume import tailor  # pyre-ignore[21]
        return tailor(job, score_data, profile)

    title   = job.get("title", "Unknown Role")
    company = job.get("company", "Unknown Company")
    alert("ResumeAgent", f"Starting 4-pass resume pipeline for {title} at {company}")

    # Pass 1: Draft
    alert("ResumeAgent", "Pass 1/4 - Drafting full tailored resume...")
    draft = _llm(_pass1_draft_prompt(job, score_data, gold_resume), max_tokens=3000)

    if not draft:
        alert("ResumeAgent", "Pass 1 failed - falling back to template", "error")
        from LinkedinAutomation.tailor_resume import tailor  # pyre-ignore[21]
        return tailor(job, score_data, profile)

    draft = _clean(draft)
    alert("ResumeAgent", f"Pass 1 complete - {len(draft)} chars")

    # Pass 2: Critique
    alert("ResumeAgent", "Pass 2/4 - Self-critiquing against 12 quality criteria...")
    critique = _llm(_pass2_critique_prompt(draft, job), max_tokens=1500)

    if not critique:
        alert("ResumeAgent", "Pass 2 skipped - using draft", "warning")
        final = draft
    else:
        verdict = "PASS" if ("OVERALL_VERDICT: PASS" in critique or "OVERALL_VERDICT:PASS" in critique) else "NEEDS_REVISION"

        if verdict == "PASS":
            alert("ResumeAgent", "Pass 2 verdict: PASS - draft is excellent")
            final = draft
        else:
            # Pass 3: Refine
            alert("ResumeAgent", "Pass 3/4 - Applying critique fixes...")
            refined = _llm(_pass3_refine_prompt(draft, critique, job), max_tokens=3000)
            if refined:
                final = _clean(refined)
                alert("ResumeAgent", f"Pass 3 complete - {len(final)} chars")
            else:
                alert("ResumeAgent", "Pass 3 failed - using draft", "warning")
                final = draft

    # Pass 4: Validate
    alert("ResumeAgent", "Pass 4/4 - Validating quality rules...")
    passed, failures = _validate(final, job)

    if passed:
        alert("ResumeAgent", "Pass 4: All validations PASSED")
    else:
        alert("ResumeAgent", f"Pass 4: {len(failures)} issue(s) - auto-fixing", "warning")
        for f in failures:
            alert("ResumeAgent", f"  - {f}", "warning")

        # Auto-fix AI tells and placeholders
        for tell in AI_TELLS:
            final = re.sub(rf'\b{re.escape(tell)}\b', '', final, flags=re.IGNORECASE)
        final = re.sub(r'\[.*?\]', '', final)
        final = re.sub(r'\{.*?\}', '', final)

        # Clean again in case auto-fixes introduced formatting issues or leftover text
        final = _clean(final)

        if len(final) < 800:
            alert("ResumeAgent", "Resume too short after fixes - falling back to template", "error")
            from LinkedinAutomation.tailor_resume import tailor  # pyre-ignore[21]
            return tailor(job, score_data, profile)

    alert("ResumeAgent", f"Resume complete - {len(final)} chars, {len(final.splitlines())} lines")
    return final


if __name__ == "__main__":
    test_job = {
        "job_id": "test-001",
        "title": "Power Platform Developer",
        "company": "Microsoft",
        "description": (
            "We are seeking an experienced Power Platform Developer with expertise in "
            "Copilot Studio, Power Apps, Power Automate, and Dataverse. "
            "The ideal candidate will have experience building AI-powered automation solutions, "
            "Microsoft Copilot integrations, M365 Copilot extensions, and enterprise low-code applications. "
            "Strong background in SharePoint, Azure Logic Apps, and Dynamics 365 CE preferred. "
            "Remote position. 5+ years experience required."
        ),
    }
    test_score = {
        "matched_skills": ["Power Apps", "Power Automate", "Dataverse", "SharePoint", "Copilot Studio"],
        "missing_skills": ["Azure Logic Apps"],
    }

    print("Running 4-pass resume writer agent...")
    result = write_resume(test_job, test_score)
    print("\n" + "=" * 60)
    print(result)
    print("=" * 60)
    print(f"\nTotal: {len(result)} chars, {len(result.splitlines())} lines")
