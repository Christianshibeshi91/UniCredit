---
goal: Score each discovered job against Christian Shibeshi's profile using AI
inputs:
  - job description text
  - candidate/profile.json
outputs:
  - score: 0–100
  - grade: A–F
  - matched_skills: list
  - missing_skills: list
  - dimension_scores: object
scripts:
  - implementation/score_job.py
---

# Rule: Job Scoring

## Goal
Use GPT-4o to evaluate each job against the candidate profile across 5 weighted dimensions. Return a numeric score, letter grade, and skill match breakdown. Reject all jobs scoring below 70.

## Scoring Dimensions

| Dimension | Weight | What to Evaluate |
|---|---|---|
| Technical Fit | 40% | Power Platform depth, Dataverse, D365, Azure, APIs, CI/CD |
| Enterprise Alignment | 20% | Regulated environments, banking, finance, aerospace, telecom |
| Compensation Alignment | 15% | Explicit salary ≥ $165k, or inferred from company/role level |
| Leadership Scope | 15% | Architect-level title, cross-team ownership, strategic responsibility |
| Remote Compatibility | 10% | Remote or hybrid preferred; fully on-site is a score penalty |

## Grade Thresholds
- **A**: 90–100 → Auto-prioritize
- **B**: 80–89 → Auto-prioritize
- **C**: 70–79 → Include, flag for review
- **D**: 60–69 → Reject (do not process further)
- **F**: 0–59 → Reject immediately

## Rejection Rule
If total score < 70: log as rejected in `.tmp/run_state.json`, skip all downstream steps.

## GPT-4o Prompt Structure
System prompt:
```
You are an expert career strategist and technical recruiter specializing in Microsoft Power Platform and enterprise software. Score the job below against the candidate profile provided. Be rigorous and objective.
```

User prompt includes:
1. Full job description (cleaned, no HTML)
2. Full candidate profile JSON
3. Scoring rubric with weights
4. Required output format

## Required Output Format (strict JSON)
```json
{
  "score": 87,
  "grade": "B",
  "matched_skills": ["Power Apps", "Dataverse", "D365 CE", "Power Automate"],
  "missing_skills": ["Copilot Studio", "Azure AI"],
  "dimension_scores": {
    "technical_fit": 36,
    "enterprise_alignment": 18,
    "compensation_alignment": 12,
    "leadership_scope": 13,
    "remote_compatibility": 8
  },
  "leadership_opportunity_level": "High",
  "enterprise_relevance_score": 85,
  "scoring_rationale": "Strong Power Platform alignment with regulated finance environment..."
}
```

## Validation
- Confirm `score` is integer 0–100
- Confirm `grade` is one of A, B, C, D, F
- Confirm `matched_skills` is a non-empty list for scores ≥ 70
- If response fails JSON parse: retry once, then fail with error

## Edge Cases
- Job has no salary listed: assign compensation score based on role/company inference (document inference in rationale)
- Job description is very short (<200 chars): flag as low-confidence, score conservatively
- Multiple role titles in one posting: score against best-matching target role

## Version History
- v1: 5-dimension GPT-4o scoring
