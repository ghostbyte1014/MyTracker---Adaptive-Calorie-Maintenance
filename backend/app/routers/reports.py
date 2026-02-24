"""Weekly and Monthly Reports API routes"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
from datetime import date, datetime, timedelta
from supabase import create_client, Client
from ..config import settings
from ..services.calculations import CalculationEngine

router = APIRouter(prefix="/reports", tags=["Reports"])
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


# ============ WEEKLY REPORTS ============

@router.get("/weekly/current")
async def get_current_week_report(
    user_id: str = Depends(get_user_from_token)
):
    """Get current week's report (Monday-Sunday)"""
    from ..database import supabase_admin
    
    today = date.today()
    # Find Monday of current week
    monday = today - timedelta(days=today.weekday())
    
    engine = CalculationEngine(user_id)
    report = await engine.run_weekly_calculations_strict(monday)
    report = convert_dates_to_strings(report)
    
    # Save to database
    supabase_admin.table('weekly_reports').upsert({
        'user_id': user_id,
        'week_start': report['week_start'],
        'week_end': report['week_end'],
        'avg_weight': report['avg_weight'],
        'weight_change': report['weight_change'],
        'total_logs': report['total_logs'],
        'missed_days': report['missed_days'],
        'missed_dates': report['missed_dates'],
        'avg_calories': report['avg_calories'],
        'total_calories_in': report['total_calories_in'],
        'total_calories_burned': report['total_calories_burned'],
        'avg_sleep': report['avg_sleep'],
        'avg_recovery': report['avg_recovery'],
        'avg_performance': report['avg_performance'],
        'avg_stress': report['avg_stress'],
        'maintenance_estimate': report['maintenance_estimate'],
        'calorie_adjustment': report['calorie_adjustment'],
        'drift_status': report['drift_status'],
        'performance_correlation': report['performance_correlation'],
        'fatigue_risk_index': report['fatigue_risk_index'],
        'summary_text': report['summary_text']
    }, on_conflict='user_id,week_start').execute()
    
    return report


@router.get("/weekly/{year}/{month}/{day}")
async def get_week_report(
    year: int,
    month: int,
    day: int,
    user_id: str = Depends(get_user_from_token)
):
    """Get report for a specific week (by providing any date in that week)"""
    from ..database import supabase_admin
    from datetime import timedelta
    
    # The date provided is treated as any day in the week
    # We find the Monday of that week
    week_date = date(year, month, day)
    monday = week_date - timedelta(days=week_date.weekday())
    
    engine = CalculationEngine(user_id)
    report = await engine.run_weekly_calculations_strict(monday)
    report = convert_dates_to_strings(report)
    
    return report


@router.get("/weekly/")
async def get_all_weekly_reports(
    user_id: str = Depends(get_user_from_token),
    limit: int = 12
):
    """Get all weekly reports"""
    from ..database import supabase_admin
    
    response = supabase_admin.table('weekly_reports').select(
        '*'
    ).eq('user_id', user_id).order('week_start', desc=True).limit(limit).execute()
    
    return response.data


# ============ MONTHLY REPORTS ============

@router.get("/monthly/current")
async def get_current_month_report(
    user_id: str = Depends(get_user_from_token)
):
    """Get current month's report"""
    from ..database import supabase_admin
    
    today = date.today()
    engine = CalculationEngine(user_id)
    report = await engine.run_monthly_calculations_strict(today.year, today.month)
    report = convert_dates_to_strings(report)
    
    # Save to database
    supabase_admin.table('monthly_reports').upsert({
        'user_id': user_id,
        'month_start': report['month_start'],
        'month_end': report['month_end'],
        'avg_weight': report['avg_weight'],
        'weight_change': report['weight_change'],
        'total_logs': report['total_logs'],
        'missed_days': report['missed_days'],
        'missed_dates': report['missed_dates'],
        'avg_calories': report['avg_calories'],
        'total_calories_in': report['total_calories_in'],
        'total_calories_burned': report['total_calories_burned'],
        'avg_sleep': report['avg_sleep'],
        'avg_recovery': report['avg_recovery'],
        'avg_performance': report['avg_performance'],
        'avg_stress': report['avg_stress'],
        'maintenance_estimate': report['maintenance_estimate'],
        'summary_text': report['summary_text']
    }, on_conflict='user_id,month_start').execute()
    
    return report


@router.get("/monthly/{year}/{month}")
async def get_month_report(
    year: int,
    month: int,
    user_id: str = Depends(get_user_from_token)
):
    """Get report for a specific month"""
    engine = CalculationEngine(user_id)
    report = await engine.run_monthly_calculations_strict(year, month)
    report = convert_dates_to_strings(report)
    
    return report


