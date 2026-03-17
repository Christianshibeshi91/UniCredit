"""File upload to NotebookLM via MCP."""

import logging
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from app.core import mcp_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/upload", tags=["upload"])

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx", ".doc", ".csv", ".json"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("")
async def upload_document(
    file: UploadFile = File(...),
    notebook_id: str = Form(default=""),
):
    """Upload a document to NotebookLM as a source."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not supported. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB")

    # Save to temp file for MCP upload
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Try upload_document MCP tool
        args: dict = {"file_path": tmp_path}
        if notebook_id:
            args["notebook_id"] = notebook_id

        result = await mcp_client.call_tool("upload_document", args)
        return {
            "filename": file.filename,
            "size": len(content),
            "result": result,
        }
    except Exception as e:
        # Fallback: try add_source with file content for text files
        if ext in {".txt", ".md", ".csv", ".json"}:
            try:
                text_content = content.decode("utf-8")
                args = {"content": text_content, "title": file.filename}
                if notebook_id:
                    args["notebook_id"] = notebook_id
                result = await mcp_client.call_tool("add_source", args)
                return {"filename": file.filename, "size": len(content), "result": result}
            except Exception as e2:
                raise HTTPException(status_code=502, detail=f"Upload failed: {e2}")
        raise HTTPException(status_code=502, detail=f"Upload failed: {e}")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@router.get("/supported")
async def supported_formats():
    return {
        "extensions": sorted(ALLOWED_EXTENSIONS),
        "max_size_mb": MAX_FILE_SIZE // (1024 * 1024),
    }
