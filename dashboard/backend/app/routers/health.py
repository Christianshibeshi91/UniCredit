from fastapi import APIRouter
from app.core.config import DATABASE_PATH

router = APIRouter(tags=["health"])


@router.get("/api/health")
async def health():
    return {
        "status": "ok",
        "database": DATABASE_PATH.exists(),
    }
