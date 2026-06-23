"""Action recorder — watches you use a browser and records every interaction.

Opens a HEADED browser, injects event listeners, and captures your clicks,
keystrokes, form fills, and navigation as a replayable workflow.

Usage:
    recorder = ActionRecorder()
    workflow = await recorder.record_session("https://jobs.example.com/apply")
    recorder.save_workflow(workflow, "workday_apply")
"""
from __future__ import annotations

import asyncio
import json
import os
import time
from dataclasses import dataclass, field, asdict
from typing import Optional

from playwright.async_api import async_playwright

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
WORKFLOWS_DIR = os.path.join(BASE_DIR, ".tmp", "workflows")

# JavaScript injected into every page to capture user actions
_RECORDER_JS = """
(() => {
    if (window.__recorderInjected) return;
    window.__recorderInjected = true;
    window.__recordedActions = [];

    function getSelector(el) {
        // Best: id
        if (el.id) return '#' + CSS.escape(el.id);
        // data-testid
        if (el.getAttribute('data-testid'))
            return `[data-testid="${CSS.escape(el.getAttribute('data-testid'))}"]`;
        // name attr
        if (el.getAttribute('name'))
            return `${el.tagName.toLowerCase()}[name="${CSS.escape(el.getAttribute('name'))}"]`;
        // aria-label
        if (el.getAttribute('aria-label'))
            return `${el.tagName.toLowerCase()}[aria-label="${CSS.escape(el.getAttribute('aria-label'))}"]`;
        // Fallback: tag + nth-of-type within parent
        const parent = el.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
            const idx = siblings.indexOf(el) + 1;
            const parentSel = parent.id ? '#' + CSS.escape(parent.id) : parent.tagName.toLowerCase();
            return `${parentSel} > ${el.tagName.toLowerCase()}:nth-of-type(${idx})`;
        }
        return el.tagName.toLowerCase();
    }

    function getLabel(el) {
        return (
            el.getAttribute('aria-label') ||
            el.getAttribute('placeholder') ||
            el.innerText?.trim().substring(0, 80) ||
            el.getAttribute('name') ||
            el.getAttribute('title') ||
            ''
        );
    }

    function record(type, el, extra) {
        const rect = el.getBoundingClientRect();
        const entry = {
            type: type,
            tag: el.tagName.toLowerCase(),
            selector: getSelector(el),
            label: getLabel(el),
            url: location.href,
            timestamp: Date.now(),
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2),
            ...extra,
        };
        window.__recordedActions.push(entry);
        // Notify Python via console
        console.log('__RECORDER__:' + JSON.stringify(entry));
    }

    // Click
    document.addEventListener('click', (e) => {
        const el = e.target.closest('a, button, input, select, textarea, [role="button"], label');
        if (el) record('click', el, {});
    }, true);

    // Input / change (captures typed text and selections)
    document.addEventListener('input', (e) => {
        const el = e.target;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            record('input', el, { value: el.value });
        }
    }, true);

    document.addEventListener('change', (e) => {
        const el = e.target;
        if (el.tagName === 'SELECT') {
            const selected = el.options[el.selectedIndex];
            record('select', el, {
                value: el.value,
                optionText: selected ? selected.text.trim() : '',
            });
        } else if (el.tagName === 'INPUT' && el.type === 'file') {
            record('file_upload', el, { fileName: el.files?.[0]?.name || '' });
        } else if (el.tagName === 'INPUT') {
            record('input', el, { value: el.value });
        }
    }, true);

    // Keyboard: track Enter (form submits) and Tab (navigation)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            record('keypress', e.target, { key: 'Enter' });
        }
    }, true);

    // Scroll
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            window.__recordedActions.push({
                type: 'scroll',
                tag: 'window',
                selector: 'window',
                label: '',
                url: location.href,
                timestamp: Date.now(),
                scrollY: window.scrollY,
                x: 0, y: 0,
            });
        }, 300);
    }, true);

    console.log('__RECORDER__:INJECTED');
})();
"""


@dataclass
class RecordedAction:
    """A single user action captured during recording."""
    type: str              # click, input, select, file_upload, scroll, keypress, navigate
    tag: str               # HTML tag
    selector: str          # CSS selector
    label: str             # Human-readable label
    url: str               # Page URL when action occurred
    timestamp: float       # Unix timestamp ms
    value: Optional[str] = None       # Typed text or selected value
    option_text: Optional[str] = None # Selected option text for dropdowns
    key: Optional[str] = None         # For keypress events
    file_name: Optional[str] = None   # For file uploads
    x: int = 0
    y: int = 0
    scroll_y: int = 0


