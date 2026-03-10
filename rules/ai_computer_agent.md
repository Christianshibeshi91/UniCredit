# Rule: AI Computer Agent Research (v1)

## Goal
Execute high-performance autonomous web research using the local AI Computer Agent cluster/VPS.

## Required Inputs
- `query`: Natural language research query.
- `agent_name`: (Optional) Target agent slot (default: "default").
- `max_pages`: (Optional) Max pages to scrape (default: 50).
- `max_loops`: (Optional) Max reasoning iterations (default: 5).

## Orchestration (Brain)
1. **Check Connectivity**: Ensure the AI Computer Agent API is running at `http://localhost:8000`.
2. **Execute Research**: 
   - For synchronous results: Call `POST /research/sync`.
   - For long-running tasks: Call `POST /research` (async) and poll `/task/{task_id}`.
3. **Handle Failure**: 
   - If API down: Check Docker status of `ai-computer-agent`.
   - If research fails: Check logs and increase timeouts or max iterations.

## Implementation Details
- **API Server**: `LinkedinAutomation/vps_computer/api.py`
- **Docker Compose**: `LinkedinAutomation/vps_computer/docker-compose.yml`
- **CLI Client**: `LinkedinAutomation/vps_computer/cli.py`

## Expected Outputs
- Structured JSON result containing:
  - `query`: The original query.
  - `summary`: Natural language summary of findings.
  - `results`: List of extracted items with URLs.
  - `metadata`: Execution stats (iterations, pages scraped).

## Edge Cases
- **Google Bot Detection**: If search results are zero, try increasing `request_delay` in `config.py` or use a search engine with better bot tolerance.
- **Memory Pressure**: Monitor `status` endpoint to ensure the 64GB memory pool is not exhausted.
- **LLM Timeout**: Ensure Ollama is responsive; large models (70B+) may require high timeouts.
