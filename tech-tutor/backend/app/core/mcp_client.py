"""Singleton MCP client that communicates with the NotebookLM MCP server."""

import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

logger = logging.getLogger(__name__)

_session: ClientSession | None = None
_read_stream = None
_write_stream = None
_cm = None
_session_cm = None


async def start_mcp() -> None:
    """Start the MCP server subprocess and initialize a session."""
    global _session, _read_stream, _write_stream, _cm, _session_cm

    if _session is not None:
        return

    # Pass relevant env vars to the MCP subprocess
    mcp_env = dict(os.environ)
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    if gemini_key:
        mcp_env["GEMINI_API_KEY"] = gemini_key
    mcp_env.setdefault("NOTEBOOKLM_SHOW_BROWSER", "false")
    mcp_env["NOTEBOOKLM_PROFILE"] = "full"

    server_params = StdioServerParameters(
        command="npx",
        args=["@pan-sec/notebooklm-mcp@latest"],
        env=mcp_env,
    )

    _cm = stdio_client(server_params)
    _read_stream, _write_stream = await _cm.__aenter__()

    _session_cm = ClientSession(_read_stream, _write_stream)
    _session = await _session_cm.__aenter__()
    await _session.initialize()

    logger.info("MCP session initialized with NotebookLM server")


async def stop_mcp() -> None:
    """Gracefully shut down the MCP session and subprocess."""
    global _session, _cm, _session_cm

    if _session_cm is not None:
        try:
            await _session_cm.__aexit__(None, None, None)
        except Exception:
            pass
        _session_cm = None
        _session = None

    if _cm is not None:
        try:
            await _cm.__aexit__(None, None, None)
        except Exception:
            pass
        _cm = None


async def call_tool(name: str, arguments: dict[str, Any] | None = None, timeout: int = 60) -> Any:
    """Call an MCP tool and return its result content. Timeout in seconds."""
    if _session is None:
        raise RuntimeError("MCP session not initialized. Call start_mcp() first.")

    logger.info(f"MCP call_tool: {name}({arguments})")
    try:
        result = await asyncio.wait_for(
            _session.call_tool(name, arguments or {}),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        raise TimeoutError(f"MCP tool '{name}' timed out after {timeout}s")

    # Extract text content from result
    text = ""
    if result.content:
        texts = []
        for item in result.content:
            if hasattr(item, "text"):
                texts.append(item.text)
        text = "\n".join(texts) if texts else str(result.content)

    # Check for MCP-level errors
    if hasattr(result, "isError") and result.isError:
        logger.error(f"MCP tool '{name}' returned error: {text}")
        raise RuntimeError(f"MCP tool error: {text}")

    return text


async def list_tools() -> list[dict]:
    """List all available MCP tools."""
    if _session is None:
        raise RuntimeError("MCP session not initialized.")

    tools = await _session.list_tools()
    return [
        {"name": t.name, "description": t.description or ""}
        for t in tools.tools
    ]
