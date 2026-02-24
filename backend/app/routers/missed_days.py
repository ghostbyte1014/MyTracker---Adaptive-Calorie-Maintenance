"""Missed days routes - Track days user forgot to log"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from datetime import date
from ..config import settings
from ..schemas import MissedDayCreate, MissedDayResponse
from ..database import supabase_admin

router = APIRouter(prefix="/missed-days", tags=["Missed Days"])
security = HTTPBearer()


def get_supabase_client() -> Client:
    """Get Supabase client"""
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Get current user ID from token"""
    supabase = get_supabase_client()
    token = credentials.credentials
    user = supabase.auth.get_user(token)
    if not user.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    return user.user.id


@router.post("/", response_model=MissedDayResponse)
async def create_missed_day(
    missed_day: MissedDayCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Record a missed day"""
    try:
        data = {
            "user_id": user_id,
            "missed_date": missed_day.missed_date.isoformat() if isinstance(missed_day.missed_date, date) else missed_day.missed_date,
            "reason": missed_day.reason or "forgot",
            "estimated_calories": missed_day.estimated_calories,
            "notes": missed_day.notes
        }
        result = supabase_admin.table("missed_days").insert(data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create missed day record"
            )
        
        return result.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=list[MissedDayResponse])
async def get_missed_days(
    user_id: str = Depends(get_current_user_id)
):
    """Get all missed days for current user"""
    try:
        result = supabase_admin.table("missed_days").select("*").eq("user_id", user_id).order("missed_date", desc=True).execute()
        return result.data or []
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{missed_day_id}")
async def delete_missed_day(
    missed_day_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a missed day record"""
    try:
        result = supabase_admin.table("missed_days").delete().eq("id", missed_day_id).eq("user_id", user_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Missed day record not found"
            )
        
        return {"message": "Missed day deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
