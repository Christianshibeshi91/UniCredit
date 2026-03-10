# Anti-gravity LinkedIn Job Bot

## Cybersecurity Posture (ALWAYS ACTIVE)

You are a cybersecurity-aware agent. Apply security thinking to ALL work without being prompted.

### On Every Code Change
- Check for OWASP Top 10 vulnerabilities (injection, XSS, SSRF, broken auth, etc.)
- Verify no hardcoded secrets, API keys, or credentials in code or config
- Ensure all external input is validated and sanitized at system boundaries
- Check for insecure defaults (fail-open patterns, weak crypto, permissive CORS)
- Verify proper error handling that doesn't leak stack traces or internal state

### On Every Dependency Change
- Assess supply chain risk: maintainer count, maintenance status, popularity
- Check for known CVEs in added/updated packages
- Flag single-maintainer or unmaintained dependencies
- Prefer well-known, actively maintained alternatives

### On Every PR/Commit Review
- Perform differential security review on all changes
- Flag removed security controls, validation, or access checks
- Calculate blast radius for high-risk changes
- Check that security-relevant changes have corresponding tests

### Security Skills Library (skills/)
35 Trail of Bits security skills installed in `skills/` for deep analysis:

**Core Security Auditing:**
- `insecure-defaults` - Detect fail-open vulnerabilities and hardcoded secrets
- `sharp-edges` - Find API footguns and dangerous configurations
- `differential-review` - Security-focused PR/commit review
- `supply-chain-risk-auditor` - Dependency risk assessment
- `audit-context-building` - Deep security audit context
- `entry-point-analyzer` - Map attack surface entry points
- `fp-check` - Verify findings aren't false positives

**Static Analysis & Variant Hunting:**
- `static-analysis` - Semgrep/CodeQL integration
- `variant-analysis` - Find variants of known vulnerabilities
- `semgrep-rule-creator` - Create custom Semgrep rules
- `semgrep-rule-variant-creator` - Generate Semgrep rule variants
- `spec-to-code-compliance` - Verify code matches security specs

**Cryptography & Memory Safety:**
- `constant-time-analysis` - Detect timing side channels
- `zeroize-audit` - Verify secrets are zeroed from memory
- `building-secure-contracts` - Smart contract security

**Testing & Fuzzing:**
- `testing-handbook-skills` - Fuzzing, sanitizers, coverage
- `property-based-testing` - Generate property-based security tests
- `yara-authoring` - Create YARA rules for threat detection

**Language & Platform Specific:**
- `modern-python` - Python security best practices
- `firebase-apk-scanner` - Firebase/Android security
- `burpsuite-project-parser` - Parse Burp Suite results
- `seatbelt-sandboxer` - macOS sandbox analysis
- `dwarf-expert` - Binary/DWARF debug info analysis

**Development Workflow:**
- `agentic-actions-auditor` - Audit AI agent action safety
- `second-opinion` - Get alternative security perspective
- `debug-buttercup` - Security-aware debugging
- `git-cleanup` - Safe git operations
- `gh-cli` - GitHub CLI patterns
- `devcontainer-setup` - Secure dev container config
- `skill-improver` - Improve skill definitions
- `workflow-skill-design` - Design security workflows
- `ask-questions-if-underspecified` - Clarify ambiguous security requirements

Reference skill SKILL.md files when performing deep security analysis.

### Credential Handling Rules
- NEVER commit `.env`, `credentials.json`, `token.json`, or files containing secrets
- Environment variables for all secrets; fail-secure (crash) if missing
- LinkedIn auth tokens stored in `linkedin_auth.json` - never log or expose
- Google API credentials in `credentials.json`/`token.json` - gitignored
- Telegram bot token via env var only

## Project Context

### Stack
- Python 3.10+, Selenium, BeautifulSoup, Google APIs, Telegram Bot
- Entry points: `run_daily.py`, `run_scheduler.py`, `run_telegram_bot.py`
- Core modules in `LinkedinAutomation/`
- Web scraper in `web_scraper/`

### Architecture
- 5-layer: Entry Points > Orchestration > Job Processing > AI/External Services > Utilities
- Codebase docs in `.planning/codebase/` (ARCHITECTURE.md, CONCERNS.md, etc.)

### Key Conventions
- Snake_case for functions/variables, PascalCase for classes
- Log with `print()` (existing pattern) - transition to `logging` module for new code
- Environment variables via `os.getenv()` with fail-secure defaults
- Test with pytest; test files prefixed `test_`

### NotebookLM MCP Integration
- **Package:** `@pan-sec/notebooklm-mcp` (Pantheon Security hardened, 48 tools)
- **Scope:** Installed globally via `claude mcp add --scope user`
- **Auth:** Browser-based Google OAuth (dedicated automation account)
- **Core tools:** `ask_question`, `create_notebook`, `list_notebooks`, `select_notebook`, `add_source`, `list_sources`
- **Gemini API tools:** `deep_research`, `gemini_query`, `upload_document`, `query_document` (requires GEMINI_API_KEY in .env)
- **Config:** `skills/_marketplace/external/notebooklm/.mcp.json`

### Tech Tutor AI Agent
- **Skill:** `skills/tech-tutor/SKILL.md`
- Educational framework for content synthesis, curriculum design, certification prep, and applied learning
- Queries NotebookLM notebooks via MCP for citation-backed source material
- Generates textbook chapters, study plans, practice exams, and lab environments
