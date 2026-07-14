import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")


class Settings:
    database_url: str

    def __init__(self) -> None:
        self.database_url = self._get_required_env("DATABASE_URL")

    @staticmethod
    def _get_required_env(name: str) -> str:
        value = os.getenv(name)
        if not value:
            raise RuntimeError(f"{name} environment variable is not configured.")
        return value


def is_production() -> bool:
    return os.getenv("APP_ENV", os.getenv("ENV", "development")).lower() in {
        "prod",
        "production",
    }


def is_debug_enabled() -> bool:
    return os.getenv("ENABLE_DEBUG_ROUTES", "").lower() in {"1", "true", "yes", "on"}


def get_backend_access_token_secret() -> str:
    secret = os.getenv("BACKEND_ACCESS_TOKEN_SECRET")
    if secret:
        return secret
    if is_production():
        raise RuntimeError(
            "BACKEND_ACCESS_TOKEN_SECRET environment variable is required in production."
        )
    return "dev-secret-change-me"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
