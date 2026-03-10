import json
from pathlib import Path
from fastapi import APIRouter, Depends

from app.core.auth import require_auth
from app.core.config import CANDIDATE_DIR

router = APIRouter(prefix="/api/intake", tags=["intake"], dependencies=[Depends(require_auth)])

INTAKE_PATH = CANDIDATE_DIR / "intake_form.json"
LEARNED_PATH = CANDIDATE_DIR / "learned_answers.json"


def _read_json(path: Path) -> dict:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {}


def _write_json(path: Path, data: dict):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


@router.get("")
async def get_intake():
    return _read_json(INTAKE_PATH)


@router.put("")
async def update_intake(body: dict):
    _write_json(INTAKE_PATH, body)
    return {"status": "ok"}


@router.get("/learned")
async def get_learned():
    return _read_json(LEARNED_PATH)


@router.put("/learned")
async def update_learned(body: dict):
    _write_json(LEARNED_PATH, body)
    return {"status": "ok"}


@router.get("/unanswered")
async def get_unanswered():
    intake = _read_json(INTAKE_PATH)
    return {k: v for k, v in intake.items() if not v or v == ""}
