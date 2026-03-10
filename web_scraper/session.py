"""Session and identity management — fingerprint generation and rotation.

Superior to Apify's fingerprint management:
  - Generates complete, consistent browser identities (not just UA strings)
  - Ties fingerprint components together (UA matches platform matches WebGL)
  - Session pool with automatic rotation
  - Persistent sessions for sites that need login state
"""

from __future__ import annotations

import hashlib
import json
import os
import random
import time
from dataclasses import dataclass, field
from pathlib import Path

# ---------------------------------------------------------------------------
# Fingerprint generation
# ---------------------------------------------------------------------------

# Realistic hardware profiles — each is internally consistent
_HARDWARE_PROFILES = [
    {
        "platform": "Win32",
        "os": "Windows NT 10.0; Win64; x64",
        "renderer": "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)",
        "vendor": "Google Inc. (Intel)",
        "memory": 8,
        "cores": 8,
        "screen": (1920, 1080),
        "color_depth": 24,
        "touch": False,
    },
    {
        "platform": "Win32",
        "os": "Windows NT 10.0; Win64; x64",
        "renderer": "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)",
        "vendor": "Google Inc. (NVIDIA)",
        "memory": 16,
        "cores": 12,
        "screen": (2560, 1440),
        "color_depth": 24,
        "touch": False,
    },
    {
        "platform": "MacIntel",
        "os": "Macintosh; Intel Mac OS X 10_15_7",
        "renderer": "ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)",
        "vendor": "Google Inc. (Apple)",
        "memory": 16,
        "cores": 10,
        "screen": (2560, 1600),
        "color_depth": 30,
        "touch": False,
    },
    {
        "platform": "MacIntel",
        "os": "Macintosh; Intel Mac OS X 10_15_7",
        "renderer": "ANGLE (Apple, Apple M2, OpenGL 4.1)",
        "vendor": "Google Inc. (Apple)",
        "memory": 8,
        "cores": 8,
        "screen": (1440, 900),
        "color_depth": 30,
        "touch": False,
    },
    {
        "platform": "Linux x86_64",
        "os": "X11; Linux x86_64",
        "renderer": "ANGLE (AMD, AMD Radeon RX 580, OpenGL 4.6)",
        "vendor": "Google Inc. (AMD)",
        "memory": 16,
        "cores": 8,
        "screen": (1920, 1080),
        "color_depth": 24,
        "touch": False,
    },
]

# Chrome version pool (recent stable versions)
_CHROME_VERSIONS = [
    ("134", "134.0.6998.89"),
    ("133", "133.0.6943.142"),
    ("132", "132.0.6834.160"),
    ("131", "131.0.6778.205"),
    ("130", "130.0.6723.117"),
]

_TIMEZONE_LOCALES = {
    "America/New_York": "en-US",
    "America/Chicago": "en-US",
    "America/Denver": "en-US",
    "America/Los_Angeles": "en-US",
    "Europe/London": "en-GB",
    "Europe/Berlin": "de-DE",
    "Asia/Tokyo": "ja-JP",
}


