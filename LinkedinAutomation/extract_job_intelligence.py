"""Extract salary, remote status, and required skills from job descriptions using heuristics."""
from __future__ import annotations

import re


REMOTE_KEYWORDS = {
    "remote": "Remote",
    "fully remote": "Remote",
    "work from home": "Remote",
    "hybrid": "Hybrid",
    "on-site": "Onsite",
    "onsite": "Onsite",
    "in-office": "Onsite",
    "in office": "Onsite",
}

SKILL_PATTERNS = [
    "Power Platform", "Power Apps", "Power Automate", "Power BI", "Power Pages",
    "Dataverse", "Dynamics 365", "D365", "D365 CE", "Microsoft 365", "M365",
    "SharePoint", "SPFx", "Azure", "Azure DevOps", "Logic Apps",
    "API Management", "Custom Connectors", "REST API", "CI/CD",
    "Canvas Apps", "Model-Driven Apps", "GRC", "Copilot Studio",
    "AI Builder", "Solution Architecture", "Enterprise Architecture",
    "DAX", "Power Query", "SQL", "JavaScript", "TypeScript", "Python",
    "React", "Angular", ".NET", "C#", "Agile", "Scrum", "PMP",
]


def _extract_salary(text: str) -> str:
    """Find salary ranges like $150,000-$180,000 or $150K-$180K."""
    patterns = [
        r'\$[\d,]+(?:k|K)?\s*[-–to]+\s*\$[\d,]+(?:k|K)?(?:\s*(?:per\s+)?(?:year|annually|yr))?',
        r'\$[\d,]+(?:k|K)?\s*(?:per\s+)?(?:year|annually|yr)',
        r'(?:salary|compensation|pay)\s*(?:range)?\s*:?\s*\$[\d,]+(?:k|K)?',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0).strip()
    return ""


def _extract_remote_status(text: str) -> str:
    """Determine Remote/Hybrid/Onsite from job description."""
    text_lower = text.lower()
    for keyword, status in REMOTE_KEYWORDS.items():
        if keyword in text_lower:
            return status
    return "Unknown"


def _extract_skills(text: str) -> list:
    """Find mentioned skills from the predefined skill list."""
    found = []
    text_lower = text.lower()
    for skill in SKILL_PATTERNS:
        if skill.lower() in text_lower:
            found.append(skill)
    return sorted(set(found))


def extract(job: dict) -> dict:
    """Parse salary, remote status, and required skills from a job dict."""
    description = job.get("description", "")
    title = job.get("title", "")
    location = job.get("location", "")
    full_text = f"{title} {location} {description}"

    salary = job.get("salary") or _extract_salary(full_text)
    remote_status = _extract_remote_status(full_text)
    required_skills = _extract_skills(full_text)

    return {
        "salary": salary,
        "remote_status": remote_status,
        "required_skills": required_skills,
    }


if __name__ == "__main__":
    sample_job = {
        "title": "Power Platform Architect",
        "location": "Remote",
        "description": (
            "We need a Power Platform Architect with Power Apps, Dataverse, "
            "and D365 CE experience. Salary: $170,000-$190,000/year. "
            "This is a fully remote position. Must have CI/CD and Azure DevOps skills."
        ),
    }
    result = extract(sample_job)
    print(f"Salary:  {result['salary']}")
    print(f"Remote:  {result['remote_status']}")
    print(f"Skills:  {result['required_skills']}")
    print("extract_job_intelligence module OK")
