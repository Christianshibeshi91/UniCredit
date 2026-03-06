"""ATS-optimized resume tailoring — Claude API with free local fallback."""

import json
import os
import re
import anthropic  # pyre-ignore[21]
from dotenv import load_dotenv  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.ollama_client import generate as ollama_generate, is_available as ollama_available, OLLAMA_WRITING_MODEL  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

PROFILE_PATH = os.path.join(BASE_DIR, "candidate", "profile.json")
GOLD_RESUME_PATH = os.path.join(BASE_DIR, "candidate", "gold_standard_resume.docx")


def _load_profile():
    with open(PROFILE_PATH, "r") as f:
        return json.load(f)


def _load_gold_resume() -> str:
    """Load the gold standard resume text from the DOCX file."""
    if not os.path.exists(GOLD_RESUME_PATH):
        return ""
    try:
        from docx import Document  # pyre-ignore[21]
        doc = Document(GOLD_RESUME_PATH)
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception:
        return ""


def _build_resume_prompt(job, score_data, profile):
    gold_resume = _load_gold_resume()

    return f"""You are an expert ATS resume writer. Produce a resume that maximizes ATS (Applicant Tracking System) parsing and scoring.

GOLD STANDARD RESUME (base content — preserve all facts, companies, dates, titles):
--- START GOLD RESUME ---
{gold_resume}
--- END GOLD RESUME ---

TARGET JOB
Title: {job.get('title', 'N/A')}
Company: {job.get('company', 'N/A')}
Description: {job.get('description', 'N/A')[:3000]}

MATCHED SKILLS: {', '.join(score_data.get('matched_skills', []))}
MISSING SKILLS: {', '.join(score_data.get('missing_skills', []))}

ATS Keywords (include >=80%): {', '.join(profile['keywords_for_ats'])}

ATS-OPTIMIZED FORMAT (follow exactly):
The resume MUST use this exact structure — reverse-chronological, single-column, plain text:

{profile.get('name', 'Name')}
{profile.get('location', 'City, ST')} | {profile.get('email', '')} | {profile.get('phone', '')} | linkedin.com/in/christianshibeshi

PROFESSIONAL SUMMARY
[3-4 sentences. Mirror the JD language. Include top 3-5 keywords naturally. Open with title + years of experience.]

SKILLS
[Comma-separated list. Matched skills first, then remaining core skills. Use JD terminology.]

PROFESSIONAL EXPERIENCE

[Job Title] | [Company Name] | [City, State] | [Month YYYY - Month YYYY or Present]
- [Strong action verb] [what you did] [quantified result with numbers/percentages]
- [3-6 bullets per role, most JD-relevant first]

[Repeat for each role, reverse chronological order]

EDUCATION
[Degree] | [University Name] | [Graduation Year]

CERTIFICATIONS
[Certification Name] | [Issuing Organization]

RULES (CRITICAL):
1. Use ALL CAPS for section headings only (PROFESSIONAL SUMMARY, SKILLS, etc.)
2. Use "-" (hyphen) for bullet points — no other bullet characters
3. Use "|" (pipe) as separator between job title, company, location, dates
4. Start every bullet with a strong action verb: Led, Developed, Implemented, Architected, Optimized, Reduced, Automated, Designed, Delivered, Streamlined, Integrated, Built
5. Include numbers, percentages, or dollar amounts in bullets wherever possible
6. NEVER use passive phrases: "Responsible for", "Assisted with", "Helped to"
7. Each critical keyword should appear 2-3 times across the resume (summary + skills + experience)
8. Aim for 60-80% keyword match with the JD
9. Reorder skills: matched/JD-relevant skills first
10. Reorder experience bullets within each role: most JD-relevant first
11. NEVER add skills/tools NOT already in the gold standard resume
12. NEVER change company names, dates, or titles
13. NEVER fabricate experience or metrics
14. Keep all employers exactly as listed in the gold resume
15. STRICTLY plain text only. NO markdown. NO asterisks. NO bold. NO italic. NO backticks.
16. Do NOT include any preamble like "Here is the tailored resume"
17. Max line width: 80 characters
18. Blank line between sections for readability
19. TONE: Write like a professional human, NOT like AI. The resume must sound natural.
20. NO em dashes. Use commas, periods, or hyphens instead.
21. NO contractions. Write "I have" not "I've", "I am" not "I'm", "do not" not "don't".
22. NO flowery or overused AI phrases like "spearheaded", "synergized", "leveraged", "cutting-edge", "passionate about", "results-driven". Use direct, concrete language.
23. Write in third person (no "I" statements). Just start with action verbs.
24. NEVER list the TARGET COMPANY ({job.get('company', 'N/A')}) as a current or past employer. The candidate does NOT work at {job.get('company', 'N/A')}. The most recent employer is Royal Bank of Canada / City National Bank. Keep all employers exactly as they appear in the gold resume.

Output the full tailored resume. Plain text only."""


