from fastapi import APIRouter, Header
from typing import Optional

router = APIRouter(tags=["auth"])


MOCK_USER = {
    "id": 1,
    "githubId": "terry2549",
    "name": "김태현",
    "avatarUrl": "https://github.com/terry2549.png",
}


@router.get("/auth/github/login")
def github_login():
    return {
        "redirectUrl": "http://localhost:5173/auth/github/callback?code=mock-code"
    }


@router.get("/auth/github/callback")
def github_callback(code: str):
    return {
        "accessToken": "mock-access-token",
        "user": MOCK_USER,
    }


@router.get("/me")
def get_me(authorization: Optional[str] = Header(default=None)):
    return MOCK_USER
