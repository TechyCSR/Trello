from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    database_url: str = "sqlite:///./kanban_dev.db"
    cors_origins: str = "http://localhost:5173"
    cors_origin_regex: str | None = None
    auto_seed: bool = True
    email_address: str = ""
    email_app_password: str = ""
    email_imap_host: str = "imap.gmail.com"
    email_poll_interval: int = 30

    model_config = SettingsConfigDict(env_file=str(ENV_PATH), env_file_encoding="utf-8")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
