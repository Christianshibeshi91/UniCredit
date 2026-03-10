import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core import mcp_client
from app.core.config import FRONTEND_URL, get_tailscale_ip
from app.routers import ask, health, lessons, notebooks

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting NotebookLM MCP server...")
    try:
        await mcp_client.start_mcp()
        logger.info("MCP server connected successfully")
    except Exception as e:
        logger.warning(f"MCP server failed to start: {e}. Endpoints will return 502.")
    yield
    logger.info("Shutting down MCP server...")
    await mcp_client.stop_mcp()


app = FastAPI(
    title="Tech Tutor",
    description="AI-powered study assistant backed by NotebookLM",
    lifespan=lifespan,
)

# CORS: allow frontend dev server + Tailscale access
tailscale_ip = get_tailscale_ip()
allowed_origins = [FRONTEND_URL]
if tailscale_ip:
    allowed_origins.append(f"http://{tailscale_ip}:5174")
    allowed_origins.append(f"http://{tailscale_ip}:8100")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(health.router)
app.include_router(notebooks.router)
app.include_router(ask.router)
app.include_router(lessons.router)

# Note: In production, serve frontend via nginx/reverse proxy.
# During development, frontend runs on Vite dev server (port 5174).
