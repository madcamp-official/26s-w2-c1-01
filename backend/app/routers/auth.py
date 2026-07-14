import os
import base64
import hashlib
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.config import get_backend_access_token_secret
from app.dependencies.auth_helper import create_service_access_token, get_current_user
from app.models.user import OAuthAccount, User

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

router = APIRouter(tags=["auth"])

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"

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


def _encrypt_oauth_token(token: str) -> str:
    try:
        secret = get_backend_access_token_secret()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=500,
            detail="BACKEND_ACCESS_TOKEN_SECRET environment variable is not configured.",
        ) from exc
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode("utf-8")).digest())
    return Fernet(key).encrypt(token.encode("utf-8")).decode("utf-8")


@router.get("/auth/github/login")
def github_login():
    client_id = _get_env("GITHUB_CLIENT_ID")
    params = {
        "client_id": client_id,
        "redirect_uri": _github_redirect_uri(),
        "scope": "read:user user:email repo read:org",
        "prompt": "select_account",
    }
    return {
        "redirectUrl": f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}"
    }


@router.get("/auth/github/callback")
async def github_callback(code: str, db: Session = Depends(get_db)):
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

    github_provider_user_id = str(github_user["id"])
    github_username = github_user["login"]
    display_name = github_user.get("name") or github_username
    avatar_url = github_user["avatar_url"]

    oauth_account = db.scalar(
        select(OAuthAccount).where(
            OAuthAccount.provider == "github",
            OAuthAccount.provider_user_id == github_provider_user_id,
        )
    )

    if oauth_account is None:
        user = User(
            email=None,
            name=display_name,
            avatar_url=avatar_url,
        )
        db.add(user)
        db.flush()

        oauth_account = OAuthAccount(
            user_id=user.id,
            provider="github",
            provider_user_id=github_provider_user_id,
            provider_username=github_username,
            access_token_encrypted=_encrypt_oauth_token(github_access_token),
        )
        db.add(oauth_account)
    else:
        user = db.get(User, oauth_account.user_id)
        if user is None:
            raise HTTPException(status_code=500, detail="OAuth account is not linked to a user.")

        user.name = display_name
        user.avatar_url = avatar_url
        oauth_account.provider_username = github_username
        oauth_account.access_token_encrypted = _encrypt_oauth_token(github_access_token)

    db.commit()
    db.refresh(user)

    response_user = {
        "id": user.id,
        "githubId": github_user["login"],
        "name": user.name,
        "avatarUrl": user.avatar_url,
    }
    return {
        "accessToken": create_service_access_token(user.id),
        "user": response_user,
    }


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    github_account = db.scalar(
        select(OAuthAccount).where(
            OAuthAccount.user_id == current_user.id,
            OAuthAccount.provider == "github",
        )
    )
    return {
        "id": current_user.id,
        "githubId": github_account.provider_username if github_account else None,
        "name": current_user.name,
        "avatarUrl": current_user.avatar_url,
    }