@dataclass
class BrowserFingerprint:
    """A complete, consistent browser identity."""
    user_agent: str = ""
    platform: str = ""
    vendor: str = ""
    renderer: str = ""
    viewport: dict = field(default_factory=lambda: {"width": 1920, "height": 1080})
    screen: tuple = (1920, 1080)
    color_depth: int = 24
    memory: int = 8
    cores: int = 8
    touch: bool = False
    timezone: str = "America/Los_Angeles"
    locale: str = "en-US"
    languages: list[str] = field(default_factory=lambda: ["en-US", "en"])
    chrome_version: str = "134"
    canvas_noise_seed: int = 0  # deterministic noise per identity

    def stealth_js(self) -> str:
        """Generate stealth JS injection tailored to this fingerprint."""
        return f"""
// === Fingerprint: webdriver ===
Object.defineProperty(navigator, 'webdriver', {{get: () => undefined}});
delete navigator.__proto__.webdriver;

// === Fingerprint: chrome runtime ===
window.chrome = {{
    runtime: {{
        onMessage: {{addListener:function(){{}},removeListener:function(){{}}}},
        sendMessage: function(){{}},
        connect: function(){{return{{onMessage:{{addListener:function(){{}}}}}}}},
        id: 'mhjfbmdgcfjbbpaeojofohoefgiehjai'
    }},
    loadTimes: function(){{return{{}}}},
    csi: function(){{return{{}}}},
    app: {{isInstalled: false, InstallState: {{DISABLED:'disabled',INSTALLED:'installed',NOT_INSTALLED:'not_installed'}}}},
}};

// === Fingerprint: platform ===
Object.defineProperty(navigator, 'platform', {{get: () => '{self.platform}'}});

// === Fingerprint: plugins ===
Object.defineProperty(navigator, 'plugins', {{
    get: () => {{
        const p = [
            {{name:'Chrome PDF Plugin',filename:'internal-pdf-viewer',description:'PDF',length:1}},
            {{name:'Chrome PDF Viewer',filename:'mhjfbmdgcfjbbpaeojofohoefgiehjai',description:'',length:1}},
            {{name:'Native Client',filename:'internal-nacl-plugin',description:'',length:2}},
        ];
        p.refresh = function(){{}};
        return p;
    }}
}});

Object.defineProperty(navigator, 'mimeTypes', {{
    get: () => {{
        const t = [
            {{type:'application/pdf',suffixes:'pdf',description:'Portable Document Format'}},
            {{type:'application/x-google-chrome-pdf',suffixes:'pdf',description:''}},
        ];
        t.refresh = function(){{}};
        return t;
    }}
}});

// === Fingerprint: languages ===
Object.defineProperty(navigator, 'languages', {{get: () => {json.dumps(self.languages)}}});
Object.defineProperty(navigator, 'language', {{get: () => '{self.languages[0]}'}});

// === Fingerprint: hardware ===
Object.defineProperty(navigator, 'hardwareConcurrency', {{get: () => {self.cores}}});
Object.defineProperty(navigator, 'deviceMemory', {{get: () => {self.memory}}});
Object.defineProperty(navigator, 'maxTouchPoints', {{get: () => {10 if self.touch else 0}}});

// === Fingerprint: screen ===
Object.defineProperty(screen, 'width', {{get: () => {self.screen[0]}}});
Object.defineProperty(screen, 'height', {{get: () => {self.screen[1]}}});
Object.defineProperty(screen, 'availWidth', {{get: () => {self.screen[0]}}});
Object.defineProperty(screen, 'availHeight', {{get: () => {self.screen[1] - 40}}});
Object.defineProperty(screen, 'colorDepth', {{get: () => {self.color_depth}}});

// === Fingerprint: permissions ===
const origQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (params) => (
    params.name === 'notifications' ?
    Promise.resolve({{state: Notification.permission}}) :
    origQuery(params)
);

// === Fingerprint: canvas noise (deterministic per identity) ===
const _seed = {self.canvas_noise_seed};
let _noiseIdx = _seed;
function _noise() {{ _noiseIdx = (_noiseIdx * 1103515245 + 12345) & 0x7fffffff; return (_noiseIdx % 3) - 1; }}
const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function(type) {{
    const ctx = this.getContext('2d');
    if (ctx && this.width > 0 && this.height > 0) {{
        try {{
            const imgData = ctx.getImageData(0, 0, Math.min(this.width, 64), Math.min(this.height, 64));
            for (let i = 0; i < imgData.data.length; i += 4) {{ imgData.data[i] += _noise(); }}
            ctx.putImageData(imgData, 0, 0);
        }} catch(e) {{}}
    }}
    return origToDataURL.apply(this, arguments);
}};

// === Fingerprint: WebGL ===
const getParam = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(p) {{
    if (p === 37445) return '{self.vendor}';
    if (p === 37446) return '{self.renderer}';
    return getParam.apply(this, arguments);
}};
try {{
    const getParam2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(p) {{
        if (p === 37445) return '{self.vendor}';
        if (p === 37446) return '{self.renderer}';
        return getParam2.apply(this, arguments);
    }};
}} catch(e) {{}}

// === Fingerprint: AudioContext noise ===
const origGetFloatFreq = AnalyserNode.prototype.getFloatFrequencyData;
AnalyserNode.prototype.getFloatFrequencyData = function(array) {{
    origGetFloatFreq.apply(this, arguments);
    _noiseIdx = _seed;
    for (let i = 0; i < array.length; i++) {{ array[i] += _noise() * 0.0001; }}
}};

// === Fingerprint: iframe contentWindow ===
const origAttachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function() {{
    return origAttachShadow.apply(this, arguments);
}};

// === Fingerprint: Connection ===
if (navigator.connection) {{
    Object.defineProperty(navigator.connection, 'rtt', {{get: () => {random.choice([50, 100, 150])}}});
    Object.defineProperty(navigator.connection, 'downlink', {{get: () => {random.choice([5, 10, 15])}}});
    Object.defineProperty(navigator.connection, 'effectiveType', {{get: () => '4g'}});
}}
"""


