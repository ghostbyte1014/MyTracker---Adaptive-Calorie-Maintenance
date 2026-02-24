"""Daily Logs API routes"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
from datetime import date, timedelta
from supabase import create_client, Client
from ..config import settings
from ..schemas import (
    DailyLogCreate, 
    DailyLogUpdate, 
    DailyLogResponse,
    UserSettingsUpdate
)
from ..services.calculations import CalculationEngine
from ..services.scheduler import WeeklyScheduler

router = APIRouter(prefix="/daily-logs", tags=["Daily Logs"])
security = HTTPBearer()


def get_user_from_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Extract user ID from JWT token"""
    supabase = create_client(settings.supabase_url, settings.supabase_anon_key)
    token = credentials.credentials
    
    try:
        user = supabase.auth.get_user(token)
        if not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        return user.user.id
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


@router.get("/", response_model=List[DailyLogResponse])
async def get_daily_logs(
    user_id: str = Depends(get_user_from_token),
    start_date: date = None,
    end_date: date = None,
    limit: int = 30
):
    """Get user's daily logs"""
    from ..database import supabase_admin
    
    query = supabase_admin.table('daily_logs').select('*').eq('user_id', user_id)
    
    if start_date:
        query = query.gte('date', start_date)
    if end_date:
        query = query.lte('date', end_date)
    
    response = query.order('date', desc=True).limit(limit).execute()
    
    return response.data


@router.get("/latest")
async def get_latest_log(
    user_id: str = Depends(get_user_from_token)
):
    """Get the most recent daily log"""
    from ..database import supabase_admin
    
    response = supabase_admin.table('daily_logs').select(
        '*'
    ).eq('user_id', user_id).order('date', desc=True).limit(1).execute()
    
    if not response.data:
        return None
    
    return response.data[0]


@router.get("/{log_id}", response_model=DailyLogResponse)
async def get_daily_log(
    log_id: str,
    user_id: str = Depends(get_user_from_token)
):
    """Get a specific daily log"""
    from ..database import supabase_admin
    
    response = supabase_admin.table('daily_logs').select(
        '*'
    ).eq('id', log_id).eq('user_id', user_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log not found"
        )
    
    return response.data[0]


@router.post("/", response_model=DailyLogResponse)
async def create_daily_log(
    log: DailyLogCreate,
    user_id: str = Depends(get_user_from_token)
):
    """Create a new daily log"""
    from ..database import supabase_admin
    
    # Check if log exists for this date
    existing = supabase_admin.table('daily_logs').select(
        'id'
    ).eq('user_id', user_id).eq('date', log.date).execute()
    
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Log already exists for this date. Use PUT to update."
        )
    
    # Calculate metrics
    engine = CalculationEngine(user_id)
    calculated = await engine.calculate_daily_metrics(log.model_dump(), log.date)
    
    # Prepare data
    log_data = log.model_dump()
    log_data.update(calculated)
    log_data['user_id'] = user_id
    
    # Convert date to string for JSON serialization
    if isinstance(log_data.get('date'), date):
        log_data['date'] = log_data['date'].isoformat()
    
    # Insert
    response = supabase_admin.table('daily_logs').insert(log_data).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create log"
        )
    
    # Update user current weight if provided
    if log.bodyweight:
        supabase_admin.table('user_settings').update({
            'current_weight': log.bodyweight
        }).eq('user_id', user_id).execute()
    
    return response.data[0]


@router.put("/{log_id}", response_model=DailyLogResponse)
async def update_daily_log(
    log_id: str,
    log: DailyLogUpdate,
    user_id: str = Depends(get_user_from_token)
):
    """Update an existing daily log"""
    from ..database import supabase_admin
    
    # Verify ownership
    existing = supabase_admin.table('daily_logs').select(
        'date'
    ).eq('id', log_id).eq('user_id', user_id).execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log not found"
        )
    
    target_date = existing.data[0]['date']
    
    # Get current log data for calculations
    current = supabase_admin.table('daily_logs').select('*').eq('id', log_id).execute()
    current_data = current.data[0] if current.data else {}
    
    # Merge with update data
    merged_data = {**current_data, **log.model_dump(exclude_unset=True)}
    
    # Recalculate metrics
    engine = CalculationEngine(user_id)
    calculated = await engine.calculate_daily_metrics(merged_data, target_date)
    
    update_data = log.model_dump(exclude_unset=True)
    update_data.update(calculated)
    
    # Update
    response = supabase_admin.table('daily_logs').update(
        update_data
    ).eq('id', log_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update log"
        )
    
    return response.data[0]


@router.delete("/{log_id}")
async def delete_daily_log(
    log_id: str,
    user_id: str = Depends(get_user_from_token)
):
    """Delete a daily log"""
    from ..database import supabase_admin
    
    # Verify ownership
    existing = supabase_admin.table('daily_logs').select(
        'id'
    ).eq('id', log_id).eq('user_id', user_id).execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log not found"
        )
    
    supabase_admin.table('daily_logs').delete().eq('id', log_id).execute()
    
    return {"message": "Log deleted successfully"}


@router.get("/stats/summary")
async def get_log_summary(
    user_id: str = Depends(get_user_from_token),
    days: int = 7
):
    """Get summary statistics for daily logs"""
    from ..database import supabase_admin
    
    start_date = date.today() - timedelta(days=days)
    
    response = supabase_admin.table('daily_logs').select(
        'bodyweight, calories_intake, calories_burned, net_calories, sleep_hours, recovery_score, workout_performance, stress_level'
    ).eq('user_id', user_id).gte('date', start_date).execute()
    
    if not response.data:
        return {
            "days_tracked": 0,
            "avg_weight": None,
            "avg_calories": None,
            "avg_sleep": None,
            "avg_recovery": None,
            "avg_performance": None,
            "avg_stress": None
        }
    
    logs = response.data
    
    # Calculate averages
    weights = [l['bodyweight'] for l in logs if l.get('bodyweight')]
    calories = [l['calories_intake'] for l in logs if l.get('calories_intake')]
    sleep = [l['sleep_hours'] for l in logs if l.get('sleep_hours')]
    recovery = [l['recovery_score'] for l in logs if l.get('recovery_score')]
    performance = [l['workout_performance'] for l in logs if l.get('workout_performance')]
    stress = [l['stress_level'] for l in logs if l.get('stress_level')]
    
    from statistics import mean
    
    return {
        "days_tracked": len(logs),
        "avg_weight": round(mean(weights), 2) if weights else None,
        "avg_calories": round(mean(calories)) if calories else None,
        "avg_sleep": round(mean(sleep), 1) if sleep else None,
        "avg_recovery": round(mean(recovery), 1) if recovery else None,
        "avg_performance": round(mean(performance), 1) if performance else None,
        "avg_stress": round(mean(stress), 1) if stress else None
    }
