"""Weekly and Monthly Reports API routes"""
from flask import Blueprint, request, jsonify
from datetime import date, datetime, timedelta
from supabase import create_client, Client
from ..config import settings
from ..database import supabase_admin
from ..services.calculations import CalculationEngine
import asyncio

reports_bp = Blueprint('reports', __name__)


def get_supabase_client() -> Client:
    """Get Supabase client"""
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def get_user_from_token():
    """Extract user ID from JWT token"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, jsonify({"detail": "Missing or invalid authorization header"}), 401
    
    token = auth_header.replace('Bearer ', '')
    supabase = get_supabase_client()
    
    try:
        user = supabase.auth.get_user(token)
        if not user.user:
            return None, jsonify({"detail": "Invalid token"}), 401
        return user.user.id, None, None
    except Exception:
        return None, jsonify({"detail": "Invalid token"}), 401


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

@reports_bp.route('/weekly/current', methods=['GET'])
def get_current_week_report():
    """Get current week's report (Monday-Sunday)"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    today = date.today()
    # Find Monday of current week
    monday = today - timedelta(days=today.weekday())
    
    engine = CalculationEngine(user_id)
    report = asyncio.run(engine.run_weekly_calculations_strict(monday))
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
    
    return jsonify(report)


@reports_bp.route('/weekly/<int:year>/<int:month>/<int:day>', methods=['GET'])
def get_week_report(year, month, day):
    """Get report for a specific week (by providing any date in that week)"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    # The date provided is treated as any day in the week
    # We find the Monday of that week
    week_date = date(year, month, day)
    monday = week_date - timedelta(days=week_date.weekday())
    
    engine = CalculationEngine(user_id)
    report = asyncio.run(engine.run_weekly_calculations_strict(monday))
    report = convert_dates_to_strings(report)
    
    return jsonify(report)


@reports_bp.route('/weekly/', methods=['GET'])
def get_all_weekly_reports():
    """Get all weekly reports"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    limit = int(request.args.get('limit', 12))
    
    response = supabase_admin.table('weekly_reports').select(
        '*'
    ).eq('user_id', user_id).order('week_start', desc=True).limit(limit).execute()
    
    return jsonify(response.data or [])


# ============ MONTHLY REPORTS ============

@reports_bp.route('/monthly/current', methods=['GET'])
def get_current_month_report():
    """Get current month's report"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    today = date.today()
    engine = CalculationEngine(user_id)
    report = asyncio.run(engine.run_monthly_calculations_strict(today.year, today.month))
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
    
    return jsonify(report)


@reports_bp.route('/monthly/<int:year>/<int:month>', methods=['GET'])
def get_month_report(year, month):
    """Get report for a specific month"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    engine = CalculationEngine(user_id)
    report = asyncio.run(engine.run_monthly_calculations_strict(year, month))
    report = convert_dates_to_strings(report)
    
    return jsonify(report)


@reports_bp.route('/monthly/', methods=['GET'])
def get_all_monthly_reports():
    """Get all monthly reports"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    limit = int(request.args.get('limit', 12))
    
    response = supabase_admin.table('monthly_reports').select(
        '*'
    ).eq('user_id', user_id).order('month_start', desc=True).limit(limit).execute()
    
    return jsonify(response.data or [])


# ============ STREAKS ============

@reports_bp.route('/streaks', methods=['GET'])
def get_user_streak():
    """Get user's current streak"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    engine = CalculationEngine(user_id)
    streak_data = asyncio.run(engine.update_streak())
    
    return jsonify(streak_data)


