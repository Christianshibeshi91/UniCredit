"""Workflow learner — builds generalized patterns from recorded sessions.

Analyzes multiple recordings to identify:
1. Common ATS patterns (Workday, Greenhouse, Lever, etc.)
2. Reusable step sequences
3. Field-to-data mappings (which field gets which user data)
4. Navigation patterns (cookie dismiss → login → form → submit)

The learner refines workflows over time: each new recording improves
the model's understanding of that ATS type.
"""
from __future__ import annotations

import json
import os
import re
from collections import Counter, defaultdict

from .recorder import Workflow, RecordedAction, WORKFLOWS_DIR, _detect_ats_type


class WorkflowLearner:
    """Analyzes recordings and builds generalized ATS navigation patterns.

    Usage:
        learner = WorkflowLearner()
        learner.load_all_workflows()
        pattern = learner.get_pattern_for_url("https://company.wd1.myworkdayjobs.com/...")
        # Returns a generalized step sequence for Workday
    """

    def __init__(self):
        self.workflows: list[Workflow] = []
        self.patterns: dict[str, ATSPattern] = {}  # ats_type -> pattern

    def load_all_workflows(self):
        """Load all saved workflows and rebuild patterns."""
        if not os.path.exists(WORKFLOWS_DIR):
            return

        self.workflows = []
        for fname in os.listdir(WORKFLOWS_DIR):
            if not fname.endswith(".json"):
                continue
            try:
                path = os.path.join(WORKFLOWS_DIR, fname)
                with open(path, "r") as f:
                    data = json.load(f)
                self.workflows.append(Workflow.from_dict(data))
            except Exception:
                continue

        self._rebuild_patterns()

    def learn_from_workflow(self, workflow: Workflow):
        """Add a new workflow and update patterns."""
        self.workflows.append(workflow)
        self._rebuild_patterns()
        self._save_patterns()

    def get_pattern_for_url(self, url: str) -> "ATSPattern | None":
        """Get the learned ATS pattern for a URL."""
        ats_type = _detect_ats_type(url)
        return self.patterns.get(ats_type)

    def get_field_mapping(self, ats_type: str) -> dict:
        """Get learned field label -> user_data key mappings for an ATS type."""
        pattern = self.patterns.get(ats_type)
        if not pattern:
            return {}
        return pattern.field_mappings

    def _rebuild_patterns(self):
        """Rebuild patterns from all workflows."""
        # Group workflows by ATS type
        by_type: dict[str, list[Workflow]] = defaultdict(list)
        for wf in self.workflows:
            ats_type = wf.ats_type or _detect_ats_type(wf.url_pattern)
            by_type[ats_type].append(wf)

        self.patterns = {}
        for ats_type, workflows in by_type.items():
            self.patterns[ats_type] = self._build_pattern(ats_type, workflows)

    def _build_pattern(self, ats_type: str, workflows: list[Workflow]) -> "ATSPattern":
        """Build a generalized pattern from multiple workflows of the same ATS type."""
        # Analyze action sequences
        phase_sequences = []
        field_mappings = {}
        common_selectors = Counter()
        dismiss_selectors = []

        for wf in workflows:
            phases = self._extract_phases(wf.actions)
            phase_sequences.append(phases)

            # Learn field mappings
            for action in wf.actions:
                if action.type == "input" and action.label and action.value:
                    field_key = _normalize_field_label(action.label)
                    data_key = _guess_data_key(action.label, action.value)
                    if data_key:
                        field_mappings[field_key] = data_key

                # Track selectors that appear across recordings
                if action.selector:
                    common_selectors[action.selector] += 1

            # Learn dismiss patterns
            for action in wf.actions:
                if action.type == "click" and _is_dismiss_action(action):
                    dismiss_selectors.append(action.selector)

        # Find the most common phase sequence
        canonical_phases = self._find_canonical_sequence(phase_sequences)

        return ATSPattern(
            ats_type=ats_type,
            recording_count=len(workflows),
            canonical_phases=canonical_phases,
            field_mappings=field_mappings,
            common_selectors=dict(common_selectors.most_common(20)),
            dismiss_selectors=list(set(dismiss_selectors)),
        )

    @staticmethod
    def _extract_phases(actions: list[RecordedAction]) -> list[str]:
        """Extract high-level phases from a recording.

        Phases: dismiss, login, signup, fill_form, upload, submit, verify
        """
        phases = []
        seen = set()

        for action in actions:
            label = (action.label or "").lower()
            url = (action.url or "").lower()

            # Dismiss phase
            if _is_dismiss_action(action) and "dismiss" not in seen:
                phases.append("dismiss")
                seen.add("dismiss")
                continue

            # Login phase
            if action.type == "input" and any(
                kw in label for kw in ["email", "username", "login"]
            ):
                if "login" not in seen:
                    phases.append("login")
                    seen.add("login")
                continue

            # Signup phase
            if action.type == "click" and any(
                kw in label for kw in ["create", "sign up", "register", "new account"]
            ):
                if "signup" not in seen:
                    phases.append("signup")
                    seen.add("signup")
                continue

            # Upload phase
            if action.type == "file_upload":
                if "upload" not in seen:
                    phases.append("upload")
                    seen.add("upload")
                continue

            # Form filling
            if action.type in ("input", "select") and "fill_form" not in seen:
                phases.append("fill_form")
                seen.add("fill_form")
                continue

            # Submit
            if action.type == "click" and any(
                kw in label for kw in ["submit", "apply", "send", "complete"]
            ):
                if "submit" not in seen:
                    phases.append("submit")
                    seen.add("submit")

        return phases

    @staticmethod
    def _find_canonical_sequence(phase_sequences: list[list[str]]) -> list[str]:
        """Find the most common phase ordering across recordings."""
        if not phase_sequences:
            return []
        if len(phase_sequences) == 1:
            return phase_sequences[0]

        # Score by frequency of adjacent pairs
        pair_counts: Counter = Counter()
        for seq in phase_sequences:
            for i in range(len(seq) - 1):
                pair_counts[(seq[i], seq[i + 1])] += 1

        # Build canonical sequence from most common pairs
        all_phases = set()
        for seq in phase_sequences:
            all_phases.update(seq)

        # Start with the most common first phase
        first_phase_counts = Counter(seq[0] for seq in phase_sequences if seq)
        if not first_phase_counts:
            return []

        canonical = [first_phase_counts.most_common(1)[0][0]]
        used = {canonical[0]}

        for _ in range(len(all_phases)):
            current = canonical[-1]
            best_next = None
            best_count = 0
            for (a, b), count in pair_counts.items():
                if a == current and b not in used and count > best_count:
                    best_next = b
                    best_count = count
            if best_next:
                canonical.append(best_next)
                used.add(best_next)
            else:
                break

        return canonical

    def _save_patterns(self):
        """Save learned patterns to disk."""
        os.makedirs(WORKFLOWS_DIR, exist_ok=True)
        path = os.path.join(WORKFLOWS_DIR, "_patterns.json")
        data = {}
        for ats_type, pattern in self.patterns.items():
            data[ats_type] = {
                "ats_type": pattern.ats_type,
                "recording_count": pattern.recording_count,
                "canonical_phases": pattern.canonical_phases,
                "field_mappings": pattern.field_mappings,
                "common_selectors": pattern.common_selectors,
                "dismiss_selectors": pattern.dismiss_selectors,
            }
        with open(path, "w") as f:
            json.dump(data, f, indent=2)

    def get_stats(self) -> dict:
        return {
            "total_workflows": len(self.workflows),
            "ats_types_learned": list(self.patterns.keys()),
            "patterns": {
                k: {
                    "recordings": v.recording_count,
                    "phases": v.canonical_phases,
                    "fields_mapped": len(v.field_mappings),
                }
                for k, v in self.patterns.items()
            },
        }


