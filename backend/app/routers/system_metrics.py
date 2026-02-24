"""System Metrics API routes"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
from datetime import date, datetime
from supabase import create_client, Client
from ..config import settings
from ..schemas import SystemMetricsResponse, SystemMetricsUpdate
from ..services.calculations import CalculationEngine
from ..services.scheduler import WeeklyScheduler

router = APIRouter(prefix="/system-metrics", tags=["System Metrics"])
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


def convert_dates_to_strings(obj):
    """Recursively convert date/datetime objects to ISO format strings"""
    if isinstance(obj, date):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: convert_dates_to_strings(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_dates_to_strings(item) for item in obj]
    return obj


@router.get("/", response_model=List[SystemMetricsResponse])
async def get_system_metrics(
    user_id: str = Depends(get_user_from_token),
    limit: int = 12
):
    """Get user's system metrics history"""
    from ..database import supabase_admin
    
    response = supabase_admin.table('system_metrics').select(
        '*'
    ).eq('user_id', user_id).order('week_start', desc=True).limit(limit).execute()
    
    return response.data


@router.get("/latest")
async def get_latest_metrics(
    user_id: str = Depends(get_user_from_token)
):
    """Get the most recent system metrics"""
    from ..database import supabase_admin
    
    response = supabase_admin.table('system_metrics').select(
        '*'
    ).eq('user_id', user_id).order('week_start', desc=True).limit(1).execute()
    
    if not response.data:
        return None
    
    return response.data[0]


@router.get("/{week_start}", response_model=SystemMetricsResponse)
async def get_metrics_by_week(
    week_start: date,
    user_id: str = Depends(get_user_from_token)
):
    """Get system metrics for a specific week"""
    from ..database import supabase_admin
    
    response = supabase_admin.table('system_metrics').select(
        '*'
    ).eq('user_id', user_id).eq('week_start', week_start).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Metrics not found for this week"
        )
    
    return response.data[0]


@router.post("/trigger-weekly")
async def trigger_weekly_calculation(
    user_id: str = Depends(get_user_from_token)
):
    """Manually trigger weekly calculations for the current week"""
    try:
        result = await WeeklyScheduler.run_weekly_job_for_user(user_id)
        
        # Convert any date objects to strings for JSON serialization
        if result:
            result = convert_dates_to_strings(result)
        
        return {
            "success": True,
            "message": "Weekly calculations completed",
            "metrics": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/advanced/volatility")
async def get_weight_volatility(
    user_id: str = Depends(get_user_from_token),
    days: int = 30
):
    """Get weight volatility (standard deviation)"""
    engine = CalculationEngine(user_id)
    volatility = await engine.get_weight_volatility(days)
    
    return {
        "metric": "weight_volatility",
        "value": volatility,
        "description": "Standard deviation of weight over the period",
        "unit": "kg",
        "period_days": days
    }


@router.get("/advanced/surplus-accuracy")
async def get_surplus_accuracy(
    user_id: str = Depends(get_user_from_token),
    target_surplus: int = 0
):
    """Get surplus accuracy percentage"""
    engine = CalculationEngine(user_id)
    accuracy = await engine.get_surplus_accuracy(target_surplus)
    
    return {
        "metric": "surplus_accuracy",
        "value": accuracy,
        "description": "How close daily net calories are to target surplus",
        "unit": "%",
        "target_surplus": target_surplus
    }


@router.get("/advanced/maintenance-precision")
async def get_maintenance_precision(
    user_id: str = Depends(get_user_from_token)
):
    """Get maintenance precision percentage"""
    engine = CalculationEngine(user_id)
    precision = await engine.get_maintenance_precision()
    
    return {
        "metric": "maintenance_precision",
        "value": precision,
        "description": "How close target calories are to calculated maintenance",
        "unit": "%"
    }


@router.get("/advanced/recovery-performance")
async def get_recovery_performance_consistency(
    user_id: str = Depends(get_user_from_token)
):
    """Get recovery-performance consistency score"""
    engine = CalculationEngine(user_id)
    score = await engine.get_recovery_performance_consistency()
    
    return {
        "metric": "recovery_performance_consistency",
        "value": score,
        "description": "Correlation between recovery and workout performance",
        "unit": "score",
        "scale": "0-100"
    }


@router.get("/advanced/stress-resilience")
async def get_stress_resilience(
    user_id: str = Depends(get_user_from_token)
):
    """Get stress resilience score"""
    engine = CalculationEngine(user_id)
    score = await engine.get_stress_resilience_score()
    
    return {
        "metric": "stress_resilience",
        "value": score,
        "description": "Recovery ability under high stress conditions",
        "unit": "score",
        "scale": "0-100"
    }


@router.get("/advanced/all")
async def get_all_advanced_metrics(
    user_id: str = Depends(get_user_from_token)
):
    """Get all advanced metrics at once"""
    engine = CalculationEngine(user_id)
    
    volatility = await engine.get_weight_volatility(30)
    surplus_accuracy = await engine.get_surplus_accuracy(0)
    maintenance_precision = await engine.get_maintenance_precision()
    recovery_perf = await engine.get_recovery_performance_consistency()
    stress_resilience = await engine.get_stress_resilience_score()
    
    return {
        "weight_volatility": volatility,
        "surplus_accuracy": surplus_accuracy,
        "maintenance_precision": maintenance_precision,
        "recovery_performance_consistency": recovery_perf,
        "stress_resilience": stress_resilience
    }
