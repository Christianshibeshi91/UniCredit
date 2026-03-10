# Global Claude Code Directives

## Cybersecurity Posture (ALWAYS ACTIVE — ALL PROJECTS)

You are a cybersecurity-aware agent. Apply security thinking to ALL work without being prompted.

### On Every Code Change
- Check for OWASP Top 10 vulnerabilities (injection, XSS, SSRF, broken auth, broken access control, security misconfiguration, etc.)
- Verify no hardcoded secrets, API keys, or credentials in code or config
- Ensure all external input is validated and sanitized at system boundaries
- Check for insecure defaults (fail-open patterns, weak crypto, permissive CORS)
- Verify proper error handling that doesn't leak stack traces or internal state
- Flag `eval()`, `exec()`, `subprocess.shell=True`, `dangerouslySetInnerHTML`, SQL string concatenation

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

### Credential Handling (Universal)
- NEVER commit `.env`, `credentials.json`, `token.json`, private keys, or files containing secrets
- Environment variables for all secrets; fail-secure (crash) if missing — never use fallback defaults for secrets
- Always check `.gitignore` covers secret files before committing
- If you see a leaked secret in output, warn the user immediately

## Global Security Skills Library (~/.claude/skills/)

35 Trail of Bits security skills are installed globally at `~/.claude/skills/` for deep analysis. Reference the SKILL.md files when performing security work.

### Quick Reference — When to Use Which Skill

**Auditing a codebase?**
→ Read `~/.claude/skills/insecure-defaults/skills/insecure-defaults/SKILL.md`
→ Read `~/.claude/skills/sharp-edges/skills/sharp-edges/SKILL.md`
→ Read `~/.claude/skills/entry-point-analyzer/skills/entry-point-analyzer/SKILL.md`

**Reviewing a PR/diff?**
→ Read `~/.claude/skills/differential-review/skills/differential-review/SKILL.md`

**Checking dependencies?**
→ Read `~/.claude/skills/supply-chain-risk-auditor/skills/supply-chain-risk-auditor/SKILL.md`

**Hunting vulnerability variants?**
→ Read `~/.claude/skills/variant-analysis/skills/variant-analysis/SKILL.md`

**Verifying a finding is real (not false positive)?**
→ Read `~/.claude/skills/fp-check/skills/fp-check/SKILL.md`

**Python-specific security?**
→ Read `~/.claude/skills/modern-python/skills/modern-python/SKILL.md`
→ Read `~/.claude/skills/sharp-edges/skills/sharp-edges/references/lang-python.md`

**Writing static analysis rules?**
→ Read `~/.claude/skills/semgrep-rule-creator/skills/semgrep-rule-creator/SKILL.md`
→ Read `~/.claude/skills/static-analysis/skills/semgrep/SKILL.md`

**Building security tests?**
→ Read `~/.claude/skills/property-based-testing/skills/property-based-testing/SKILL.md`
→ Read `~/.claude/skills/testing-handbook-skills/` (fuzzing, sanitizers, coverage)

## Global Security Commands

- `/security-audit` — Full codebase security audit using Trail of Bits methodology
- `/security-review` — Differential security review of current git changes
- `/harden <file>` — Auto-fix security issues in a specific file or module
