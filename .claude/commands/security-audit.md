Perform a comprehensive security audit of this codebase. Use the Trail of Bits security skills in `skills/` as reference methodology.

## Audit Scope
1. **Insecure Defaults** - Read `skills/insecure-defaults/skills/insecure-defaults/SKILL.md` and follow its workflow to find fail-open patterns, hardcoded secrets, weak defaults
2. **Sharp Edges** - Read `skills/sharp-edges/skills/sharp-edges/SKILL.md` and check for API footguns, dangerous configs, silent failures
3. **Credential Exposure** - Scan all files for leaked secrets, API keys, tokens, passwords
4. **Input Validation** - Check all external input paths (web scraper, Telegram bot, LinkedIn) for injection risks
5. **Dependency Risk** - Review `requirements.txt` for unmaintained/vulnerable packages

## Output
Generate `SECURITY_AUDIT.md` in the project root with:
- Executive summary with risk rating (Critical/High/Medium/Low)
- Findings table: Location, Severity, Description, Remediation
- Credential exposure scan results
- Dependency risk assessment
- Recommended immediate actions

$ARGUMENTS
