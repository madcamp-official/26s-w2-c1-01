import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Header, HTTPException
from jose import JWTError, jwt

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

router = APIRouter(tags=["auth"])

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 12


def _get_env(name: str, default: Optional[str] = None) -> str:
    value = os.getenv(name, default)
    if not value:
        raise HTTPException(
            status_code=500,
            detail=f"{name} environment variable is not configured.",
        )
    return value


def _frontend_base_url() -> str:
    return os.getenv("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")


def _github_redirect_uri() -> str:
    return f"{_frontend_base_url()}/auth/github/callback"


def _create_service_access_token(user: dict[str, Any]) -> str:
    secret = _get_env("BACKEND_ACCESS_TOKEN_SECRET", "dev-secret-change-me")
    expires_at = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(user["id"]),
        "user": user,
        "exp": expires_at,
    }
    return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)


def _decode_service_access_token(token: str) -> dict[str, Any]:
    secret = _get_env("BACKEND_ACCESS_TOKEN_SECRET", "dev-secret-change-me")
    try:
        payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid access token.") from exc

    user = payload.get("user")
    if not isinstance(user, dict):
        raise HTTPException(status_code=401, detail="Invalid access token payload.")
    return user


@router.get("/auth/github/login")
def github_login():
    client_id = _get_env("GITHUB_CLIENT_ID")
    params = {
        "client_id": client_id,
        "redirect_uri": _github_redirect_uri(),
        "scope": "read:user user:email public_repo",
    }
    return {
        "redirectUrl": f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}"
    }


@router.get("/auth/github/callback")
async def github_callback(code: str):
    client_id = _get_env("GITHUB_CLIENT_ID")
    client_secret = _get_env("GITHUB_CLIENT_SECRET")

    async with httpx.AsyncClient(timeout=10.0) as client:
        token_response = await client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": _github_redirect_uri(),
            },
        )
        token_response.raise_for_status()
        token_body = token_response.json()

        github_access_token = token_body.get("access_token")
        if not github_access_token:
            raise HTTPException(
                status_code=400,
                detail=token_body.get("error_description", "GitHub access token was not returned."),
            )

        user_response = await client.get(
            GITHUB_USER_URL,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {github_access_token}",
                "User-Agent": "madcamp-resume-matcher",
            },
        )
        user_response.raise_for_status()
        github_user = user_response.json()

    user = {
        "id": github_user["id"],
        "githubId": github_user["login"],
        "name": github_user.get("name") or github_user["login"],
        "avatarUrl": github_user["avatar_url"],
    }
    return {
        "accessToken": _create_service_access_token(user),
        "user": user,
    }


@router.get("/me")
def get_me(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header is required.")

    token = authorization.removeprefix("Bearer ").strip()
    return _decode_service_access_token(token)
