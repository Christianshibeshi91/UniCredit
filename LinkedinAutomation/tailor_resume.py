"""ATS-optimized resume tailoring — OpenRouter (Claude Sonnet) with template fallback."""

import json
import os
import re
from dotenv import load_dotenv  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.openrouter_client import generate as ollama_generate, is_available as ollama_available, OLLAMA_WRITING_MODEL  # pyre-ignore[21]
from LinkedinAutomation import safe_job_id, load_profile as _safe_load_profile  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

PROFILE_PATH = os.path.join(BASE_DIR, "candidate", "profile.json")
GOLD_RESUME_PATH = os.path.join(BASE_DIR, "candidate", "gold_standard_resume.docx")


def _load_profile():
    return _safe_load_profile(PROFILE_PATH)


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

    return f"""You are an ATS keyword optimizer and resume tailoring expert. Your job is to tailor the resume below so it scores highly on ATS keyword matching and reads as a strong fit for the target job.

GOLD STANDARD RESUME (this is the source of truth for facts and structure):
--- START GOLD RESUME ---
{gold_resume}
--- END GOLD RESUME ---

TARGET JOB
Title: {job.get('title', 'N/A')}
Company: {job.get('company', 'N/A')}
Description: {job.get('description', 'N/A')[:3000]}

MATCHED SKILLS: {', '.join(score_data.get('matched_skills', []))}
MISSING SKILLS (only add if candidate actually has them): {', '.join(score_data.get('missing_skills', []))}

ATS Keywords to weave in: {', '.join(profile['keywords_for_ats'])}

WHAT YOU MUST TAILOR:

1. PROFESSIONAL SUMMARY: Rewrite 3-4 sentences to mirror the JD language, tone, and priorities. Include top keywords and buzzwords from the job description naturally. Keep the same facts.

2. CORE COMPETENCIES: This section must be tailored to mirror the job posting.
   - Extract key buzzwords, technologies, and skill terms directly from the job description.
   - Replace or swap generic competency terms with the JD-specific buzzwords where the candidate has the equivalent skill. For example, if the JD says "RPA" and the candidate does Power Automate, include both. If the JD says "data visualization" include it alongside Power BI.
   - Reorder so the most JD-relevant competencies appear first.
   - Group by category using pipe (|) separators, one category per line (same format as gold resume).
   - You MAY add JD buzzwords that the candidate genuinely has experience with (based on their experience bullets), even if not in the original list.
   - Do NOT add skills the candidate clearly does not have.

3. EXPERIENCE BULLETS: Actively tailor each job's bullet points to match the target role.
   - Reword bullets to naturally incorporate JD keywords, buzzwords, and terminology. For example, if the JD mentions "stakeholder engagement", reword a collaboration bullet to use that exact phrase.
   - Reorder bullets within each role so the most JD-relevant accomplishments appear first.
   - Where the candidate's actual work maps to a JD requirement, reframe the bullet to emphasize that connection.
   - Keep the same facts, accomplishments, and metrics - just reframe using the JD's language.
   - Maintain the same number of bullets per job.

4. PROJECTS WITHIN EXPERIENCE: When bullets describe specific projects or deliverables, tailor the project descriptions to highlight aspects most relevant to the target role.
   - Use JD terminology when describing project scope, technologies used, and outcomes.
   - If the JD emphasizes certain outcomes (e.g., "process optimization", "digital transformation", "cost reduction"), reframe project results using those terms where truthful.

WHAT YOU MUST NOT CHANGE (copy exactly from gold resume):
- Job titles, company names, locations, and dates (copy verbatim)
- Years of experience (keep exactly as stated in gold resume, do NOT change the number)
- Education section (copy verbatim)
- Certifications section (copy verbatim)
- Number of jobs and number of bullets per job
- Contact information header
- Overall structure and section order

FORMAT RULES:
1. ALL CAPS for section headings (PROFESSIONAL SUMMARY, CORE COMPETENCIES, etc.)
2. Use "-" (hyphen) for bullet points
3. Use "|" (pipe) as separator in experience lines: Title | Company | Location | Dates
4. CORE COMPETENCIES: Use pipe-separated groups by category, one category per line. Example:
   Power Platform: Power Apps (Canvas, Model-Driven), Power Automate | Power BI
   SharePoint: SharePoint Online | SPFx | Microsoft 365
5. STRICTLY plain text only. NO markdown, NO asterisks, NO bold, NO italic, NO backticks.
6. Do NOT include any preamble like "Here is the tailored resume"
7. ABSOLUTELY NO em dashes or en dashes. Use regular hyphens (-) for compound words.
8. NO contractions. Write "I have" not "I've", "I am" not "I'm".
9. NO AI phrases: "spearheaded", "synergized", "leveraged", "cutting-edge", "passionate about", "results-driven".
10. Third person only (no "I" statements). Start bullets with action verbs.
11. NEVER list {job.get('company', 'N/A')} as an employer. Most recent employer is Royal Bank of Canada / City National Bank.

Output the full tailored resume. Plain text only."""