def generate_fingerprint(timezone: str = "") -> BrowserFingerprint:
    """Generate a complete, internally-consistent browser fingerprint."""
    hw = random.choice(_HARDWARE_PROFILES)
    chrome_major, chrome_full = random.choice(_CHROME_VERSIONS)
    tz = timezone or random.choice(list(_TIMEZONE_LOCALES.keys()))
    locale = _TIMEZONE_LOCALES.get(tz, "en-US")

    # Build consistent UA
    ua = f"Mozilla/5.0 ({hw['os']}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome_full} Safari/537.36"

    # Randomize viewport within screen bounds
    sw, sh = hw["screen"]
    vw = random.randint(int(sw * 0.7), sw)
    vh = random.randint(int(sh * 0.7), sh - 40)

    return BrowserFingerprint(
        user_agent=ua,
        platform=hw["platform"],
        vendor=hw["vendor"],
        renderer=hw["renderer"],
        viewport={"width": vw, "height": vh},
        screen=hw["screen"],
        color_depth=hw["color_depth"],
        memory=hw["memory"],
        cores=hw["cores"],
        touch=hw["touch"],
        timezone=tz,
        locale=locale,
        languages=[locale, locale.split("-")[0]] if "-" in locale else [locale, "en"],
        chrome_version=chrome_major,
        canvas_noise_seed=random.randint(1, 2**31 - 1),
    )


# ---------------------------------------------------------------------------
# Session pool
# ---------------------------------------------------------------------------

_SESSION_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".tmp", "web_scraper_sessions")
os.makedirs(_SESSION_DIR, exist_ok=True)


@dataclass
class Session:
    """A browser session with persistent identity."""
    session_id: str = ""
    fingerprint: BrowserFingerprint = field(default_factory=generate_fingerprint)
    created_at: float = field(default_factory=time.time)
    last_used: float = 0.0
    request_count: int = 0
    domain: str = ""
    cookies_path: str = ""
    blocked: bool = False

    def touch(self):
        self.last_used = time.time()
        self.request_count += 1


class SessionPool:
    """Manage a pool of browser sessions with rotation and persistence."""

    def __init__(self, pool_size: int = 5, max_requests_per_session: int = 50):
        self.pool_size = pool_size
        self.max_requests = max_requests_per_session
        self._sessions: list[Session] = []
        self._current_index = 0

    def get_session(self, domain: str = "") -> Session:
        """Get an available session, creating one if needed."""
        # Try to find a reusable session for this domain
        for s in self._sessions:
            if not s.blocked and s.request_count < self.max_requests:
                if domain and s.domain == domain:
                    s.touch()
                    return s

        # Find any available session
        for s in self._sessions:
            if not s.blocked and s.request_count < self.max_requests:
                s.domain = domain
                s.touch()
                return s

        # Create new session
        session = Session(
            session_id=hashlib.md5(f"{time.time()}{random.random()}".encode()).hexdigest()[:12],
            fingerprint=generate_fingerprint(),
            domain=domain,
            cookies_path=os.path.join(_SESSION_DIR, f"session_{len(self._sessions)}.json"),
        )
        session.touch()

        # Evict oldest if pool is full
        if len(self._sessions) >= self.pool_size:
            oldest = min(self._sessions, key=lambda s: s.last_used)
            self._sessions.remove(oldest)

        self._sessions.append(session)
        return session

    def rotate(self, domain: str = "") -> Session:
        """Force rotation to a new session."""
        # Block current sessions for this domain
        for s in self._sessions:
            if s.domain == domain:
                s.blocked = True

        return self.get_session(domain)

    def report_blocked(self, session: Session):
        """Mark a session as blocked (detected by target site)."""
        session.blocked = True

    def save_cookies(self, session: Session, cookies: list[dict]):
        """Persist cookies for a session."""
        if session.cookies_path:
            Path(session.cookies_path).write_text(json.dumps(cookies, indent=2))

    def load_cookies(self, session: Session) -> list[dict]:
        """Load persisted cookies for a session."""
        if session.cookies_path and os.path.exists(session.cookies_path):
            try:
                return json.loads(Path(session.cookies_path).read_text())
            except Exception:
                pass
        return []

    @property
    def stats(self) -> dict:
        return {
            "total": len(self._sessions),
            "active": sum(1 for s in self._sessions if not s.blocked),
            "blocked": sum(1 for s in self._sessions if s.blocked),
            "total_requests": sum(s.request_count for s in self._sessions),
        }