@reports_bp.route('/streaks/refresh', methods=['POST'])
def refresh_streak():
    """Manually refresh user streak"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    engine = CalculationEngine(user_id)
    streak_data = asyncio.run(engine.update_streak())
    
    return jsonify(streak_data)


# ============ MONTHLY METRICS CALCULATION ============

@reports_bp.route('/calculate-monthly-metrics', methods=['POST'])
def calculate_monthly_metrics():
    """
    Calculate and store monthly metrics.
    POST body (optional): {"year": 2024, "month": 1} - defaults to current month
    """
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    data = request.get_json() or {}
    today = date.today()
    year = data.get('year', today.year)
    month = data.get('month', today.month)
    
    engine = CalculationEngine(user_id)
    report = asyncio.run(engine.run_monthly_calculations_strict(year, month))
    report = convert_dates_to_strings(report)
    
    month_start, month_end = engine.get_month_start_end(year, month)
    weights_response = supabase_admin.table('daily_logs').select('bodyweight').eq('user_id', user_id).gte('date', month_start.isoformat()).lte('date', month_end.isoformat()).execute()
    
    import statistics
    weights = [log['bodyweight'] for log in weights_response.data if log.get('bodyweight')]
    weight_volatility = round(statistics.stdev(weights), 3) if len(weights) >= 2 else 0.0
    
    drift_status = "STABLE"
    if report.get('weight_change') and abs(report['weight_change']) > 0.3:
        drift_status = "WARNING"
    
    total_days = (month_end - month_start).days + 1
    
    metrics_data = {
        'user_id': user_id,
        'month_start': report['month_start'],
        'avg_weight': report['avg_weight'],
        'weight_change': report['weight_change'],
        'weight_volatility': weight_volatility,
        'drift_status': drift_status,
        'total_logs': report['total_logs'],
        'total_days': total_days,
        'missed_days_count': report['missed_days'],
        'avg_calories': report['avg_calories'],
        'avg_sleep': report['avg_sleep'],
        'avg_recovery': report['avg_recovery'],
        'avg_performance': report['avg_performance'],
        'avg_stress': report['avg_stress'],
        'maintenance_estimate': report['maintenance_estimate'],
        'total_calories_in': report['total_calories_in'],
        'total_calories_burned': report['total_calories_burned']
    }
    
    supabase_admin.table('monthly_metrics').upsert(metrics_data, on_conflict='user_id,month_start').execute()
    
    report_data = {
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
    }
    
    supabase_admin.table('monthly_reports').upsert(report_data, on_conflict='user_id,month_start').execute()
    
    return jsonify({'success': True, 'year': year, 'month': month, 'metrics': metrics_data, 'report': report_data})


# ============ ADVANCED METRICS WITH DEFAULTS ============

@reports_bp.route('/advanced-metrics', methods=['GET'])
def get_advanced_metrics_with_defaults():
    """Get advanced metrics with default values for empty states"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    engine = CalculationEngine(user_id)
    metrics = asyncio.run(engine.get_advanced_metrics_with_defaults())
    
    return jsonify(metrics)


# ============ GENERATE NOTIFICATIONS ============

@reports_bp.route('/generate-notifications', methods=['POST'])
def generate_notifications():
    """Generate notifications for weekly report, monthly report, etc."""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    notifications_created = []
    today = date.today()
    engine = CalculationEngine(user_id)
    
    # 1. Check for weekly report notification (every Sunday)
    if today.weekday() == 6:  # Sunday
        # Get current week report
        monday = today - timedelta(days=today.weekday())
        report = asyncio.run(engine.run_weekly_calculations_strict(monday))
        
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
    if today.day in [28, 29, 30, 31]:
        # Check if it's the last day of month
        if today.month == 12:
            next_month = date(today.year + 1, 1, 1)
        else:
            next_month = date(today.year, today.month + 1, 1)
        last_day = next_month - timedelta(days=1)
        
        if today == last_day:
            report = asyncio.run(engine.run_monthly_calculations_strict(today.year, today.month))
            
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
    check = supabase_admin.table('daily_logs').select('id').eq('user_id', user_id).eq('date', yesterday.isoformat()).execute()
    
    if not check.data:
        # Check if user usually logs
        recent = supabase_admin.table('daily_logs').select('date').eq('user_id', user_id).gte('date', (today - timedelta(days=7)).isoformat()).execute()
        
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
    streak = asyncio.run(engine.calculate_streak())
    if streak['current_streak'] in [7, 14, 21, 30, 60, 90, 100, 180, 365]:
        notif_data = {
            'user_id': user_id,
            'type': 'milestone',
            'title': f'{streak["current_streak"]} Day Streak!',
            'message': f"Amazing! You've logged your metrics for {streak['current_streak']} days in a row!"
        }
        
        supabase_admin.table('notifications').insert(notif_data).execute()
        notifications_created.append('streak_milestone')
    
    return jsonify({
        'notifications_created': notifications_created,
        'message': f'Generated {len(notifications_created)} notification(s)'
    })


# ============ SMART TREND NOTIFICATIONS ============

@reports_bp.route('/trend-checks', methods=['POST'])
def run_trend_checks():
    """Run smart trend checks and create notifications"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    from ..services.trend_engine import TrendEngine
    
    async def run_checks():
        engine = TrendEngine(user_id)
        return await engine.create_notifications_from_trends()
    
    result = asyncio.run(run_checks())
    
    return jsonify({
        'success': True,
        'result': result
    })
