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


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
