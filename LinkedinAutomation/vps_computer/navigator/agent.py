"""Navigation Agent — main loop with record/replay/autonomous modes.

Modes:
  AUTONOMOUS — brain decides every action from screenshots (original mode)
  RECORD     — opens headed browser, watches you, records workflow
  REPLAY     — replays a learned workflow, brain handles deviations
  LEARN      — records a session AND feeds it to the learner

Integrates Gmail verification for ATS signup flows.
"""
from __future__ import annotations

import asyncio
import os
import re

import requests as sync_requests  # pyre-ignore[21]
from playwright.async_api import async_playwright

from .brain import FreeModelBrain
from .vision import get_page_state
from .actions import execute_action
from .memory import NavigationMemory
from .validator import validate_action
from .goal_detector import detect_application_form, should_brain_done_be_trusted
from .fallback import FallbackHandler
from .recorder import ActionRecorder, Workflow
from .replayer import WorkflowReplayer
from .learner import WorkflowLearner
from .gmail_verifier import GmailVerifier
from .multi_browser import MultiBrowserManager
from .config import (
    MAX_STEPS,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))


class NavigationAgent:
    """Autonomous browser agent with record/replay/learn capabilities.

    Usage:
        agent = NavigationAgent(user_profile, credential_store)

        # Mode 1: Let the AI navigate autonomously
        result = await agent.navigate_to_application(job)

        # Mode 2: Record yourself doing it (agent learns by watching)
        workflow = await agent.record_application(job)

        # Mode 3: Replay a learned workflow
        result = await agent.replay_application(job, workflow_name="workday_apply")

        # Mode 4: Record + learn in one shot
        workflow = await agent.learn_application(job)
    """

    def __init__(
        self,
        user_profile: dict,
        credential_store=None,
        answer_kb=None,
        headless: bool = True,
        gmail_email: str | None = None,
        gmail_password: str | None = None,
    ):
        self.user_profile = user_profile
        self.credential_store = credential_store
        self.headless = headless
        self.gmail_email = gmail_email or os.getenv("ATS_EMAIL", "")
        self.gmail_password = gmail_password or os.getenv("ATS_PASSWORD", "")
        self.brain = FreeModelBrain(
            user_profile=user_profile,
            credential_store=credential_store,
            answer_kb=answer_kb,
        )
        self.recorder = ActionRecorder()
        self.learner = WorkflowLearner()
        self.learner.load_all_workflows()

    # ── Mode 1: AUTONOMOUS ──────────────────────────────────────────

    async def navigate_to_application(self, job: dict) -> dict:
        """AI-driven navigation using vision models. Original autonomous mode."""
        url = job.get("url", "")
        title = job.get("title", "Unknown")
        company = job.get("company", "Unknown")

        memory = NavigationMemory()
        fallback = FallbackHandler(self.brain, memory)

        self._send_telegram(
            f"Starting: {title} @ {company}\n"
            f"Model: {self.brain.current_model}\n"
            f"Cost: $0.00 (free tier)"
        )

        # Check if we have a learned pattern for this ATS
        pattern = self.learner.get_pattern_for_url(url)
        if pattern:
            self._send_telegram(
                f"Found {pattern.ats_type} pattern "
                f"({pattern.recording_count} recordings, "
                f"phases: {' -> '.join(pattern.canonical_phases)})"
            )

        # Use multi-browser for Gmail verification support
        mgr = MultiBrowserManager(
            self.gmail_email, self.gmail_password,
            headless=self.headless,
        )
        await mgr.start()
        await mgr.restore_gmail_state()
        page = await mgr.open_application(url)

        try:
            extra_context = ""

            for step in range(MAX_STEPS):
                # 1. Capture page state
                page_state = await get_page_state(page)

                # 2. Check if we reached the goal
                goal_check = detect_application_form(page_state)
                if goal_check["is_application_form"] and goal_check["confidence"] >= 0.7:
                    self._send_telegram(
                        f"Reached form in {step + 1} steps\n"
                        f"Confidence: {goal_check['confidence']}"
                    )
                    return self._result(True, "goal_reached", step + 1, page, mgr)

                # 3. Detect verification-needed signals
                if self._needs_email_verification(page_state):
                    from urllib.parse import urlparse
                    domain = urlparse(url).hostname or ""
                    self._send_telegram(f"Email verification needed — checking Gmail")
                    verified = await mgr.verify_and_return(
                        from_domain=domain, max_wait_seconds=120
                    )
                    if verified:
                        extra_context = "Email verified successfully. Continue with the application."
                        continue
                    else:
                        extra_context = "Could not verify email automatically. Try a different approach."

                # 4. Ask brain for next action
                decision = await self.brain.decide_next_action(
                    page_state=page_state,
                    memory_context=memory.build_context(),
                    extra_context=extra_context,
                )
                extra_context = ""

                action_name = decision.get("action", "")
                model_used = decision.get("_model", self.brain.current_model)

                # 5. Handle special actions
                if action_name == "DONE":
                    if should_brain_done_be_trusted(page_state):
                        self._send_telegram(f"DONE in {step + 1} steps | Model: {model_used}")
                        return self._result(True, "goal_reached", step + 1, page, mgr)
                    else:
                        extra_context = (
                            "You said DONE but this is NOT an application form. "
                            "Look for: resume upload, work experience, Submit Application."
                        )
                        memory.record_step(
                            step, page.url, decision,
                            {"success": False, "error": "DONE not confirmed"},
                            model_used,
                        )
                        continue

                if action_name == "HELP":
                    reason = decision.get("text") or decision.get("think", "Unknown")
                    self._send_telegram(f"HELP: {reason}\nURL: {page.url}")
                    return self._result(False, f"help_needed: {reason}", step + 1, page, mgr)

                # 6. Validate + execute
                validation = validate_action(
                    decision,
                    page_state["dom_elements"].get("elements", []),
                    memory,
                )

                if not validation["valid"]:
                    memory.record_step(
                        step, page.url, decision,
                        {"success": False, "error": validation["reason"]},
                        model_used,
                    )
                    extra_context = f"INVALID: {validation['reason']}. Choose different action."
                    continue

                decision = validation["action"]
                result = await execute_action(
                    page, decision,
                    page_state["dom_elements"].get("elements", []),
                )
                memory.record_step(step, page.url, decision, result, model_used)

                # 7. Settle
                if result["success"] and action_name in ("CLICK", "TYPE", "SELECT"):
                    try:
                        await page.wait_for_load_state("domcontentloaded", timeout=5000)
                    except Exception:
                        pass
                    await asyncio.sleep(1)

                # 8. Fallback assessment
                situation = fallback.assess_situation(page_state, result)
                if situation["strategy"] == "abort":
                    self._send_telegram(f"Aborted: {situation['reason']}")
                    return self._result(False, situation["reason"], step + 1, page, mgr)
                if situation["strategy"] == "help":
                    self._send_telegram(f"HELP: {situation['reason']}")
                    return self._result(False, situation["reason"], step + 1, page, mgr)
                if situation["extra_context"]:
                    extra_context = situation["extra_context"]

            self._send_telegram(f"Max steps ({MAX_STEPS}) reached")
            return self._result(False, "max_steps_exceeded", MAX_STEPS, page, mgr)

        except Exception as e:
            self._send_telegram(f"Error: {str(e)[:200]}")
            await mgr.close()
            return {
                "success": False,
                "reason": f"exception: {str(e)[:200]}",
                "steps": memory.step_count(),
                "final_url": page.url if page else url,
                "page": None,
                "browser_manager": None,
                "stats": self.brain.get_stats(),
            }

    # ── Mode 2: RECORD (watch and learn) ────────────────────────────

    async def record_application(self, job: dict) -> Workflow:
        """Open a headed browser and record the user applying to a job.

        The agent watches every click, keystroke, and navigation.
        Returns a Workflow that can be replayed on similar ATS sites.
        """
        url = job.get("url", "")
        title = job.get("title", "Unknown")
        company = job.get("company", "Unknown")
        session_name = f"{company}_{title}".replace(" ", "_")[:50]

        self._send_telegram(
            f"RECORD MODE: {title} @ {company}\n"
            f"Opening browser — do the application yourself, I'm watching."
        )

        workflow = await self.recorder.record_session(
            start_url=url,
            session_name=session_name,
            timeout_minutes=15,
        )

        # Save to disk
        path = self.recorder.save_workflow(workflow, session_name)

        self._send_telegram(
            f"Recording saved: {len(workflow.actions)} actions\n"
            f"ATS: {workflow.ats_type}\n"
            f"File: {os.path.basename(path)}"
        )

        return workflow

    # ── Mode 3: REPLAY (use a learned workflow) ─────────────────────

    async def replay_application(
        self, job: dict, workflow_name: str | None = None
    ) -> dict:
        """Replay a recorded workflow on a new application.

        If workflow_name is not given, auto-selects based on ATS type.
        Falls back to autonomous mode if replay diverges too much.
        """
        url = job.get("url", "")

        # Find the right workflow
        workflow = None
        if workflow_name:
            try:
                workflow = self.recorder.load_workflow(workflow_name)
            except FileNotFoundError:
                pass

        if not workflow:
            # Auto-select by ATS type
            from .recorder import _detect_ats_type
            ats_type = _detect_ats_type(url)
            for wf_name in self.recorder.list_workflows():
                try:
                    wf = self.recorder.load_workflow(wf_name)
                    if wf.ats_type == ats_type:
                        workflow = wf
                        break
                except Exception:
                    continue

        if not workflow:
            self._send_telegram("No matching workflow found — switching to autonomous mode")
            return await self.navigate_to_application(job)

        self._send_telegram(
            f"REPLAY: {workflow.name} ({len(workflow.actions)} steps)\n"
            f"ATS: {workflow.ats_type}"
        )

        # Open browser
        mgr = MultiBrowserManager(
            self.gmail_email, self.gmail_password,
            headless=self.headless,
        )
        await mgr.start()
        await mgr.restore_gmail_state()
        page = await mgr.open_application(url)

        # Replay
        replayer = WorkflowReplayer(workflow, self.brain)
        result = await replayer.replay(
            page,
            user_data=self._build_user_data(),
            max_deviations=10,
        )

        self._send_telegram(
            f"Replay {'OK' if result['success'] else 'FAILED'}: {result['reason']}\n"
            f"Replayed: {result['steps_replayed']} | Brain: {result['steps_brain']}"
        )

        return {
            **result,
            "page": page,
            "browser_manager": mgr,
            "final_url": page.url,
            "stats": self.brain.get_stats(),
        }

    # ── Mode 4: LEARN (record + feed to learner) ───────────────────

    async def learn_application(self, job: dict) -> Workflow:
        """Record a session AND feed it to the pattern learner.

        Over time, the learner builds generalized patterns per ATS type
        so the agent gets smarter with each recording.
        """
        workflow = await self.record_application(job)
        self.learner.learn_from_workflow(workflow)

        stats = self.learner.get_stats()
        self._send_telegram(
            f"Learned! ATS types known: {', '.join(stats['ats_types_learned'])}\n"
            f"Total workflows: {stats['total_workflows']}"
        )

        return workflow

    # ── Gmail Verification (standalone) ─────────────────────────────

    async def verify_email_standalone(self, from_domain: str) -> dict | None:
        """Open Gmail and find a verification email (standalone mode).

        Use this when you need to verify outside of an active navigation session.
        """
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
        )

        verifier = GmailVerifier(self.gmail_email, self.gmail_password)
        result = await verifier.find_verification(
            context, from_domain=from_domain, max_wait_seconds=120
        )

        await context.close()
        await browser.close()
        await pw.stop()

        return result

    # ── Helpers ──────────────────────────────────────────────────────

    def _build_user_data(self) -> dict:
        """Build user_data dict for the replayer from profile + env."""
        up = self.user_profile
        return {
            "email": up.get("email") or os.getenv("ATS_EMAIL", ""),
            "password": os.getenv("ATS_PASSWORD", ""),
            "first_name": up.get("first_name", ""),
            "last_name": up.get("last_name", ""),
            "phone": up.get("phone", ""),
            "city": up.get("city", ""),
            "state": up.get("state", ""),
            "zip": up.get("zip", ""),
            "country": up.get("country", "United States"),
            "address": up.get("address", ""),
            "linkedin": up.get("linkedin", ""),
            "resume_path": up.get("resume_path", ""),
        }

    @staticmethod
    def _needs_email_verification(page_state: dict) -> bool:
        """Detect if the current page is asking for email verification."""
        headings = page_state.get("dom_elements", {}).get("headings", [])
        alerts = page_state.get("dom_elements", {}).get("alerts", [])
        elements = page_state.get("dom_elements", {}).get("elements", [])

        all_text = " ".join(headings + alerts).lower()
        all_labels = " ".join(el.get("label", "") for el in elements).lower()

        verify_signals = [
            "verify your email",
            "check your email",
            "confirmation email",
            "verification link",
            "we sent you an email",
            "verify your account",
            "email has been sent",
            "check your inbox",
            "enter.*verification code",
            "enter.*otp",
        ]

        import re
        for signal in verify_signals:
            if re.search(signal, all_text) or re.search(signal, all_labels):
                return True

        return False

    def _result(self, success, reason, steps, page, mgr) -> dict:
        return {
            "success": success,
            "reason": reason,
            "steps": steps,
            "final_url": page.url,
            "page": page,
            "browser_manager": mgr,
            "stats": self.brain.get_stats(),
        }

    def _send_telegram(self, text: str):
        if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
            return
        try:
            sync_requests.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "text": f"[NavAgent] {text}",
                    "disable_web_page_preview": True,
                },
                timeout=5,
            )
        except Exception:
            pass


async def close_navigation_result(result: dict):
    """Clean up browser resources from a navigation result."""
    mgr = result.get("browser_manager")
    if mgr:
        try:
            await mgr.close()
        except Exception:
            pass
