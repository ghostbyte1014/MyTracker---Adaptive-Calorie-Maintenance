"""Database connection and configuration"""
from supabase import create_client, Client
from .config import settings


def get_supabase_client() -> Client:
    """Get Supabase client"""
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise ValueError("Supabase credentials not configured")
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def get_supabase_admin_client() -> Client:
    """Get Supabase admin client with service role key"""
    if not settings.supabase_url or not settings.supabase_service_key:
        raise ValueError("Supabase service key not configured")
    return create_client(settings.supabase_url, settings.supabase_service_key)


# Global client instance
supabase: Client = get_supabase_client()
supabase_admin: Client = get_supabase_admin_client()
