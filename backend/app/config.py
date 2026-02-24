"""Application configuration"""
import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    # Supabase settings
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    
    # JWT settings
    jwt_secret: str = "your-secret-key"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24 * 7  # 7 days
    
    # App settings
    app_name: str = "MyTracker API"
    debug: bool = False
    
    # CORS settings
    cors_origins: list = ["http://localhost:3000", "http://localhost:3001"]


settings = Settings()
