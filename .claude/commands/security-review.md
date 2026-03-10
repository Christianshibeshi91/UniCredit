Perform a security-focused differential review of the current changes. Read `skills/differential-review/skills/differential-review/SKILL.md` for methodology.

## Steps
1. Run `git diff` and `git diff --staged` to see all current changes
2. Classify each changed file by risk level (HIGH/MEDIUM/LOW)
3. For HIGH risk files: full analysis with git blame, blast radius, attack scenarios
4. For MEDIUM risk: surface scan for common vulnerability patterns
5. Check that security-relevant changes have tests

## Focus Areas
- Auth/credential changes
- External API calls (new endpoints, changed validation)
- Input handling (scraper, Telegram, LinkedIn)
- Configuration changes (env vars, defaults)
- Removed security controls

## Output
Generate `SECURITY_REVIEW.md` with findings, severity, and remediation steps.

$ARGUMENTS
