"""Security helpers for Easy Apply and External Apply.

- URL validation: allow only http/https, block private/internal IPs (SSRF).
- Resume path validation: resolve path and ensure it is under allowed dirs (path traversal).
- Restrictive file permissions for PII/sensitive files (owner read/write only).
"""

import os
import re

# Blocked URL patterns (SSRF / internal)
_BLOCKED_URL_PATTERNS = [
    "localhost", "127.0.0.1", "0.0.0.0", "::1",
    "169.254.",  # Link-local
    "10.", "192.168.", "172.16.", "172.17.", "172.18.", "172.19.",
    "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.",
    "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.",
    "file://", "ftp://", "data:", "javascript:",
]

_BLOCKED_EXTENSIONS = (
    ".exe", ".msi", ".bat", ".cmd", ".ps1", ".sh",
    ".dmg", ".pkg", ".deb", ".rpm",
)


def url_is_safe(url: str) -> bool:
    """Return True if URL is safe to open in the browser (no SSRF)."""
    if not url or not isinstance(url, str):
        return False
    url_lower = url.strip().lower()
    if not url_lower.startswith(("http://", "https://")):
        return False
    for pattern in _BLOCKED_URL_PATTERNS:
        if pattern in url_lower:
            return False
    for ext in _BLOCKED_EXTENSIONS:
        if url_lower.endswith(ext):
            return False
    return True


def sanitize_url(url: str) -> str | None:
    """Return URL if safe, else None."""
    url = (url or "").strip()
    return url if url_is_safe(url) else None


def safe_resume_path(resume_path: str, base_dir: str, allowed_subdirs: tuple = (".tmp", "candidate")) -> str | None:
    """Resolve resume path and ensure it is under base_dir and in an allowed subdir.

    - If resume_path is relative, it is joined with base_dir and the first allowed_subdir.
    - Returns the resolved absolute path if it exists and is under base_dir/<allowed_subdir>/,
      else None (prevents path traversal and reading arbitrary files).
    """
    if not resume_path or not isinstance(resume_path, str):
        return None
    resume_path = resume_path.strip()
    if not resume_path:
        return None

    base_dir = os.path.normpath(os.path.abspath(base_dir))
    if not os.path.isabs(resume_path):
        # Prefer .tmp for resume files (run_daily and bot store there)
        resume_path = os.path.normpath(os.path.join(base_dir, ".tmp", resume_path))

    resolved = os.path.normpath(os.path.abspath(resume_path))
    if not resolved.startswith(base_dir):
        return None
    rel = os.path.relpath(resolved, base_dir)
    if ".." in rel or rel.startswith("."):
        return None
    top = rel.split(os.sep)[0] if os.sep in rel else rel
    if top not in allowed_subdirs:
        return None
    if not os.path.isfile(resolved):
        return None
    return resolved


def safe_resume_path_with_fallback(
    resume_path: str,
    base_dir: str,
    allowed_subdirs: tuple = (".tmp", "candidate"),
) -> str | None:
    """Like safe_resume_path, but if the requested path does not exist and it ends with .txt,
    try the same base name with .pdf (so Telegram-approved jobs can use PDF when only PDF exists).
    """
    out = safe_resume_path(resume_path, base_dir, allowed_subdirs)
    if out:
        return out
    path = (resume_path or "").strip()
    if not path or not path.lower().endswith(".txt"):
        return None
    pdf_path = path[:-4] + ".pdf"
    return safe_resume_path(pdf_path, base_dir, allowed_subdirs)


def restrict_file_permissions(path: str, mode: int = 0o600) -> None:
    """Set file to owner-only read/write (0o600). No-op on failure (e.g. some Windows FS)."""
    try:
        os.chmod(path, mode)
    except (OSError, AttributeError):
        pass
