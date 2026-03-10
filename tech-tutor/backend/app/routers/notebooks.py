from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core import mcp_client

router = APIRouter(prefix="/api/notebooks", tags=["notebooks"])


@router.get("")
async def list_notebooks():
    """List all available NotebookLM notebooks."""
    try:
        result = await mcp_client.call_tool("list_notebooks")
        return {"notebooks": result}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"MCP error: {e}")


class AddNotebookRequest(BaseModel):
    url: str = Field(..., min_length=1)
    name: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=1000)


@router.post("/add")
async def add_notebook(req: AddNotebookRequest):
    """Add a NotebookLM notebook by URL."""
    try:
        args: dict = {"url": req.url}
        if req.name:
            args["name"] = req.name
        if req.description:
            args["description"] = req.description
        result = await mcp_client.call_tool("add_notebook", args)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"MCP error: {e}")


class SelectNotebookRequest(BaseModel):
    notebook_id: str


@router.post("/select")
async def select_notebook(req: SelectNotebookRequest):
    """Select a notebook as the active research context."""
    try:
        result = await mcp_client.call_tool(
            "select_notebook", {"id": req.notebook_id}
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"MCP error: {e}")


@router.post("/sync")
async def sync_library():
    """Sync local library with actual NotebookLM notebooks."""
    try:
        result = await mcp_client.call_tool("sync_library")
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"MCP error: {e}")


@router.post("/auth")
async def setup_auth():
    """Trigger Google authentication flow (opens browser)."""
    try:
        result = await mcp_client.call_tool("setup_auth")
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"MCP error: {e}")


@router.get("/tools")
async def list_available_tools():
    """List all available MCP tools from the NotebookLM server."""
    try:
        tools = await mcp_client.list_tools()
        return {"tools": tools}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"MCP error: {e}")
