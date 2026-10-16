"""
BuildWise AI — Application Configuration

All configuration is loaded from environment variables (pydantic-settings).
Never hardcode secrets or environment-specific values here.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Priority order (highest to lowest):
    1. Actual environment variables
    2. .env file
    3. Default values defined here
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── Application ──────────────────────────────────────
    app_name: str = "BuildWise AI"
    app_version: str = "0.1.0"
    app_env: Literal["development", "production", "test"] = "development"
    debug: bool = False
    api_prefix: str = "/api/v1"

    # ─── Database ─────────────────────────────────────────
    database_url: str = Field(
        default="postgresql+asyncpg://buildwise_user:changeme@localhost:5432/buildwise",
        description="Async PostgreSQL connection URL",
    )
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_timeout: int = 30
    db_echo: bool = False  # Set True to log all SQL queries (dev only)

    # ─── File Storage ─────────────────────────────────────
    storage_path: Path = Path("/app/storage")
    max_upload_size_mb: int = 50

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    # ─── CORS ─────────────────────────────────────────────
    cors_origins: str = (
        "http://localhost:5173,http://localhost:3000,http://localhost:80,http://localhost,"
        "http://127.0.0.1:5173,http://127.0.0.1:3000,http://127.0.0.1:80,http://127.0.0.1"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    # ─── Gemini LLM Provider ──────────────────────────────
    gemini_api_key: str = Field(default="", description="Primary Gemini API key")
    gemini_api_key_2: str = Field(default="", description="Optional second API key (second Google project)")
    gemini_api_key_3: str = Field(default="", description="Optional third API key (third Google project)")

    # Model pool — round-robin across these 3
    gemini_model_1: str = "gemini-3.8-flash"
    gemini_model_2: str = "gemini-3.6-flash"
    gemini_model_3: str = "gemini-3.5-flash-lite"

    gemini_max_retries: int = 3
    gemini_request_timeout_seconds: int = 30
    gemini_max_output_tokens: int = 2048

    @property
    def gemini_model_pool(self) -> list[dict]:
        """
        Returns the configured model pool as a list of {model_id, api_key} dicts.
        If secondary keys are not set, uses the primary key for all models.
        """
        primary_key = self.gemini_api_key
        return [
            {
                "model_id": self.gemini_model_1,
                "api_key": self.gemini_api_key or primary_key,
            },
            {
                "model_id": self.gemini_model_2,
                "api_key": self.gemini_api_key_2 or primary_key,
            },
            {
                "model_id": self.gemini_model_3,
                "api_key": self.gemini_api_key_3 or primary_key,
            },
        ]

    @property
    def llm_available(self) -> bool:
        """True if at least one API key is configured."""
        return bool(self.gemini_api_key)

    # ─── Embeddings ───────────────────────────────────────
    embedding_model: str = "BAAI/bge-large-en-v1.5"
    embedding_dimension: int = 1024

    # ─── Authentication (disabled by default) ─────────────
    auth_enabled: bool = False
    jwt_secret_key: str = "change_this_to_a_random_secret"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # ─── Rate Limiting ────────────────────────────────────
    rate_limit_requests_per_minute: int = 60
    rate_limit_upload_per_minute: int = 10

    # ─── Validation ───────────────────────────────────────
    @field_validator("storage_path", mode="before")
    @classmethod
    def validate_storage_path(cls, v: str | Path) -> Path:
        return Path(v)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Returns cached application settings.
    Use this function everywhere — do NOT import Settings directly.
    
    Usage:
        from app.config import get_settings
        settings = get_settings()
    """
    return Settings()
