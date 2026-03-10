# AI Computer Agent

High-performance multi-agent autonomous web research runtime. Designed to replace VPS hosting (Hostinger etc.) with a self-hosted compute environment running 50+ concurrent AI agents.

## Target VPS Spec

| Resource | Spec |
|----------|------|
| CPU | 32-64 physical cores (64-128 vCPU) |
| RAM | 128-512 GB ECC |
| Storage | 1-4 TB NVMe SSD |
| Network | 10-25 Gbps |
| GPU | Optional (only if running local LLMs) |
| OS | Ubuntu Server 22.04+ / Debian 12+ |

## Setup

```bash
cd LinkedinAutomation/vps_computer

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Set API key
export ANTHROPIC_API_KEY="your-key-here"

# Optional: configure for your hardware
export MAX_AGENTS=50          # 50 concurrent agents (default)
export MEMORY_POOL_MB=65536   # 64GB shared cache (default)
export WORKER_PROCESSES=0     # 0 = auto (cores/4)
export API_WORKERS=8          # uvicorn workers
```

## Usage

### CLI - Single Query
```bash
python cli.py "Find remote Power Platform developer jobs paying over $150k"
python cli.py "Best laptop under $2000 with 32GB RAM" -f json
python cli.py "Research top AI automation tools" -f markdown -o results.md
python cli.py "Find remote Python jobs" --visible -v
```

### CLI - Interactive Mode
```bash
python cli.py
```

### API Server
```bash
python api.py

# --- Research ---

# Async (returns task ID immediately)
curl -X POST http://localhost:8000/research \
  -H "Content-Type: application/json" \
  -d '{"query": "Find remote Power Platform developer jobs paying over $150k"}'

# Sync (blocks until complete)
curl -X POST http://localhost:8000/research/sync \
  -H "Content-Type: application/json" \
  -d '{"query": "Best laptops under $2000 with 32GB RAM"}'

# Check task status
curl http://localhost:8000/task/{task_id}

# --- Multi-Agent Management ---

# Create agents (with optional CPU core pinning)
curl -X POST http://localhost:8000/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "job-hunter", "model": "claude-sonnet-4-6", "cpu_cores": [0,1,2,3]}'

curl -X POST http://localhost:8000/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "product-researcher", "max_pages": 50}'

curl -X POST http://localhost:8000/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "openclaw-agent", "cpu_cores": [4,5,6,7]}'

# List all agents
curl http://localhost:8000/agents

# --- Parallel & Broadcast ---

# Run parallel research across agents
curl -X POST http://localhost:8000/research/parallel \
  -H "Content-Type: application/json" \
  -d '{"tasks": [
    {"agent": "job-hunter", "query": "Remote Python jobs $150k+"},
    {"agent": "product-researcher", "query": "Best 4090 laptops under $3000"},
    {"agent": "openclaw-agent", "query": "AI automation enterprise tools 2026"}
  ]}'

# Broadcast same query to ALL idle agents
curl -X POST http://localhost:8000/research/broadcast \
  -H "Content-Type: application/json" \
  -d '{"query": "Latest AI agent frameworks comparison"}'

# --- Priority Queue ---

# Queue tasks with priority (low/normal/high/critical)
curl -X POST http://localhost:8000/queue \
  -H "Content-Type: application/json" \
  -d '{"agent_name": "job-hunter", "query": "Urgent job search", "priority": "critical"}'

# --- Monitoring ---

# Full system status (CPU, RAM, disk, network, all agents, cache stats)
curl http://localhost:8000/status

# Cache statistics (hit rate, size, entries)
curl http://localhost:8000/cache/stats

# Clear cache
curl -X DELETE http://localhost:8000/cache

# Remove an agent
curl -X DELETE http://localhost:8000/agents/job-hunter

# Health check
curl http://localhost:8000/health
```

### CLI Options
| Flag | Description |
|------|-------------|
| `-f json/human/markdown` | Output format |
| `-o FILE` | Save output to file |
| `--visible` | Show browser window |
| `-v` | Verbose logging |
| `--model MODEL` | LLM model (default: claude-sonnet-4-6) |
| `--max-pages N` | Max pages to scrape (default: 50) |
| `--max-loops N` | Max research iterations (default: 5) |
| `--search-engine` | google or duckduckgo |

