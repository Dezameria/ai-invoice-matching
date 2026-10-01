"""Configuration module using pydantic-settings."""

from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AIVA PO-INV Matching Service"
    APP_ENV: str = "development"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True

    # LiteLLM Vision
    LITELLM_URL: str = "http://10.10.3.112:4000/v1"
    LITELLM_API_KEY: str = "sk-placeholder"
    LITELLM_MODEL: str = "deepseek-v4-flash"
    LITELLM_TIMEOUT_SECONDS: float = 60.0

    # Oracle EBS ORDS MCP
    ORACLE_MCP_URL: str = "http://ahebs.aapico.com:8080/mcp"
    ORACLE_MCP_TOKEN: str = ""
    ORACLE_MCP_TIMEOUT_SECONDS: float = 60.0

    # Paperless-ngx
    PAPERLESS_BASE_URL: str = "http://localhost:8000"
    PAPERLESS_API_TOKEN: str = "your_paperless_token_here"
    PAPERLESS_TAG_INVOICE_ID: int = 5
    PAPERLESS_TAG_CHECKED_ID: int = 12
    PAPERLESS_TIMEOUT_SECONDS: float = 30.0

    # Portal API
    PORTAL_API_URL: str = "https://httpbin.org/post"
    PORTAL_API_TOKEN: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
