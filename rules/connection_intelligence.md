---
goal: Identify LinkedIn connections at target companies for networking leverage
inputs:
  - company name from job listing
  - job title
outputs:
  - connection_name: string or "Manual Lookup Required"
  - connection_title: string
  - connection_degree: "1st", "2nd", or "Unknown"
  - outreach_message: personalized LinkedIn message draft
scripts:
  - implementation/find_connections.py
---

# Rule: Connection Intelligence

## Goal
For each A/B-grade job, surface the best networking contact at the target company. Generate a short, personalized outreach message. This gives Christian a warm contact before applying.

## Priority Targets (in order)
1. 1st-degree connections with a relevant title
2. 2nd-degree connections with a relevant title
3. Any connection who works at the company

## Target Titles to Prioritize
- Power Platform Engineer / Developer / Architect
- Microsoft 365 Engineer / Architect
- IT Director / VP of IT
- Director / VP of Digital Transformation
- Engineering Manager (Microsoft stack)
- CTO / Chief Digital Officer

## Lookup Method

### Option A: Playwright LinkedIn People Search (automated)
- Use a Playwright script to search LinkedIn people
- Target: `{company_name} Power Platform` or `{company_name} Microsoft 365`
- Filter by location: United States
- Return top 3 results

### Option B: Manual Lookup Mode (fallback)
- If Playwright lookup fails or returns 0 results:
  - Log: `"Manual Lookup Required"` for connection fields
  - Provide a pre-built LinkedIn search URL:
    `https://www.linkedin.com/search/results/people/?keywords={company}+power+platform&network=["F","S"]`
  - Christian manually reviews and fills in the contact

## Outreach Message Template
```
Hi [Name], I noticed you work at [Company] and came across an opening for [Job Title]. 
Given my background delivering enterprise Power Platform solutions at [RBC/Boeing/WSECU/AT&T], 
I thought you'd be a great person to connect with. Would love to learn about your team's 
tech stack and share some of my experience. Open to a quick chat?
```

Rules for message generation:
- Keep under 300 characters (LinkedIn InMail limit for connection requests)
- Reference the mutual tech stack (Power Platform / Microsoft 365)
- Reference one of Christian's enterprise employers for credibility
- End with a low-friction call to action

## Output Schema
```json
{
  "connection_name": "Jane Smith",
  "connection_title": "Power Platform Architect",
  "connection_degree": "2nd",
  "linkedin_profile_url": "https://linkedin.com/in/...",
  "outreach_message": "Hi Jane, I noticed you..."
}
```

## Edge Cases
- Company is unknown or unlisted: return null connection, log for manual review
- Multiple strong contacts found: return the highest-priority one
- Privacy restrictions: some profiles may be hidden — return best available

## Version History
- v1: Playwright people search + manual fallback mode