class ATSPattern:
    """A generalized navigation pattern for a specific ATS type."""

    def __init__(
        self,
        ats_type: str,
        recording_count: int,
        canonical_phases: list[str],
        field_mappings: dict[str, str],
        common_selectors: dict[str, int],
        dismiss_selectors: list[str],
    ):
        self.ats_type = ats_type
        self.recording_count = recording_count
        self.canonical_phases = canonical_phases
        self.field_mappings = field_mappings
        self.common_selectors = common_selectors
        self.dismiss_selectors = dismiss_selectors


def _normalize_field_label(label: str) -> str:
    """Normalize a field label for matching across recordings."""
    return re.sub(r"[^a-z0-9]+", "_", label.lower().strip()).strip("_")


def _guess_data_key(label: str, value: str) -> str | None:
    """Guess which user_data key a field maps to based on label and value."""
    label_lower = label.lower()

    mapping = {
        "email": ["email", "e-mail", "email address"],
        "first_name": ["first name", "first", "given name"],
        "last_name": ["last name", "last", "surname", "family"],
        "phone": ["phone", "mobile", "telephone", "cell"],
        "city": ["city"],
        "state": ["state", "province"],
        "zip": ["zip", "postal"],
        "country": ["country"],
        "address": ["address", "street"],
        "linkedin": ["linkedin"],
        "password": ["password"],
    }

    for data_key, patterns in mapping.items():
        if any(p in label_lower for p in patterns):
            return data_key

    # Heuristic: if value looks like an email
    if "@" in value and "." in value:
        return "email"

    # If value is all digits and 10+ chars, probably phone
    if re.match(r"^\+?\d[\d\s()-]{8,}$", value):
        return "phone"

    return None


def _is_dismiss_action(action: RecordedAction) -> bool:
    """Check if an action is dismissing a popup/cookie/overlay."""
    label = (action.label or "").lower()
    dismiss_words = [
        "accept", "agree", "got it", "ok", "close", "dismiss",
        "i understand", "allow", "decline", "no thanks", "skip",
        "cookie", "consent",
    ]
    return any(w in label for w in dismiss_words)
