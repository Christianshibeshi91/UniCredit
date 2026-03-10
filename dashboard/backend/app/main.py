from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.core.config import FRONTEND_URL
from app.core.database import init_db
from app.routers import auth, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    # Import here to avoid circular — Phase 2+ services register here
    try:
        from app.services.sheets_sync import start_sync
        await start_sync()
    except ImportError:
        pass  # Phase 2 not yet built
    yield
    # Shutdown


app = FastAPI(title="Anti-gravity Dashboard", version="1.0.0", lifespan=lifespan)

# CORS for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(health.router)

# Phase 2+ routers registered dynamically
_phase_routers = [
    ("app.routers.jobs", "router"),
    ("app.routers.analytics", "router"),
    ("app.routers.follow_ups", "router"),
    ("app.routers.settings_router", "router"),
    ("app.routers.intake", "router"),
    ("app.routers.content", "router"),
    ("app.routers.errors", "router"),
    ("app.routers.automation", "router"),
    ("app.routers.ws", "router"),
]

for module_path, attr_name in _phase_routers:
    try:
        import importlib
        mod = importlib.import_module(module_path)
        app.include_router(getattr(mod, attr_name))
    except (ImportError, AttributeError):
        pass  # Router not yet built

# Serve React SPA — static assets + catch-all for client-side routing
_frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if _frontend_dist.exists():
    from fastapi.responses import FileResponse

    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=str(_frontend_dist / "assets")), name="assets")

    # Catch-all: serve index.html for any non-API route (SPA routing)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # If a file exists in dist, serve it directly
        file_path = _frontend_dist / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        # Otherwise serve index.html for client-side routing
        return FileResponse(str(_frontend_dist / "index.html"))