def _clean_output(text):
    """Strip markdown artifacts and AI-sounding patterns from LLM output."""
    # Remove preamble lines like "Here is the tailored resume:"
    lines = text.split("\n")
    start = 0
    for i, line in enumerate(lines):
        stripped = line.strip().lower()
        if stripped.startswith("here is") or stripped.startswith("below is"):
            start = i + 1
            continue
        if stripped and not stripped.startswith("here") and not stripped.startswith("below"):
            break
    text = "\n".join(lines[start:])

    # Remove markdown bold/italic
    text = re.sub(r'\*{1,3}([^*]+)\*{1,3}', r'\1', text)
    # Remove markdown headers (##) but preserve ALL CAPS headings
    text = re.sub(r'^#{1,4}\s*', '', text, flags=re.MULTILINE)
    # Normalize bullet chars: convert * and bullet to -
    text = re.sub(r'^(\s*)[*\u2022]\s+', r'\1- ', text, flags=re.MULTILINE)
    # Remove backticks
    text = text.replace('`', '')

    # Replace em dashes and en dashes with hyphens or commas
    text = text.replace('\u2014', ',')   # em dash -> comma
    text = text.replace('\u2013', '-')   # en dash -> hyphen

    # Expand contractions
    contractions = {
        "I've": "I have", "I'm": "I am", "I'll": "I will", "I'd": "I would",
        "don't": "do not", "doesn't": "does not", "didn't": "did not",
        "won't": "will not", "wouldn't": "would not", "couldn't": "could not",
        "shouldn't": "should not", "can't": "cannot", "isn't": "is not",
        "aren't": "are not", "wasn't": "was not", "weren't": "were not",
        "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
        "it's": "it is", "that's": "that is", "there's": "there is",
        "who's": "who is", "what's": "what is", "let's": "let us",
        "we're": "we are", "they're": "they are", "you're": "you are",
        "we've": "we have", "they've": "they have", "you've": "you have",
        "we'll": "we will", "they'll": "they will", "you'll": "you will",
    }
    for contraction, expanded in contractions.items():
        text = text.replace(contraction, expanded)
        text = text.replace(contraction.capitalize(), expanded.capitalize())

    return text.strip()


def _local_resume(job, score_data, profile):
    """Free ATS-optimized template-based resume — no API needed."""
    matched = score_data.get("matched_skills", [])
    all_skills = list(matched) + [s for s in profile.get("core_skills", []) if s not in matched]

    # Contact line
    contact_parts = []
    if profile.get('phone'):
        contact_parts.append(profile['phone'])
    if profile.get('email'):
        contact_parts.append(profile['email'])
    if profile.get('linkedin'):
        contact_parts.append(profile['linkedin'])
    contact_line = " | ".join(p for p in contact_parts if p)

    # Experience — reverse chronological with ATS-optimal formatting
    experience_text = ""
    for exp in profile.get("experience", []):
        bullets = "\n".join(f"- {h}" for h in exp["highlights"])
        loc = exp.get("location", "")
        loc_str = f", {loc}" if loc else ""
        experience_text += (
            f"\n{exp['title']} | {exp['company']}{loc_str} | {exp['duration']}\n"
            f"{bullets}\n"
        )

    # Certifications
    certs = "\n".join(f"- {c}" for c in profile.get("certifications", []))

    # Technical skills by category (if available)
    tech_skills = profile.get("technical_skills", {})
    if tech_skills:
        skills_text = "\n".join(f"{cat}: {skills}" for cat, skills in tech_skills.items())
    else:
        skills_text = ", ".join(all_skills)

    resume = f"""{profile['name']}
{contact_line}

POWER PLATFORM CONSULTANT

PROFESSIONAL SUMMARY
{profile.get('summary', '')}

CORE COMPETENCIES
{skills_text}

PROFESSIONAL EXPERIENCE
{experience_text}
EDUCATION
{profile.get('education', '')}

CERTIFICATIONS
{certs}
"""
    return resume.strip()


def tailor(job, score_data, profile=None):
    """Tailor resume for job. Tries Claude first, falls back to template."""
    if profile is None:
        profile = _load_profile()

    resume_text = None

    # Try Claude API first
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if api_key:
        try:
            client = anthropic.Anthropic(api_key=api_key)
            model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

            prompt = _build_resume_prompt(job, score_data, profile)
            response = client.messages.create(
                model=model,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            )
            resume_text = _clean_output(response.content[0].text)
        except Exception as e:
            alert("Resume", f"Claude API unavailable ({e}), using template resume", "warning")

    # Try Ollama (free local LLM)
    if resume_text is None and ollama_available():
        alert("Resume", f"Using Ollama ({OLLAMA_WRITING_MODEL}) for resume")
        prompt = _build_resume_prompt(job, score_data, profile)
        result = ollama_generate(prompt, model=OLLAMA_WRITING_MODEL, max_tokens=2000)
        if result and len(result.strip()) > 200:
            resume_text = _clean_output(result)

    # Free template fallback
    if resume_text is None:
        alert("Resume", "Using free template-based resume")
        resume_text = _local_resume(job, score_data, profile)

    # Safety check: target company must NOT appear as an employer
    target_company = job.get("company", "").strip()
    if target_company and resume_text:
        experience_entries = profile.get("experience", [])
        real_employers = [e.get("company", "") for e in experience_entries]
        # Check if target company was incorrectly added as an experience entry
        lines = resume_text.split("\n")
        for i, line in enumerate(lines):
            # Experience lines use format: Title | Company | Location | Duration
            if "|" in line and target_company.lower() in line.lower():
                # Make sure it's not a real employer
                is_real = any(emp.lower() in line.lower() for emp in real_employers if emp)
                if not is_real:
                    alert("Resume", f"WARNING: Removed target company '{target_company}' from experience. Falling back to template.", "warning")
                    resume_text = _local_resume(job, score_data, profile)
                    break

    job_id = job.get("job_id", "unknown")
    out_path = os.path.join(BASE_DIR, ".tmp", f"resume_{job_id}.txt")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(resume_text)

    return resume_text


if __name__ == "__main__":
    sample_job = {"job_id": "test-resume", "title": "Power Platform Architect", "company": "Contoso", "description": "Dataverse, D365 CE, Azure DevOps, CI/CD."}
    sample_score = {"matched_skills": ["Power Apps", "Dataverse"], "missing_skills": []}
    print(tailor(sample_job, sample_score)[:500] + "...")  # pyre-ignore[29]
