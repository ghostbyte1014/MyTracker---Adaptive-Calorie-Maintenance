"""Application configuration"""
import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Supabase settings
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    # JWT settings
    jwt_secret: str = os.getenv("JWT_SECRET", "your-secret-key")
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24 * 7  # 7 days
    
    # App settings
    app_name: str = "MyTracker API"
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # CORS settings
    cors_origins: list = ["http://localhost:3000", "http://localhost:3001"]
    
    class Config:
        env_file = ".env"


settings = Settings()
