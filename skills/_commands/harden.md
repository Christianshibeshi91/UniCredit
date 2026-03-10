Harden the specified file or module against security vulnerabilities. Apply fixes directly.

## Process
1. Read the target file(s)
2. Apply the insecure-defaults checklist from `~/.claude/skills/insecure-defaults/skills/insecure-defaults/SKILL.md`
3. Apply Python-specific checks from `~/.claude/skills/sharp-edges/skills/sharp-edges/references/lang-python.md`
4. Fix all findings in-place:
   - Replace hardcoded secrets with env var lookups (fail-secure)
   - Add input validation at system boundaries
   - Fix insecure defaults (DEBUG=True, verify=False, etc.)
   - Add proper error handling that doesn't leak internals
   - Remove any exposed credentials or tokens
5. Summarize all changes made

Target: $ARGUMENTS