@dataclass
class Workflow:
    """A recorded sequence of user actions for a specific ATS flow."""
    name: str
    url_pattern: str          # Starting URL pattern (e.g., "myworkdayjobs.com")
    actions: list[RecordedAction] = field(default_factory=list)
    recorded_at: str = ""
    ats_type: str = ""        # workday, greenhouse, lever, icims, generic
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "url_pattern": self.url_pattern,
            "ats_type": self.ats_type,
            "recorded_at": self.recorded_at,
            "metadata": self.metadata,
            "actions": [asdict(a) for a in self.actions],
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Workflow":
        actions = [RecordedAction(**a) for a in data.get("actions", [])]
        return cls(
            name=data["name"],
            url_pattern=data.get("url_pattern", ""),
            actions=actions,
            recorded_at=data.get("recorded_at", ""),
            ats_type=data.get("ats_type", ""),
            metadata=data.get("metadata", {}),
        )


class ActionRecorder:
    """Opens a headed browser, watches your actions, records them."""

    def __init__(self):
        self._actions: list[RecordedAction] = []
        self._recording = False

    async def record_session(
        self,
        start_url: str,
        session_name: str = "recording",
        timeout_minutes: int = 15,
    ) -> Workflow:
        """Open a browser, let the user interact, record everything.

        The session ends when:
        - User navigates to a page with 'thank' or 'confirm' in URL (submitted)
        - User closes the browser
        - Timeout is reached

        Returns a Workflow object with all recorded actions.
        """
        self._actions = []
        self._recording = True

        pw = await async_playwright().start()
        browser = await pw.chromium.launch(
            headless=False,  # MUST be headed so user can interact
            slow_mo=50,
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
        )

        page = await context.new_page()

        # Capture console messages from our injected recorder
        page.on("console", lambda msg: self._handle_console(msg))

        # Capture navigation events
        page.on("framenavigated", lambda frame: self._handle_navigation(frame))

        # Inject recorder script on every page load
        await context.add_init_script(_RECORDER_JS)

        # Navigate to starting URL
        await page.goto(start_url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(1)

        print(f"\n{'='*60}")
        print(f"  RECORDING STARTED")
        print(f"  URL: {start_url}")
        print(f"  Do your thing in the browser. I'm watching and learning.")
        print(f"  When done, close the browser OR wait {timeout_minutes}min timeout.")
        print(f"{'='*60}\n")

        # Wait for browser close or timeout
        deadline = time.time() + timeout_minutes * 60
        try:
            while self._recording and time.time() < deadline:
                try:
                    # Check if browser is still open
                    _ = page.url
                    await asyncio.sleep(0.5)
                except Exception:
                    # Browser was closed
                    break

                # Check for completion signals
                url_lower = page.url.lower()
                if any(kw in url_lower for kw in ["thank", "confirm", "success", "submitted"]):
                    print("\n  Detected submission page — stopping recording.")
                    break
        except Exception:
            pass

        self._recording = False

        # Collect any remaining actions from the page
        try:
            remaining = await page.evaluate("window.__recordedActions || []")
            for raw in remaining:
                self._process_raw_action(raw)
        except Exception:
            pass

        # Clean up
        try:
            await context.close()
            await browser.close()
        except Exception:
            pass
        await pw.stop()

        # Build workflow
        from urllib.parse import urlparse
        domain = urlparse(start_url).hostname or start_url
        ats_type = _detect_ats_type(start_url)

        workflow = Workflow(
            name=session_name,
            url_pattern=domain,
            actions=self._deduplicate_actions(self._actions),
            recorded_at=time.strftime("%Y-%m-%d %H:%M:%S"),
            ats_type=ats_type,
            metadata={
                "start_url": start_url,
                "total_raw_actions": len(self._actions),
            },
        )

        print(f"\n  Recording complete: {len(workflow.actions)} actions captured")
        print(f"  ATS type: {workflow.ats_type}")
        return workflow

    def _handle_console(self, msg):
        """Process console messages from injected recorder JS."""
        text = msg.text
        if not text.startswith("__RECORDER__:"):
            return
        payload = text[len("__RECORDER__:"):]
        if payload == "INJECTED":
            return
        try:
            raw = json.loads(payload)
            self._process_raw_action(raw)
        except (json.JSONDecodeError, ValueError):
            pass

    def _process_raw_action(self, raw: dict):
        """Convert raw JS event into RecordedAction."""
        action = RecordedAction(
            type=raw.get("type", "unknown"),
            tag=raw.get("tag", ""),
            selector=raw.get("selector", ""),
            label=raw.get("label", ""),
            url=raw.get("url", ""),
            timestamp=raw.get("timestamp", time.time() * 1000),
            value=raw.get("value"),
            option_text=raw.get("optionText"),
            key=raw.get("key"),
            file_name=raw.get("fileName"),
            x=raw.get("x", 0),
            y=raw.get("y", 0),
            scroll_y=raw.get("scrollY", 0),
        )
        self._actions.append(action)

        # Live feedback
        if action.type == "click":
            print(f"  [REC] Click: {action.label[:50] or action.selector[:50]}")
        elif action.type == "input":
            masked = _mask_sensitive(action.value or "", action.label)
            print(f"  [REC] Type: {action.label[:30]} = {masked}")
        elif action.type == "select":
            print(f"  [REC] Select: {action.label[:30]} = {action.option_text or action.value}")
        elif action.type == "file_upload":
            print(f"  [REC] Upload: {action.file_name}")
        elif action.type == "navigate":
            print(f"  [REC] Navigate: {action.url[:60]}")

    def _handle_navigation(self, frame):
        """Track page navigations."""
        if frame.parent_frame:
            return  # Skip iframe navigations
        self._actions.append(RecordedAction(
            type="navigate",
            tag="page",
            selector="",
            label="",
            url=frame.url,
            timestamp=time.time() * 1000,
        ))

    @staticmethod
    def _deduplicate_actions(actions: list[RecordedAction]) -> list[RecordedAction]:
        """Remove duplicate/redundant actions (e.g., rapid input events)."""
        if not actions:
            return []

        deduped = [actions[0]]
        for action in actions[1:]:
            prev = deduped[-1]

            # Collapse rapid input events on same field into one (keep last value)
            if (
                action.type == "input"
                and prev.type == "input"
                and action.selector == prev.selector
                and (action.timestamp - prev.timestamp) < 2000  # Within 2s
            ):
                deduped[-1] = action  # Replace with latest
                continue

            # Skip duplicate navigations to same URL
            if (
                action.type == "navigate"
                and prev.type == "navigate"
                and action.url == prev.url
            ):
                continue

            # Skip redundant scrolls
            if (
                action.type == "scroll"
                and prev.type == "scroll"
                and (action.timestamp - prev.timestamp) < 1000
            ):
                deduped[-1] = action
                continue

            deduped.append(action)

        return deduped

    @staticmethod
    def save_workflow(workflow: Workflow, name: str | None = None):
        """Save workflow to disk."""
        os.makedirs(WORKFLOWS_DIR, exist_ok=True)
        fname = (name or workflow.name).replace(" ", "_").replace("/", "_")
        path = os.path.join(WORKFLOWS_DIR, f"{fname}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(workflow.to_dict(), f, indent=2)
        print(f"  Saved workflow: {path}")
        return path

    @staticmethod
    def load_workflow(name: str) -> Workflow:
        """Load a workflow from disk."""
        path = os.path.join(WORKFLOWS_DIR, f"{name}.json")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Workflow not found: {path}")
        with open(path, "r") as f:
            return Workflow.from_dict(json.load(f))

    @staticmethod
    def list_workflows() -> list[str]:
        """List all saved workflow names."""
        if not os.path.exists(WORKFLOWS_DIR):
            return []
        return [
            f.replace(".json", "")
            for f in os.listdir(WORKFLOWS_DIR)
            if f.endswith(".json")
        ]


def _detect_ats_type(url: str) -> str:
    """Detect ATS platform from URL."""
    url_lower = url.lower()
    if "myworkdayjobs" in url_lower or "workday" in url_lower:
        return "workday"
    if "greenhouse.io" in url_lower or "boards.greenhouse" in url_lower:
        return "greenhouse"
    if "lever.co" in url_lower:
        return "lever"
    if "icims" in url_lower:
        return "icims"
    if "taleo" in url_lower:
        return "taleo"
    if "smartrecruiters" in url_lower:
        return "smartrecruiters"
    if "breezy" in url_lower:
        return "breezy"
    if "ashby" in url_lower:
        return "ashby"
    if "jobvite" in url_lower:
        return "jobvite"
    return "generic"


def _mask_sensitive(value: str, label: str) -> str:
    """Mask passwords and sensitive fields in recording output."""
    label_lower = label.lower()
    if any(kw in label_lower for kw in ["password", "ssn", "secret", "token"]):
        return "****"
    return value[:20] + ("..." if len(value) > 20 else "")
