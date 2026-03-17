Launch a 5-agent team to build a project. Coordinate agents in dependency order with message passing.

## Project Brief

$ARGUMENTS

## Pre-Flight

Before spawning any agents:
1. Create the project scaffold directories: `docs/`, `src/`, `tests/unit/`, `tests/integration/`, `tests/e2e/`
2. Read the project's CLAUDE.md for security and convention requirements
3. If $ARGUMENTS is empty or contains only placeholder text like "[DESCRIBE YOUR PROJECT HERE]", ask the user what they want to build before proceeding

## Team Roster & Execution Plan

You are the **Team Lead / Orchestrator**. You coordinate 5 specialized agents. Each agent runs via the `Agent` tool with `subagent_type: "general-purpose"`. You manage sequencing, pass outputs between agents, and resolve conflicts.

### Phase 1 — Requirements (Teammate 1: Business Analyst)

Spawn ONE agent:

**Agent: Business Analyst & Researcher**
- Analyze the project brief above
- Produce `docs/PRD.md` — Product Requirements Document with:
  - Problem statement, target users, value proposition
  - User personas with goals and pain points
  - Feature list prioritized with MoSCoW (Must/Should/Could/Won't)
  - MVP scope clearly marked
  - Risks, assumptions, dependencies, constraints
- Produce `docs/user-stories.md` — User stories in format: "As a [persona], I want [goal] so that [benefit]" with acceptance criteria for each
- Produce `docs/competitive-analysis.md` — Brief competitive landscape

Wait for this agent to complete. Read the outputs before proceeding.

### Phase 2 — Architecture (Teammate 2: Solution Architect)

Spawn ONE agent. Pass it the content of `docs/PRD.md` and `docs/user-stories.md` in the prompt.

**Agent: Solution Architect**
- Read `docs/PRD.md` and `docs/user-stories.md` thoroughly
- Translate every business requirement into technical specifications
- Design full system architecture: services, data models, API contracts, auth strategy
- Write architecture decision records (ADRs) explaining WHY each tech/pattern was chosen
- Define folder structure and file ownership map so teammates don't collide
- Consider edge cases, failure modes, caching, rate limiting, data validation
- Apply security requirements from CLAUDE.md
- Produce:
  - `docs/architecture.md` — System architecture with diagrams (mermaid)
  - `docs/tech-spec.md` — Detailed technical specification
  - `docs/api-contracts.md` — Full API contract definitions (endpoints, request/response schemas, status codes)
  - `docs/data-models.md` — Data models with relationships, constraints, indexes
  - `docs/file-ownership.md` — Which teammate owns which files/directories

Wait for this agent to complete. Read the outputs before proceeding.

### Phase 3 — Implementation & Design (Teammates 3 & 5 in parallel)

Spawn TWO agents in parallel. Pass both the architecture docs.

**Agent: Senior Software Developer (Teammate 3)**
- Read all docs from Phase 1 and Phase 2
- Select optimal language, framework, libraries — justify in `docs/tech-decisions.md`
- Implement ALL features per PRD and tech spec in `src/`
- Clean, self-documenting code with proper error handling and separation of concerns
- Security at every layer: input validation, parameterized queries, CSRF/XSS protection, secrets management
- Design for scalability: stateless services, efficient queries, pagination, caching
- Write unit tests alongside code in `tests/unit/` — target 80%+ coverage on business logic
- Run linting and type-checking before reporting done
- DO NOT edit any files in `src/components/`, `src/styles/`, `src/layouts/` — those belong to Teammate 5
- Output: `src/` (business logic, routes, services, models), `tests/unit/`, `docs/tech-decisions.md`

**Agent: DevOps & UI/UX Designer (Teammate 5)**
- Read all docs from Phase 1 and Phase 2
- **Deployment:** Docker, CI/CD, environment strategy, health checks
  - Write `Dockerfile`, `docker-compose.yml`, deployment scripts
  - Configure env vars, secrets management, health check endpoints
  - Document in `docs/deployment.md`
- **UI/UX:** Modern, bold aesthetic — NOT generic
  - Glassmorphism, bento grids, micro-interactions, scroll animations as appropriate
  - Distinctive typography (Satoshi, Cabinet Grotesk, Clash Display, Plus Jakarta Sans — NOT Inter/Roboto/Arial)
  - Cohesive design system with CSS variables, consistent spacing, reusable components
  - Mobile-first responsive, dark mode if appropriate
  - Smooth transitions, skeleton loaders, hover micro-interactions
  - Accessibility: semantic HTML, ARIA labels, keyboard nav, color contrast, focus indicators
  - Document in `docs/design-system.md`
- DO NOT edit business logic files — those belong to Teammate 3
- Output: `src/components/`, `src/styles/`, `src/layouts/`, `Dockerfile`, `docker-compose.yml`, `docs/deployment.md`, `docs/design-system.md`

Wait for BOTH agents to complete. Read their outputs and check for integration issues.

### Phase 4 — Quality Assurance (Teammate 4: QA Engineer)

Spawn ONE agent. Pass it all previous docs and the source code locations.

**Agent: Senior QA Engineer (Teammate 4)**
- Read `docs/user-stories.md`, `docs/api-contracts.md`, `docs/test-plan.md` (if exists)
- Review ALL source code in `src/` and existing tests in `tests/`
- Write `docs/test-plan.md`:
  - Functional tests for every acceptance criterion
  - Edge cases, boundary values, negative tests
  - Security tests: SQL injection, XSS, auth bypass, IDOR, rate limit abuse
  - Accessibility tests, cross-browser considerations
  - Error handling: network timeout, invalid JSON, missing fields, duplicate submissions, concurrent requests
- Write integration tests in `tests/integration/`
- Write E2E tests in `tests/e2e/`
- Run ALL tests (unit + integration + e2e)
- File bugs in `docs/bugs.md` with: severity (Critical/High/Medium/Low), repro steps, expected vs actual, file:line
- Produce `docs/test-results.md` — test run summary with pass/fail counts

Wait for this agent to complete.

### Phase 5 — Bug Fixes (if needed)

If `docs/bugs.md` contains Critical or High severity bugs:
- Spawn Teammate 3 (Developer) again to fix bugs in business logic
- Spawn Teammate 5 (DevOps/UI) again to fix bugs in UI/deployment
- Then spawn Teammate 4 (QA) again to re-test fixes
- Repeat until no Critical or High bugs remain

### Phase 6 — Final Report

After QA sign-off, synthesize a final report yourself (as Team Lead):

Produce `docs/DELIVERABLES.md` with:
- Project summary and what was built
- Architecture choices and rationale
- Test results summary (pass/fail/coverage)
- Deployment instructions (how to run locally and in production)
- Known limitations and tech debt
- Recommended next steps and future enhancements

## Coordination Rules

- **File ownership is sacred.** Agents must not edit files owned by other agents. If cross-cutting changes are needed, note them and the orchestrator (you) will coordinate.
- **Security first.** Every agent must apply CLAUDE.md security requirements.
- **No shortcuts.** Each phase must complete fully before the next begins (except Phase 3 where Teammates 3 & 5 run in parallel).
- **Bug gate.** The project is NOT done until QA reports zero Critical/High bugs.
- **Communication.** Between phases, read outputs and include relevant context in the next agent's prompt. Don't just pass file paths — summarize key decisions and constraints.
