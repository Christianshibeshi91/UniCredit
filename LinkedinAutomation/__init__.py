# LinkedinAutomation — AI-powered LinkedIn job discovery & application assist

import json
import os
import re


def safe_job_id(job_id) -> str:  # pyre-ignore[3]
    """Sanitize a job_id for safe use in file paths. Strips path separators and special chars."""
    sanitized = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(job_id))
    return sanitized[0:100]  # pyre-ignore[29]


def load_profile(profile_path=None) -> dict:  # pyre-ignore[3,9]
    """Load candidate profile with error handling."""
    if profile_path is None:
        base = os.path.dirname(os.path.dirname(__file__))
        profile_path = os.path.join(base, "candidate", "profile.json")
    try:
        with open(profile_path, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(f"Profile not found: {profile_path}. Copy candidate/profile.json.example to candidate/profile.json")
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in {profile_path}: {e}")
