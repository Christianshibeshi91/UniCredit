from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request, Response, status
from pwdlib import PasswordHash

from app.core.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS,
    SECRET_KEY,
)

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return password_hash.verify(plain, hashed)


def create_access_token() -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"exp": expire, "type": "access"}, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token() -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"exp": expire, "type": "refresh"}, SECRET_KEY, algorithm=ALGORITHM)


def set_auth_cookies(response: Response, access_token: str, refresh_token: str | None = None):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    if refresh_token:
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            samesite="lax",
            max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            path="/api/auth/refresh",
        )


def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/auth/refresh")


def _decode_token(token: str, expected_type: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != expected_type:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def require_auth(request: Request):
    """Dependency: validates access token from httpOnly cookie."""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    _decode_token(token, "access")


def validate_refresh_token(token: str) -> dict:
    return _decode_token(token, "refresh")
