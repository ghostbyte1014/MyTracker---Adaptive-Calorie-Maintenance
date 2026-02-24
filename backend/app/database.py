"""Database connection and configuration"""
from supabase import create_client, Client
from .config import settings


def get_supabase_client() -> Client:
    """Get Supabase client"""
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise ValueError("Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.")
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def get_supabase_admin_client() -> Client:
    """Get Supabase admin client with service role key"""
    if not settings.supabase_url or not settings.supabase_service_key:
        raise ValueError("Supabase service key not configured. Please set SUPABASE_SERVICE_KEY environment variable.")
    return create_client(settings.supabase_url, settings.supabase_service_key)


# Global admin client (service role key for privileged operations)
supabase_admin = get_supabase_admin_client()
