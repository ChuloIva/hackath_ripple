"""
Configuration - Environment Settings

Manages environment variables and application settings.
"""

from pydantic import Field
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Gemini API Configuration
    gemini_api_key: str = Field(..., description="Google Gemini API key")
    gemini_model: str = Field(
        default="gemini-1.5-flash",
        description="Gemini model to use"
    )
    max_output_tokens: int = Field(
        default=2048,
        description="Maximum tokens in response"
    )

    # Server Configuration
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    reload: bool = Field(default=True, description="Auto-reload on code changes")

    # Storage Configuration
    artifact_storage_path: str = Field(
        default="./backend/storage/artifacts",
        description="Path to store artifacts"
    )

    # CORS Configuration
    cors_origins: list[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8080",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:8080"
        ],
        description="Allowed CORS origins"
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False
    }


# Global settings instance
settings = Settings()


# Validation on import
if __name__ == "__main__":
    print("Configuration loaded successfully!")
    print(f"Gemini Model: {settings.gemini_model}")
    print(f"Server: {settings.host}:{settings.port}")
    print(f"Artifact Storage: {settings.artifact_storage_path}")
    print(f"CORS Origins: {settings.cors_origins}")
