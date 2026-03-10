"""Job scoring — Claude API with free local fallback.

Uses Claude when API credits are available. Falls back to keyword-based
scoring (no API needed) when credits run out.
"""

import itertools
import json
import os
import re
from dotenv import load_dotenv  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.ollama_client import generate_json as ollama_json, is_available as ollama_available  # pyre-ignore[21]
from LinkedinAutomation import safe_job_id, load_profile as _safe_load_profile  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

PROFILE_PATH = os.path.join(BASE_DIR, "candidate", "profile.json")


def _load_profile():
    return _safe_load_profile(PROFILE_PATH)


def _build_scoring_prompt(job, profile):
    return f"""You are an expert job-match scoring system. Score how well this job matches the candidate.

## Candidate Profile
- Name: {profile['name']}
- Title: {profile['title']}
- Years of Experience: {profile['years_of_experience']}
- Core Skills: {', '.join(profile['core_skills'])}
- Industries: {', '.join(profile['industries'])}
- Salary Target: ${profile['salary_target_min']:,}-${profile['salary_target_max']:,}
- Remote OK: {profile['remote_ok']}
- Certifications: {', '.join(profile['certifications'])}

## Job Details
- Title: {job.get('title', 'N/A')}
- Company: {job.get('company', 'N/A')}
- Location: {job.get('location', 'N/A')}
- Salary: {job.get('salary', 'Not specified')}
- Description: {job.get('description', 'N/A')[:3000]}

## Scoring Dimensions (total = 100)
1. Technical Fit (0-40): Power Platform depth, Dataverse, D365 CE, Azure, APIs, CI/CD.
2. Enterprise Alignment (0-20): Regulated environments (banking, finance, aerospace, telecom).
3. Compensation Alignment (0-15): >= $165K preferred.
4. Leadership Scope (0-15): Architect-level, cross-team ownership.
5. Remote Compatibility (0-10): Remote=10, Hybrid=7, Onsite=3, Unknown=5.

## Output STRICT JSON only (no other text):
{{"score": <0-100>, "grade": "<A|B|C|D|F>", "matched_skills": ["..."], "missing_skills": ["..."], "dimension_scores": {{"technical_fit": <0-40>, "enterprise_alignment": <0-20>, "compensation_alignment": <0-15>, "leadership_scope": <0-15>, "remote_compatibility": <0-10>}}, "leadership_opportunity_level": "<High|Medium|Low>", "enterprise_relevance_score": <0-100>, "should_reject": <true|false>, "scoring_rationale": "<2-3 sentences>"}}

Grade thresholds: A>=90, B>=80, C>=70, D>=60, F<60. Set should_reject=true if score<70."""


