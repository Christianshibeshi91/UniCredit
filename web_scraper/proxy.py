"""Proxy rotation — provider integration, geo-targeting, sticky sessions.

Superior to basic proxy lists:
  - Provider API integration (BrightData, Oxylabs, SmartProxy)
  - Geo-targeted proxy selection
  - Sticky sessions (same IP for a domain across requests)
  - Latency-based routing (fastest proxy first)
  - Auto-backoff on rate limits / blocks
  - Concurrent health checking
  - Bandwidth tracking per proxy
"""

from __future__ import annotations

import asyncio
import os
import time
import random
import logging
from dataclasses import dataclass, field
from urllib.parse import urlparse

import requests  # pyre-ignore[21]

log = logging.getLogger(__name__)

# Env-level proxy config
_ENV_PROXIES = [
    p.strip()
    for p in os.getenv("SCRAPER_PROXIES", os.getenv("SCRAPER_PROXY", "")).split(",")
    if p.strip()
]

# Provider credentials
BRIGHTDATA_ZONE = os.getenv("BRIGHTDATA_ZONE", "")
BRIGHTDATA_USER = os.getenv("BRIGHTDATA_USER", "")
BRIGHTDATA_PASS = os.getenv("BRIGHTDATA_PASS", "")

OXYLABS_USER = os.getenv("OXYLABS_USER", "")
OXYLABS_PASS = os.getenv("OXYLABS_PASS", "")

SMARTPROXY_USER = os.getenv("SMARTPROXY_USER", "")
SMARTPROXY_PASS = os.getenv("SMARTPROXY_PASS", "")


# ---------------------------------------------------------------------------
# Proxy state
# ---------------------------------------------------------------------------

@dataclass
class _ProxyState:
    url: str
    provider: str = "static"  # static, brightdata, oxylabs, smartproxy
    country: str = ""
    failures: int = 0
    successes: int = 0
    last_used: float = 0.0
    blocked: bool = False
    block_until: float = 0.0
    avg_latency_ms: float = 0.0
    total_bytes: int = 0
    _latencies: list[float] = field(default_factory=list)

    def record_latency(self, ms: float):
        self._latencies.append(ms)
        if len(self._latencies) > 20:
            self._latencies = self._latencies[-20:]
        self.avg_latency_ms = sum(self._latencies) / len(self._latencies)


# ---------------------------------------------------------------------------
# Sticky session tracking
# ---------------------------------------------------------------------------

@dataclass
class _StickySession:
    domain: str
    proxy_url: str
    created_at: float = field(default_factory=time.time)
    request_count: int = 0
    max_requests: int = 20  # rotate after N requests to same domain


# ---------------------------------------------------------------------------
# Proxy rotator
# ---------------------------------------------------------------------------

