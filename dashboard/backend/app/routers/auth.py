from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    clear_auth_cookies,
    create_access_token,
    create_refresh_token,
    hash_password,
    require_auth,
    set_auth_cookies,
    validate_refresh_token,
    verify_password,
)
from app.core.database import get_session
from app.models.user import LoginRequest, User

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
async def login(body: LoginRequest, response: Response, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token()
    refresh_token = create_refresh_token() if body.remember_me else None
    set_auth_cookies(response, access_token, refresh_token)

    return {"status": "ok", "username": user.username}


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    validate_refresh_token(token)
    access_token = create_access_token()
    set_auth_cookies(response, access_token)

    return {"status": "ok"}


@router.post("/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"status": "ok"}


@router.get("/me", dependencies=[Depends(require_auth)])
async def me(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="No user configured")
    return {"username": user.username}