def _local_score(job, profile):
    """Free local keyword-based scoring — no API needed."""
    desc = (job.get("description", "") + " " + job.get("title", "")).lower()
    title = job.get("title", "").lower()

    # Technical fit (0-40): count matched skills with fuzzy aliases
    _SKILL_ALIASES = {
        "power apps (canvas apps)": ["power apps", "canvas app", "powerapps", "canvas"],
        "power apps (model-driven apps)": ["model-driven", "model driven", "power apps"],
        "power apps (custom pages)": ["custom page", "power apps"],
        "power automate": ["power automate", "automate", "flow"],
        "power bi": ["power bi", "powerbi"],
        "dax": ["dax"],
        "power query": ["power query"],
        "dataverse": ["dataverse", "cds", "common data service"],
        "dynamics 365 ce": ["dynamics 365", "d365", "dynamics"],
        "sharepoint online": ["sharepoint"],
        "azure logic apps": ["logic apps", "azure"],
        "azure api management": ["api management", "apim"],
        "custom connectors": ["custom connector", "connector"],
        "rest apis": ["rest api", "api"],
        "ci/cd": ["ci/cd", "cicd", "devops", "pipeline"],
        "azure devops": ["azure devops", "devops"],
        "power pages": ["power pages"],
        "spfx": ["spfx", "sharepoint framework"],
        "microsoft 365": ["microsoft 365", "m365", "office 365"],
        "grc compliance": ["grc", "compliance", "governance"],
        "enterprise architecture": ["enterprise", "architecture"],
        "solution architecture": ["solution architect", "architect"],
    }

    matched = []
    missing = []
    for skill in profile.get("core_skills", []):
        skill_lower = skill.lower()
        aliases = _SKILL_ALIASES.get(skill_lower, [skill_lower])
        if any(alias in desc for alias in aliases):
            matched.append(skill)
        else:
            missing.append(skill)

    skill_ratio = len(matched) / max(len(profile.get("core_skills", [])), 1)
    technical_fit = int(skill_ratio * 40)

    # Baseline boost: jobs that passed our Power Platform filter are already relevant
    pp_kw = ["power platform", "power apps", "powerapps", "power automate"]
    if any(kw in desc for kw in pp_kw):
        technical_fit = max(technical_fit, 20)

    # Enterprise alignment (0-20): check for regulated industry keywords
    enterprise_kw = ["banking", "finance", "aerospace", "telecom", "regulated",
                     "compliance", "grc", "enterprise", "fortune", "global",
                     "government", "healthcare", "insurance", "energy"]
    ent_hits = sum(1 for kw in enterprise_kw if kw in desc)
    enterprise_alignment = min(20, ent_hits * 4)

    # Compensation (0-15): check salary
    salary_text = job.get("salary", "")
    comp_score = 10  # default neutral
    if salary_text:
        numbers = re.findall(r'[\d,]+', salary_text.replace(",", ""))
        amounts = [int(n) for n in numbers if len(n) >= 5]
        if amounts:
            max_salary = max(amounts)
            if max_salary >= 165000:
                comp_score = 15
            elif max_salary >= 140000:
                comp_score = 12
            elif max_salary >= 120000:
                comp_score = 8
            else:
                comp_score = 5

    # Leadership (0-15)
    lead_kw = ["lead", "senior", "architect", "manager", "director", "principal", "staff"]
    lead_hits = sum(1 for kw in lead_kw if kw in title or kw in desc)
    leadership = min(15, lead_hits * 5)

    # Remote (0-10)
    remote_score = 5
    if "remote" in desc or "remote" in job.get("location", "").lower():
        remote_score = 10
    elif "hybrid" in desc:
        remote_score = 7

    total = technical_fit + enterprise_alignment + comp_score + leadership + remote_score
    total = min(100, total)

    if total >= 90:
        grade = "A"
    elif total >= 80:
        grade = "B"
    elif total >= 70:
        grade = "C"
    elif total >= 60:
        grade = "D"
    else:
        grade = "F"

    result = {
        "score": total,
        "grade": grade,
        "matched_skills": matched,
        "missing_skills": list(itertools.islice(missing, 10)),
        "dimension_scores": {
            "technical_fit": technical_fit,
            "enterprise_alignment": enterprise_alignment,
            "compensation_alignment": comp_score,
            "leadership_scope": leadership,
            "remote_compatibility": remote_score,
        },
        "leadership_opportunity_level": "High" if leadership >= 10 else "Medium" if leadership >= 5 else "Low",
        "enterprise_relevance_score": enterprise_alignment * 5,
        "should_reject": total < int(os.getenv("MIN_SCORE_THRESHOLD", "70")),
        "scoring_rationale": f"Local keyword scoring: {len(matched)}/{len(matched)+len(missing)} skills matched. Score {total}/100.",
    }
    return result


def score(job, profile=None):
    """Score a job against the candidate profile. Tries Ollama first, falls back to local."""
    if profile is None:
        profile = _load_profile()


    # Try Ollama (free local LLM)
    if ollama_available():
        alert("Score", "Using Ollama (free local LLM) for scoring")
        prompt = _build_scoring_prompt(job, profile)
        result = ollama_json(prompt)
        if result and "score" in result:
            job_id = job.get("job_id", "unknown")
            out_path = os.path.join(BASE_DIR, ".tmp", f"score_{job_id}.json")
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, "w") as f:
                json.dump(result, f, indent=2)
            return result
        alert("Score", "Ollama response invalid, falling back to local", "warning")

    # Free local keyword fallback
    alert("Score", "Using free local keyword-based scoring")
    result = _local_score(job, profile)

    job_id = safe_job_id(job.get("job_id", "unknown"))
    out_path = os.path.join(BASE_DIR, ".tmp", f"score_{job_id}.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)

    return result


if __name__ == "__main__":
    sample_job = {
        "job_id": "test-score",
        "title": "Power Platform Architect",
        "company": "Contoso Financial",
        "location": "Remote",
        "salary": "$170,000-$190,000",
        "description": "Power Platform Architect with 7+ years in Canvas Apps, Dataverse, D365 CE. Banking/finance. CI/CD required.",
    }
    result = score(sample_job)
    print(json.dumps(result, indent=2))
    print(f"Score: {result['score']} ({result['grade']})")