class ProxyRotator:
    """Advanced proxy rotation with provider integration and geo-targeting."""

    def __init__(
        self,
        proxies: list[str] | None = None,
        sticky_sessions: bool = False,
        geo_target: str = "",
    ):
        raw = proxies or _ENV_PROXIES
        self._pool: list[_ProxyState] = [_ProxyState(url=p) for p in raw]
        self._index = 0
        self._request_count = 0
        self._sticky = sticky_sessions
        self._sticky_map: dict[str, _StickySession] = {}
        self._geo_target = geo_target.upper()

        # Auto-add provider proxies
        self._add_provider_proxies()

    def _add_provider_proxies(self):
        """Generate proxy URLs from provider credentials."""
        if BRIGHTDATA_USER and BRIGHTDATA_PASS:
            countries = [self._geo_target] if self._geo_target else ["us", "gb", "de"]
            for cc in countries:
                url = f"http://{BRIGHTDATA_USER}-country-{cc.lower()}:{BRIGHTDATA_PASS}@brd.superproxy.io:22225"
                self._pool.append(_ProxyState(url=url, provider="brightdata", country=cc.lower()))
            log.info("Added BrightData proxies (%d countries)", len(countries))

        if OXYLABS_USER and OXYLABS_PASS:
            countries = [self._geo_target] if self._geo_target else ["us", "gb", "de"]
            for cc in countries:
                url = f"http://{OXYLABS_USER}-cc-{cc.lower()}:{OXYLABS_PASS}@pr.oxylabs.io:7777"
                self._pool.append(_ProxyState(url=url, provider="oxylabs", country=cc.lower()))
            log.info("Added Oxylabs proxies")

        if SMARTPROXY_USER and SMARTPROXY_PASS:
            countries = [self._geo_target] if self._geo_target else ["us", "gb", "de"]
            for cc in countries:
                url = f"http://{SMARTPROXY_USER}-cc-{cc.lower()}:{SMARTPROXY_PASS}@gate.smartproxy.com:7000"
                self._pool.append(_ProxyState(url=url, provider="smartproxy", country=cc.lower()))
            log.info("Added SmartProxy proxies")

    @property
    def has_proxies(self) -> bool:
        return len(self._pool) > 0

    def _available(self, country: str = "") -> list[_ProxyState]:
        now = time.time()
        pool = self._pool

        # Geo filter
        if country:
            geo_pool = [p for p in pool if p.country == country.lower()]
            if geo_pool:
                pool = geo_pool

        avail = [p for p in pool if not p.blocked or now >= p.block_until]

        # Unblock expired
        for p in avail:
            if p.blocked and now >= p.block_until:
                p.blocked = False
                p.failures = 0

        return avail if avail else pool

    def get_next(self, domain: str = "", country: str = "") -> dict[str, str] | None:
        """Return the next proxy, considering sticky sessions and geo-targeting."""
        if not self._pool:
            return None

        country = country or self._geo_target

        # Check sticky session
        if self._sticky and domain:
            sticky = self._sticky_map.get(domain)
            if sticky and sticky.request_count < sticky.max_requests:
                sticky.request_count += 1
                return {"server": sticky.proxy_url}

        avail = self._available(country)

        # Sort by latency (faster first), then by success rate
        avail.sort(key=lambda p: (p.avg_latency_ms if p.avg_latency_ms > 0 else 9999, p.failures))

        # Pick from top 3 (some randomness to avoid hammering one proxy)
        top = avail[:min(3, len(avail))]
        proxy = random.choice(top)

        proxy.last_used = time.time()
        self._request_count += 1

        # Set up sticky session
        if self._sticky and domain:
            self._sticky_map[domain] = _StickySession(domain=domain, proxy_url=proxy.url)

        return {"server": proxy.url}

    def get_for_requests(self, domain: str = "") -> dict[str, str] | None:
        """Return proxy dict for the requests library."""
        p = self.get_next(domain=domain)
        if not p:
            return None
        url = p["server"]
        return {"http": url, "https": url}

    def report_success(self, proxy_url: str, latency_ms: float = 0, bytes_count: int = 0):
        """Mark a proxy as successful with optional latency tracking."""
        for p in self._pool:
            if p.url == proxy_url:
                p.successes += 1
                p.failures = max(0, p.failures - 1)
                if latency_ms > 0:
                    p.record_latency(latency_ms)
                p.total_bytes += bytes_count
                break

    def report_failure(self, proxy_url: str, error_type: str = ""):
        """Mark a proxy as failed with smart backoff.

        error_type can be: 'timeout', 'blocked', 'captcha', 'rate_limit', 'error'
        """
        for p in self._pool:
            if p.url == proxy_url:
                p.failures += 1

                # Different backoff strategies based on error type
                if error_type == "blocked":
                    # Blocked — long backoff
                    p.blocked = True
                    p.block_until = time.time() + 300 * (2 ** min(p.failures - 1, 4))
                    log.warning("Proxy %s blocked (ban detected), backoff %ds",
                                proxy_url[:40], p.block_until - time.time())
                elif error_type == "rate_limit":
                    p.blocked = True
                    p.block_until = time.time() + 60 * (2 ** min(p.failures - 1, 3))
                elif error_type == "captcha":
                    p.blocked = True
                    p.block_until = time.time() + 120
                elif p.failures >= 3:
                    p.blocked = True
                    p.block_until = time.time() + 60 * (2 ** (p.failures - 3))

                # Invalidate sticky sessions using this proxy
                for domain, sticky in list(self._sticky_map.items()):
                    if sticky.proxy_url == proxy_url:
                        del self._sticky_map[domain]

                break

    def rotate_sticky(self, domain: str):
        """Force rotation for a domain's sticky session."""
        if domain in self._sticky_map:
            old_url = self._sticky_map[domain].proxy_url
            del self._sticky_map[domain]
            log.info("Rotated sticky session for %s (was %s)", domain, old_url[:40])

    # --- Health checking ---

    def health_check(self, test_url: str = "https://httpbin.org/ip", timeout: int = 10) -> dict[str, dict]:
        """Test all proxies and return {url: {reachable, latency_ms, ip}}."""
        results = {}
        for p in self._pool:
            start = time.time()
            try:
                r = requests.get(
                    test_url,
                    proxies={"http": p.url, "https": p.url},
                    timeout=timeout,
                )
                latency = (time.time() - start) * 1000
                ip = ""
                try:
                    ip = r.json().get("origin", "")
                except Exception:
                    pass
                results[p.url] = {"reachable": r.status_code == 200, "latency_ms": round(latency), "ip": ip}
                p.record_latency(latency)
            except Exception:
                results[p.url] = {"reachable": False, "latency_ms": -1, "ip": ""}
        return results

    async def async_health_check(self, test_url: str = "https://httpbin.org/ip") -> dict[str, dict]:
        """Concurrent health check of all proxies."""
        loop = asyncio.get_event_loop()
        tasks = []
        for p in self._pool:
            tasks.append(loop.run_in_executor(None, self._check_one, p, test_url))
        results_list = await asyncio.gather(*tasks, return_exceptions=True)
        results = {}
        for p, res in zip(self._pool, results_list):
            if isinstance(res, dict):
                results[p.url] = res
            else:
                results[p.url] = {"reachable": False, "latency_ms": -1, "ip": ""}
        return results

    def _check_one(self, proxy: _ProxyState, test_url: str) -> dict:
        start = time.time()
        try:
            r = requests.get(
                test_url,
                proxies={"http": proxy.url, "https": proxy.url},
                timeout=10,
            )
            latency = (time.time() - start) * 1000
            proxy.record_latency(latency)
            ip = ""
            try:
                ip = r.json().get("origin", "")
            except Exception:
                pass
            return {"reachable": r.status_code == 200, "latency_ms": round(latency), "ip": ip}
        except Exception:
            return {"reachable": False, "latency_ms": -1, "ip": ""}

    @property
    def stats(self) -> dict:
        return {
            "total_proxies": len(self._pool),
            "active": sum(1 for p in self._pool if not p.blocked),
            "blocked": sum(1 for p in self._pool if p.blocked),
            "total_requests": self._request_count,
            "sticky_sessions": len(self._sticky_map),
            "providers": list(set(p.provider for p in self._pool)),
            "countries": list(set(p.country for p in self._pool if p.country)),
        }
