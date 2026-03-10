from fastapi import APIRouter

from app.core import mcp_client

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
async def health_check():
    mcp_ready = mcp_client._session is not None
    return {"status": "ok", "mcp_connected": mcp_ready}
