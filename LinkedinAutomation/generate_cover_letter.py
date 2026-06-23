"""Cover letter generation — OpenRouter (Claude Sonnet) with template fallback."""

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

FORBIDDEN_PHRASES = [
    "i am excited", "i am writing to express", "my enclosed resume",
    "thank you for your consideration", "i look forward to hearing",
    "please find attached", "to whom it may concern",
]


def _load_profile():
    return _safe_load_profile(PROFILE_PATH)


def _clean_cl_output(text):
    """Strip markdown artifacts, em dashes, and contractions from cover letter output."""
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

    # Remove any company name/address block at the top (before "Dear")
    lines = text.split("\n")
    dear_idx = None
    for i, line in enumerate(lines):
        if line.strip().lower().startswith("dear"):
            dear_idx = i
            break
    if dear_idx is not None and dear_idx > 0:  # pyre-ignore[58]
        text = "\n".join(lines[dear_idx:])  # pyre-ignore[6]

    # Ensure "Dear Hiring Manager," is at the top
    if not text.strip().lower().startswith("dear"):
        text = "Dear Hiring Manager,\n\n" + text

    # Remove markdown bold/italic
    text = re.sub(r'\*{1,3}([^*]+)\*{1,3}', r'\1', text)
    # Remove markdown headers
    text = re.sub(r'^#{1,4}\s*', '', text, flags=re.MULTILINE)
    # Remove bullet dashes at start of lines
    text = re.sub(r'^(\s*)[-*\u2022]\s+', r'\1', text, flags=re.MULTILINE)
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


def _build_cl_prompt(job, score_data, profile):
    return f"""You are an expert executive cover letter writer. Write a tailored cover letter.

CANDIDATE
Name: {profile['name']}
Title: {profile['title']}
Years: {profile['years_of_experience']}
Skills: {', '.join(profile['core_skills'][:15])}
Employers: {', '.join(exp['company'] for exp in profile['experience'])}
Certs: {', '.join(profile['certifications'])}

JOB
Title: {job.get('title', 'N/A')}
Company: {job.get('company', 'N/A')}
Description: {job.get('description', 'N/A')[:2500]}

MATCHED SKILLS: {', '.join(score_data.get('matched_skills', []))}

STRICT 4-PARAGRAPH STRUCTURE:
1. Company & Mission Alignment: specific reference to company, connect candidate background
2. Enterprise Power Platform Impact: 2 to 3 achievements with detail, mirror JD language
3. Leadership + Architecture: architect thinking, cross-functional, CI/CD, GRC, enterprise scale
4. Forward Looking AI & Low Code Strategy: Copilot, AI Builder, visionary call to action

RULES:
  Plain text only. NO markdown, NO asterisks, NO bold, NO italic, NO headers
  NO dashes, NO hyphens, NO bullet points, NO bullet characters
  Start with "Dear Hiring Manager," on its own line, then a blank line, then the first paragraph.
  Do NOT include company name, company address, date, or recipient address at the top. Just "Dear Hiring Manager," and the body.
  Exactly 4 paragraphs, 350 to 500 words
  Close with "Sincerely," followed by a new line and "Christian Shibeshi"
  Tone: strategic, executive, confident but HUMAN. Must NOT sound like AI wrote it.
  ABSOLUTELY NO em dashes (—) or en dashes (–) ANYWHERE. Use regular hyphens (-) for compound words like "well-positioned" or "low-code". Use commas or periods for sentence breaks. NEVER use the — character.
  NO contractions. Write "I have" not "I've", "I am" not "I'm", "do not" not "don't".
  NO overused AI phrases: "spearheaded", "synergized", "leveraged", "cutting-edge", "passionate about", "results-driven", "thrilled", "excited to".
  Use direct, concrete language. Write like a senior professional, not a chatbot.
  Do NOT include any preamble like "Here is the cover letter"
  NEVER claim to currently work at or have worked at {job.get('company', 'N/A')}. The most recent employer is Royal Bank of Canada / City National Bank. Reference only real employers from the CANDIDATE section above.
  FORBIDDEN: {', '.join(FORBIDDEN_PHRASES)}"""


def _local_cover_letter(job, score_data, profile):
    """Free template-based cover letter — no API needed."""
    title = job.get("title", "the open position")
    company = job.get("company", "your organization")
    matched = ", ".join(score_data.get("matched_skills", profile.get("core_skills", [])[:6]))
    employers = ", ".join(exp["company"] for exp in profile.get("experience", []))

    cl = f"""Dear Hiring Manager,

As a seasoned {profile['title']} with {profile['years_of_experience']} years of enterprise experience, I am drawn to the opportunity to contribute as {title}. My track record delivering mission-critical Power Platform solutions across {', '.join(profile.get('industries', []))} positions me to make an immediate impact on your team.

Throughout my career at {employers}, I have designed and deployed enterprise-scale solutions leveraging {matched}. At RBC/City National Bank, I architected GRC compliance systems on Power Platform handling governance, risk, and compliance workflows for regulated banking operations. At Boeing, I delivered engineering workflow automation and Power Pages portals for external vendor collaboration. These experiences have sharpened my ability to deliver secure, scalable solutions in complex enterprise environments.

My architectural approach emphasizes CI/CD via Azure DevOps, Dataverse relational data modeling, and custom API connectors, ensuring solutions are maintainable, auditable, and aligned with enterprise governance standards. I bring cross-functional leadership experience, collaborating with business stakeholders, security teams, and executive sponsors to translate requirements into robust Power Platform solutions.

Looking ahead, I am energized by the convergence of AI and low-code platforms. With Microsoft Copilot Studio and AI Builder transforming how enterprises leverage Power Platform, I see tremendous opportunity to drive digital transformation forward. I would welcome the chance to discuss how my expertise can accelerate your team's objectives.

Sincerely,
{profile['name']}"""
    return cl


def generate(job, score_data, profile=None):
    """Generate cover letter. Uses OpenRouter (Claude Sonnet), falls back to template."""
    if profile is None:
        profile = _load_profile()

    cl_text = None

    # Try OpenRouter (Claude Sonnet for writing)
    if ollama_available():
        alert("Cover Letter", f"Using OpenRouter ({OLLAMA_WRITING_MODEL}) for cover letter")
        prompt = _build_cl_prompt(job, score_data, profile)
        result = ollama_generate(prompt, model=OLLAMA_WRITING_MODEL, max_tokens=1200)
        if result and len(result.strip()) > 200:
            cl_text = _clean_cl_output(result)

    # Free template fallback
    if cl_text is None:
        alert("Cover Letter", "Using free template-based cover letter")
        cl_text = _local_cover_letter(job, score_data, profile)

    job_id = safe_job_id(job.get("job_id", "unknown"))
    out_path = os.path.join(BASE_DIR, ".tmp", f"cl_{job_id}.txt")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(cl_text)

    return cl_text


if __name__ == "__main__":
    sample_job = {"job_id": "test-cl", "title": "Power Platform Architect", "company": "Contoso Financial", "description": "Banking division. Dataverse, D365 CE, Azure."}
    sample_score = {"score": 87, "grade": "B", "matched_skills": ["Power Apps", "Dataverse"], "missing_skills": []}
    print(generate(sample_job, sample_score)[:500] + "...")  # pyre-ignore[29]