@router.get("/monthly/")
async def get_all_monthly_reports(
    user_id: str = Depends(get_user_from_token),
    limit: int = 12
):
    """Get all monthly reports"""
    from ..database import supabase_admin
    
    response = supabase_admin.table('monthly_reports').select(
        '*'
    ).eq('user_id', user_id).order('month_start', desc=True).limit(limit).execute()
    
    return response.data


# ============ STREAKS ============

@router.get("/streaks")
async def get_user_streak(
    user_id: str = Depends(get_user_from_token)
):
    """Get user's current streak"""
    from ..database import supabase_admin
    
    engine = CalculationEngine(user_id)
    streak_data = await engine.update_streak()
    
    return streak_data


@router.post("/streaks/refresh")
async def refresh_streak(
    user_id: str = Depends(get_user_from_token)
):
    """Manually refresh user streak"""
    from ..database import supabase_admin
    
    engine = CalculationEngine(user_id)
    streak_data = await engine.update_streak()
    
    return streak_data


# ============ ADVANCED METRICS WITH DEFAULTS ============

@router.get("/advanced-metrics")
async def get_advanced_metrics_with_defaults(
    user_id: str = Depends(get_user_from_token)
):
    """Get advanced metrics with default values for empty states"""
    engine = CalculationEngine(user_id)
    metrics = await engine.get_advanced_metrics_with_defaults()
    
    return metrics


# ============ GENERATE NOTIFICATIONS ============

@router.post("/generate-notifications")
async def generate_notifications(
    user_id: str = Depends(get_user_from_token)
):
    """Generate notifications for weekly report, monthly report, etc."""
    from ..database import supabase_admin
    from datetime import timedelta
    
    notifications_created = []
    today = date.today()
    engine = CalculationEngine(user_id)
    
    # 1. Check for weekly report notification (every Sunday)
    if today.weekday() == 6:  # Sunday
        # Get current week report
        monday = today - timedelta(days=today.weekday())
        report = await engine.run_weekly_calculations_strict(monday)
        
        # Create notification
        notif_data = {
            'user_id': user_id,
            'type': 'weekly_report',
            'title': 'Weekly Report Ready',
            'message': f"Your weekly summary is ready. {report['summary_text']}"
        }
        
        result = supabase_admin.table('notifications').insert(notif_data).execute()
        notifications_created.append('weekly_report')
    
    # 2. Check for monthly report notification (last day of month)
    if today.day == 28 or today.day == 29 or today.day == 30 or today.day == 31:
        # Check if it's the last day of month
        if today.month == 12:
            next_month = date(today.year + 1, 1, 1)
        else:
            next_month = date(today.year, today.month + 1, 1)
        last_day = next_month - timedelta(days=1)
        
        if today == last_day:
            report = await engine.run_monthly_calculations_strict(today.year, today.month)
            
            notif_data = {
                'user_id': user_id,
                'type': 'monthly_report',
                'title': 'Monthly Report Ready',
                'message': f"Your monthly summary is ready. {report['summary_text']}"
            }
            
            supabase_admin.table('notifications').insert(notif_data).execute()
            notifications_created.append('monthly_report')
    
    # 3. Check for missed day reminder (if yesterday was not logged)
    yesterday = today - timedelta(days=1)
    check = supabase_admin.table('daily_logs').select('id').eq('user_id', user_id).eq('date', yesterday).execute()
    
    if not check.data:
        # Check if user usually logs
        recent = supabase_admin.table('daily_logs').select('date').eq('user_id', user_id).gte('date', today - timedelta(days=7)).execute()
        
        if recent.data and len(recent.data) >= 3:
            # User logs regularly but missed yesterday
            notif_data = {
                'user_id': user_id,
                'type': 'reminder',
                'title': 'Forgot to log yesterday?',
                'message': "Don't forget to log your daily metrics. Keep your streak going!"
            }
            
            supabase_admin.table('notifications').insert(notif_data).execute()
            notifications_created.append('reminder')
    
    # 4. Check for streak milestones
    streak = await engine.calculate_streak()
    if streak['current_streak'] in [7, 14, 21, 30, 60, 90, 100, 180, 365]:
        notif_data = {
            'user_id': user_id,
            'type': 'milestone',
            'title': f'{streak["current_streak"]} Day Streak!',
            'message': f"Amazing! You've logged your metrics for {streak['current_streak']} days in a row!"
        }
        
        supabase_admin.table('notifications').insert(notif_data).execute()
        notifications_created.append('streak_milestone')
    
    return {
        'notifications_created': notifications_created,
        'message': f'Generated {len(notifications_created)} notification(s)'
    }
