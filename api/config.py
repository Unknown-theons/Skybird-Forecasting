"""Configuration management with validation."""
import os
from typing import Optional
from pydantic import BaseModel, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with validation."""
    
    # Database
    database_path: str = "app.db"

    # ML model path (defaults to project root xgb_multitarget_model.pkl)
    model_path: str = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'xgb_multitarget_model.pkl'))
    
    # JWT
    jwt_secret_key: str
    jwt_access_token_expires: int = 3600  # 1 hour
    
    # CORS
    cors_origins: str = "http://localhost:8080,http://127.0.0.1:8080"
    
    @validator("cors_origins")
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    # Environment
    environment: str = "development"
    debug: bool = False
    
    # Frontend
    vite_google_maps_api_key: str = ""
    
    @validator("jwt_secret_key")
    def validate_jwt_secret(cls, v):
        if not v or v == "dev-secret-change-me":
            raise ValueError("JWT_SECRET_KEY must be set to a secure value")
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters")
        return v
    
    @validator("environment")
    def validate_environment(cls, v):
        if v not in ["development", "production", "testing"]:
            raise ValueError("Environment must be development, production, or testing")
        return v
    
    class Config:
        env_file = "../.env"
        case_sensitive = False


# Global settings instance
settings = Settings()
