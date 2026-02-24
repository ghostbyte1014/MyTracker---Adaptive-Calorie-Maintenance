"""Application configuration"""
import os

class Settings:
    """Application settings"""
    
    # App settings
    app_name: str = "MyTracker API"
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Supabase settings
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    # JWT settings
    jwt_secret: str = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    
    # CORS settings
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")
    
    def __init__(self):
        # Convert comma-separated origins to list
        if isinstance(self.cors_origins, str):
            self.cors_origins = [origin.strip() for origin in self.cors_origins.split(',')]


settings = Settings()
