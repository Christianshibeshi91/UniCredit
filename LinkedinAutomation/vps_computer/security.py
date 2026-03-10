"""Security Module - Request validation, rate limiting, sandboxing."""

import hashlib
import hmac
import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from functools import wraps
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class RateLimitConfig:
    requests_per_minute: int = 30
    requests_per_hour: int = 500
    burst_limit: int = 10  # max concurrent


class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(self, config: RateLimitConfig = None):
        self.config = config or RateLimitConfig()
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._active: dict[str, int] = defaultdict(int)

    def check(self, client_id: str = "default") -> bool:
        """Check if request is allowed. Returns True if allowed."""
        now = time.time()
        reqs = self._requests[client_id]

        # Clean old entries
        reqs[:] = [t for t in reqs if now - t < 3600]

        # Check burst
        if self._active[client_id] >= self.config.burst_limit:
            logger.warning("Rate limit: burst exceeded for %s", client_id)
            return False

        # Check per-minute
        recent_minute = sum(1 for t in reqs if now - t < 60)
        if recent_minute >= self.config.requests_per_minute:
            logger.warning("Rate limit: per-minute exceeded for %s", client_id)
            return False

        # Check per-hour
        if len(reqs) >= self.config.requests_per_hour:
            logger.warning("Rate limit: per-hour exceeded for %s", client_id)
            return False

        reqs.append(now)
        return True

    def acquire(self, client_id: str = "default"):
        self._active[client_id] += 1

    def release(self, client_id: str = "default"):
        self._active[client_id] = max(0, self._active[client_id] - 1)


class URLValidator:
    """Validates and sanitizes URLs before browsing."""

    BLOCKED_PATTERNS = [
        "localhost", "127.0.0.1", "0.0.0.0", "::1",
        "169.254.",  # Link-local
        "10.",       # Private
        "192.168.",  # Private
        "172.16.", "172.17.", "172.18.", "172.19.",
        "172.20.", "172.21.", "172.22.", "172.23.",
        "172.24.", "172.25.", "172.26.", "172.27.",
        "172.28.", "172.29.", "172.30.", "172.31.",
        "file://", "ftp://", "data:", "javascript:",
    ]

    BLOCKED_EXTENSIONS = [
        ".exe", ".msi", ".bat", ".cmd", ".ps1", ".sh",
        ".dmg", ".pkg", ".deb", ".rpm",
    ]

    @classmethod
    def is_safe(cls, url: str) -> bool:
        """Check if URL is safe to visit."""
        url_lower = url.lower().strip()

        # Must be http/https
        if not url_lower.startswith(("http://", "https://")):
            return False

        # Check blocked patterns
        for pattern in cls.BLOCKED_PATTERNS:
            if pattern in url_lower:
                logger.warning("Blocked URL (pattern %s): %s", pattern, url)
                return False

        # Check file downloads
        for ext in cls.BLOCKED_EXTENSIONS:
            if url_lower.endswith(ext):
                logger.warning("Blocked URL (extension %s): %s", ext, url)
                return False

        return True

    @classmethod
    def sanitize(cls, url: str) -> Optional[str]:
        """Sanitize URL. Returns None if unsafe."""
        url = url.strip()
        if cls.is_safe(url):
            return url
        return None


class APIKeyAuth:
    """Simple API key authentication for the API server."""

    def __init__(self, api_keys: list[str] = None):
        # Hash stored keys for comparison
        self._key_hashes = set()
        if api_keys:
            for key in api_keys:
                self._key_hashes.add(self._hash_key(key))

    def _hash_key(self, key: str) -> str:
        return hashlib.sha256(key.encode()).hexdigest()

    def validate(self, key: str) -> bool:
        """Validate an API key. When no keys are configured, allows all (open access).
        Set AGENT_API_KEYS or CLUSTER_API_KEYS in .env to enforce authentication."""
        if not self._key_hashes:
            return True  # No keys configured = open access (documented)
        return self._hash_key(key) in self._key_hashes

    def add_key(self, key: str):
        self._key_hashes.add(self._hash_key(key))

    def revoke_key(self, key: str):
        h = self._hash_key(key)
        self._key_hashes.discard(h)


class InputSanitizer:
    """Sanitize user inputs to prevent injection attacks."""

    MAX_QUERY_LENGTH = 2000

    @classmethod
    def sanitize_query(cls, query: str) -> str:
        """Sanitize a research query."""
        # Truncate
        query = query[:cls.MAX_QUERY_LENGTH]
        # Remove potential script injection
        query = query.replace("<script", "").replace("</script>", "")
        query = query.replace("javascript:", "")
        return query.strip()

    @classmethod
    def sanitize_selector(cls, selector: str) -> str:
        """Sanitize a CSS selector."""
        # Prevent XPath injection or script execution via selectors
        dangerous = ["javascript:", "data:", "vbscript:"]
        for d in dangerous:
            selector = selector.replace(d, "")
        return selector.strip()