def _build_summary_prompt(job, profile):
    """Short prompt for Ollama: rewrite just the professional summary."""
    return f"""Rewrite this professional summary to match the target job. Keep the same facts. 3-4 sentences max. Plain text only, no preamble.

CURRENT SUMMARY:
{profile.get('summary', '')}

TARGET JOB:
Title: {job.get('title', 'N/A')}
Description: {job.get('description', 'N/A')[:1500]}

RULES:
- Keep "over 9 years of experience" exactly
- Do NOT mention the company name "{job.get('company', 'N/A')}"
- Include keywords from the job description naturally
- Third person only, no "I" statements
- No AI phrases like "spearheaded", "synergized", "cutting-edge", "passionate about", "results-driven"
- Plain text only, no markdown, no preamble, no quotes
- Start with "Power Platform Developer with over 9 years"

Output ONLY the summary paragraph:"""


def _build_competencies_prompt(job, score_data, profile):
    """Short prompt for Ollama: generate tailored core competencies."""
    matched = ', '.join(score_data.get('matched_skills', []))
    return f"""Create a CORE COMPETENCIES section for a resume targeting this job. Use pipe (|) separators grouped by category, one category per line.

CANDIDATE'S SKILLS: {matched}

TARGET JOB KEYWORDS (extract from this description):
{job.get('description', 'N/A')[:1500]}

RULES:
- Group by category with a label. Example format:
Power Platform: Power Apps | Power Automate | Power BI | Copilot Studio
Azure: Azure DevOps | Logic Apps | Azure Functions
- Put the most JD-relevant skills first in each category
- Add JD buzzwords where the candidate has matching skills
- Do NOT add skills the candidate clearly does not have
- 4-6 category lines max
- Plain text only, no markdown, no preamble

Output ONLY the competencies lines:"""


def _reorder_bullets(bullets, job_description):
    """Reorder experience bullets so JD-relevant ones appear first."""
    if not job_description:
        return bullets
    desc_lower = job_description.lower()
    # Extract meaningful keywords from JD (3+ char words, not stopwords)
    stopwords = {"the", "and", "for", "with", "that", "this", "from", "have", "will",
                 "are", "you", "your", "our", "can", "not", "all", "been", "has", "was",
                 "were", "they", "their", "what", "when", "who", "how", "which", "more",
                 "other", "than", "into", "also", "about", "such", "through", "between"}
    words = set(re.findall(r'\b[a-z]{3,}\b', desc_lower)) - stopwords

    def relevance_score(bullet):
        b_lower = bullet.lower()
        return sum(1 for w in words if w in b_lower)

    return sorted(bullets, key=relevance_score, reverse=True)


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

    # Replace em dashes and en dashes
    # Between words (no spaces): use hyphen (e.g., "well—positioned" -> "well-positioned")
    text = re.sub(r'(\w)\u2014(\w)', r'\1-\2', text)
    text = re.sub(r'(\w)\u2013(\w)', r'\1-\2', text)
    # Standalone (with spaces or at boundaries): use comma
    text = text.replace('\u2014', ',')
    text = text.replace('\u2013', ',')
    # Also catch any remaining dash-like Unicode characters
    text = text.replace('\u2012', '-')  # figure dash
    text = text.replace('\u2015', ',')  # horizontal bar

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


