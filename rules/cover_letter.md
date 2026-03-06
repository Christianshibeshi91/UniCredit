---
goal: Generate executive-level tailored cover letters for each high-fit job
inputs:
  - job description text
  - company name
  - candidate/profile.json
  - matched_skills from score output
outputs:
  - cover_letter_text: 4-paragraph plain text cover letter
scripts:
  - implementation/generate_cover_letter.py
---

# Rule: Cover Letter Generation

## Goal
Produce a strategic, executive-tone cover letter tailored specifically to the role and company. No generic templates. Every sentence must advance the candidate's value proposition.

## Structure (4 Paragraphs — Strict)

### Paragraph 1: Company & Mission Alignment
- Open with a specific, researched reference to the company's mission, known digital transformation initiative, or industry position
- Connect Christian's background to that mission directly
- Avoid generic openers like "I am excited to apply..."
- Tone: Confident and informed

### Paragraph 2: Enterprise Power Platform Impact
- Highlight 2–3 specific, quantifiable (or context-rich) achievements from Christian's most relevant experience
- Mirror the JD's language for required skills
- Reference the regulated/enterprise environment alignment (banking, aerospace, telecom, financial services)
- Tone: Evidence-driven

### Paragraph 3: Leadership + Architecture Ownership
- Emphasize architect-level thinking, cross-functional leadership, and ownership of end-to-end solutions
- Reference CI/CD, GRC compliance, and enterprise-scale delivery
- Position Christian as someone who builds systems that last — not just apps
- Tone: Strategic and authoritative

### Paragraph 4: Forward-Looking AI & Low-Code Strategy
- Demonstrate awareness of Microsoft Copilot, AI Builder, and the future of low-code platforms
- Show forward-thinking perspective on where Power Platform is heading
- Close with a clear, confident call to action
- Tone: Visionary but grounded

## Tone Rules
- Strategic, executive, and confident overall
- No fluff sentences (e.g., "I believe I would be a great fit...")
- No generic phrases (e.g., "I am a team player...")
- Every sentence must earn its place

## Anti-Patterns (FORBIDDEN)
- "I am writing to apply for..."
- "I am excited to have the opportunity..."
- "My enclosed resume demonstrates..."
- "Thank you for your consideration."
- Listing skills in bullet format within the letter
- Repeating the resume verbatim

## Formatting
- Plain text
- 4 paragraphs, no headers
- Professional letter closing: "Sincerely, Christian Shibeshi"
- Target length: 350–500 words total

## Validation
- Confirm 4 paragraphs exist
- Confirm word count is 350–500
- Check for forbidden phrases and regenerate if found
- Confirm company name appears at least once

## Version History
- v1: 4-paragraph executive structure