## Architecture

```
                    ┌──────────────────────────────────────┐
                    │         API Server (FastAPI)          │
                    │   Rate Limiting / Auth / Sanitizer    │
                    └──────────────┬───────────────────────┘
                                   │
                    ┌──────────────▼───────────────────────┐
                    │       Runtime Manager                 │
                    │  Priority Queue │ Memory Pool (64GB)  │
                    │  CPU Affinity   │ Auto-Restart        │
                    └──────┬─────────┴──────┬──────────────┘
                           │                │
              ┌────────────▼──┐    ┌────────▼──────┐
              │  Agent Slot 1 │    │  Agent Slot N  │  (up to 50+)
              │  ┌──────────┐ │    │  ┌──────────┐ │
              │  │ Browser  │ │    │  │ Browser  │ │
              │  │ Context  │ │    │  │ Context  │ │
              │  └──────────┘ │    │  └──────────┘ │
              │  ┌──────────┐ │    │  ┌──────────┐ │
              │  │ Search   │ │    │  │ Search   │ │
              │  │ Module   │ │    │  │ Module   │ │
              │  └──────────┘ │    │  └──────────┘ │
              │  ┌──────────┐ │    │  ┌──────────┐ │
              │  │ Scraper  │ │    │  │ Scraper  │ │
              │  └──────────┘ │    │  └──────────┘ │
              └───────────────┘    └───────────────┘

Each agent runs the reasoning loop:
  Plan → Search → Scrape → Extract → Assess → Summarize → Output
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | (required) | Claude API key |
| `MAX_AGENTS` | 50 | Max concurrent agent instances |
| `MEMORY_POOL_MB` | 65536 | Shared memory pool (64GB default) |
| `WORKER_PROCESSES` | auto | Queue workers (cores/4) |
| `API_WORKERS` | 8 | Uvicorn workers |
| `API_HOST` | 0.0.0.0 | API bind address |
| `API_PORT` | 8000 | API port |
| `AGENT_API_KEYS` | (none) | Comma-separated API keys for auth |

## Modules

| Module | File | Purpose |
|--------|------|---------|
| Config | `config.py` | Hardware-aware configuration |
| Agent Controller | `agent.py` | Core reasoning loop + LLM orchestration |
| Browser Controller | `browser_controller.py` | Playwright browser automation |
| Search Module | `search_module.py` | Web search execution |
| Scraper | `scraper.py` | Page content extraction |
| Data Processor | `data_processor.py` | Dedup, rank, filter |
| Output Formatter | `output_formatter.py` | JSON/human/markdown output |
| Runtime | `runtime.py` | Multi-agent runtime, 64GB memory pool, priority queue, CPU pinning |
| Security | `security.py` | Rate limiting, URL validation, auth, input sanitization |
| CLI | `cli.py` | Command-line interface |
| API | `api.py` | FastAPI REST endpoint with full multi-agent management |

## Performance Design (vs Hostinger VPS)

| Feature | Hostinger VPS | AI Computer Agent |
|---------|---------------|-------------------|
| Agents | 1-2 (RAM limited) | 50+ concurrent |
| Memory | 4-16GB shared | 4GB per agent + 64GB cache |
| CPU | 2-8 vCPU shared | 64-128 vCPU dedicated, core pinning |
| Cache | None | 64GB LRU with hit-rate tracking |
| Scheduling | Manual | Priority queue (10K capacity) |
| Recovery | Manual restart | Auto-restart on failure |
| Monitoring | Basic | Full system metrics (CPU/RAM/disk/net/per-agent) |
| Bandwidth | 1Gbps | 10-25Gbps |
| Storage | HDD/SSD | NVMe SSD |

## Security Features

- **Rate limiting**: Per-client throttling (200/min, 5000/hr, 50 burst)
- **API key auth**: Optional `X-Api-Key` header validation
- **URL validation**: Blocks internal IPs, file:// URLs, dangerous downloads
- **Input sanitization**: Query length limits, script injection prevention
- **robots.txt**: Respected by default
- **Request throttling**: Configurable delay between page requests