def _local_resume(job, score_data, profile, custom_summary=None,
                   custom_competencies=None, reorder_experience=False):
    """ATS-optimized template resume. Accepts optional Ollama-tailored sections."""
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

    # Experience — reverse chronological, optionally reorder bullets by JD relevance
    jd_text = job.get("description", "") if reorder_experience else ""
    experience_text = ""
    for exp in profile.get("experience", []):
        highlights = exp["highlights"]
        if reorder_experience and jd_text:
            highlights = _reorder_bullets(highlights, jd_text)
        bullets = "\n".join(f"- {h}" for h in highlights)
        loc = exp.get("location", "")
        loc_str = f", {loc}" if loc else ""
        experience_text += (
            f"\n{exp['title']}                                                    {exp['duration']}\n"
            f"{exp['company']}{loc_str}\n"
            f"{bullets}\n"
        )

    # Certifications
    certs = "\n".join(f"- {c}" for c in profile.get("certifications", []))

    # Summary: use Ollama-tailored or profile default
    summary = custom_summary if custom_summary else profile.get('summary', '')

    # Core competencies: use Ollama-tailored or template with JD-matched reordering
    if custom_competencies:
        skills_text = custom_competencies
    else:
        tech_skills = profile.get("technical_skills", {})
        if tech_skills:
            matched_lower = {s.lower() for s in matched}
            reordered = {}
            for cat, skills_str in tech_skills.items():
                # Skills stored comma-separated; convert to pipe-separated for display
                items = [s.strip() for s in skills_str.split(",")]
                front = [s for s in items if any(m in s.lower() for m in matched_lower)]
                back = [s for s in items if s not in front]
                reordered[cat] = " | ".join(front + back)
            skills_text = "\n".join(f"{cat}: {skills}" for cat, skills in reordered.items())
        else:
            skills_text = " | ".join(all_skills)

    resume = f"""{profile['name']}
{contact_line}

POWER PLATFORM ENGINEER

PROFESSIONAL SUMMARY
{summary}

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
    """Tailor resume for job. Uses OpenRouter (Claude Sonnet), falls back to template."""
    if profile is None:
        profile = _load_profile()

    resume_text = None

    # Try OpenRouter hybrid: LLM for summary + competencies, template for the rest
    if ollama_available():
        alert("Resume", f"Using OpenRouter ({OLLAMA_WRITING_MODEL}) hybrid for resume")

        # 1. Get tailored summary from Ollama
        summary_prompt = _build_summary_prompt(job, profile)
        tailored_summary = ollama_generate(summary_prompt, model=OLLAMA_WRITING_MODEL, max_tokens=300)
        if tailored_summary:
            tailored_summary = _clean_output(tailored_summary)
            # Validate: must mention "8 years" and not mention target company
            target_co = job.get("company", "").lower()
            if "9 year" in tailored_summary.lower() and target_co not in tailored_summary.lower():
                alert("Resume", "Ollama summary accepted")
            else:
                alert("Resume", "Ollama summary failed validation, using profile summary", "warning")
                tailored_summary = None

        # 2. Get tailored competencies from Ollama
        comp_prompt = _build_competencies_prompt(job, score_data, profile)
        tailored_competencies = ollama_generate(comp_prompt, model=OLLAMA_WRITING_MODEL, max_tokens=400)
        if tailored_competencies:
            tailored_competencies = _clean_output(tailored_competencies)
            # Validate: must contain pipe separators and at least 3 lines
            comp_lines = [l for l in tailored_competencies.split("\n") if l.strip()]
            if len(comp_lines) >= 3 and any("|" in l for l in comp_lines):
                alert("Resume", "Ollama competencies accepted")
            else:
                alert("Resume", "Ollama competencies failed validation, using template", "warning")
                tailored_competencies = None

        # 3. Build hybrid resume: Ollama sections + template structure
        resume_text = _local_resume(
            job, score_data, profile,
            custom_summary=tailored_summary,
            custom_competencies=tailored_competencies,
            reorder_experience=True,
        )

    # Free template fallback
    if resume_text is None:
        alert("Resume", "Using free template-based resume")
        resume_text = _local_resume(job, score_data, profile, reorder_experience=True)

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

    job_id = safe_job_id(job.get("job_id", "unknown"))
    out_path = os.path.join(BASE_DIR, ".tmp", f"resume_{job_id}.txt")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(resume_text)

    return resume_text


if __name__ == "__main__":
    sample_job = {"job_id": "test-resume", "title": "Power Platform Architect", "company": "Contoso", "description": "Dataverse, D365 CE, Azure DevOps, CI/CD."}
    sample_score = {"matched_skills": ["Power Apps", "Dataverse"], "missing_skills": []}
    print(tailor(sample_job, sample_score)[:500] + "...")  # pyre-ignore[29]
