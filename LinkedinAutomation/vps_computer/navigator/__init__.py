"""AI Navigation Agent — browser automation for job applications.

Uses FREE OpenRouter vision models with local Ollama fallback.
Navigates ATS portals (Workday, Greenhouse, Lever, etc.) to reach
the application form, then hands off to the form filler.

Modes:
  1. AUTONOMOUS — brain decides every action using vision models
  2. RECORD    — watch the user, capture actions as replayable workflow
  3. REPLAY    — replay a learned workflow, brain handles deviations
  4. LEARN     — generalize patterns from multiple recordings per ATS type
"""

from .agent import NavigationAgent, close_navigation_result
from .brain import FreeModelBrain
from .config import MODEL_TIERS, DEFAULT_TIER
from .recorder import ActionRecorder, Workflow
from .replayer import WorkflowReplayer
from .learner import WorkflowLearner
from .gmail_verifier import GmailVerifier
from .multi_browser import MultiBrowserManager

__all__ = [
    "NavigationAgent",
    "close_navigation_result",
    "FreeModelBrain",
    "MODEL_TIERS",
    "DEFAULT_TIER",
    "ActionRecorder",
    "Workflow",
    "WorkflowReplayer",
    "WorkflowLearner",
    "GmailVerifier",
    "MultiBrowserManager",
]
