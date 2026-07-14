import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.config import get_backend_access_token_secret
from app.models.user import User

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 12


def _get_token_secret() -> str:
    try:
        return get_backend_access_token_secret()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=500,
            detail="BACKEND_ACCESS_TOKEN_SECRET environment variable is not configured.",
        ) from exc


def create_service_access_token(user_id: int) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(user_id),
        "exp": expires_at,
    }
    return jwt.encode(payload, _get_token_secret(), algorithm=JWT_ALGORITHM)


def decode_service_access_token(token: str) -> int:
    try:
        payload = jwt.decode(token, _get_token_secret(), algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid access token.") from exc

    subject = payload.get("sub")
    if subject is None:
        raise HTTPException(status_code=401, detail="Invalid access token payload.")

    try:
        return int(subject)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid access token subject.") from exc


def get_bearer_token(authorization: Optional[str] = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header is required.")
    return authorization.removeprefix("Bearer ").strip()


def get_current_user(
    token: str = Depends(get_bearer_token),
    db: Session = Depends(get_db),
) -> User:
    user_id = decode_service_access_token(token)
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Authenticated user was not found.")
    return user
