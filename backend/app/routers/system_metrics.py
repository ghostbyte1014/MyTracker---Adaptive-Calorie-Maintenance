"""System Metrics API routes"""
from flask import Blueprint, request, jsonify
from typing import List
from datetime import date, datetime
from supabase import create_client, Client
from ..config import settings
from ..database import supabase_admin
from ..services.calculations import CalculationEngine
from ..services.scheduler import WeeklyScheduler
import asyncio

system_metrics_bp = Blueprint('system_metrics', __name__)


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


@system_metrics_bp.route('/', methods=['GET'])
def get_system_metrics():
    """Get user's system metrics history"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    limit = int(request.args.get('limit', 12))
    
    response = supabase_admin.table('system_metrics').select(
        '*'
    ).eq('user_id', user_id).order('week_start', desc=True).limit(limit).execute()
    
    return jsonify(response.data or [])


@system_metrics_bp.route('/latest', methods=['GET'])
def get_latest_metrics():
    """Get the most recent system metrics"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    response = supabase_admin.table('system_metrics').select(
        '*'
    ).eq('user_id', user_id).order('week_start', desc=True).limit(1).execute()
    
    if not response.data:
        return jsonify(None)
    
    return jsonify(response.data[0])


@system_metrics_bp.route('/<week_start>', methods=['GET'])
def get_metrics_by_week(week_start):
    """Get system metrics for a specific week"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    response = supabase_admin.table('system_metrics').select(
        '*'
    ).eq('user_id', user_id).eq('week_start', week_start).execute()
    
    if not response.data:
        return jsonify({"detail": "Metrics not found for this week"}), 404
    
    return jsonify(response.data[0])


@system_metrics_bp.route('/trigger-weekly', methods=['POST'])
def trigger_weekly_calculation():
    """Manually trigger weekly calculations for the current week"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    try:
        result = asyncio.run(WeeklyScheduler.run_weekly_job_for_user(user_id))
        
        # Convert any date objects to strings for JSON serialization
        if result:
            result = convert_dates_to_strings(result)
        
        return jsonify({
            "success": True,
            "message": "Weekly calculations completed",
            "metrics": result
        })
    except Exception as e:
        return jsonify({"detail": str(e)}), 500


@system_metrics_bp.route('/advanced/volatility', methods=['GET'])
def get_weight_volatility():
    """Get weight volatility (standard deviation)"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    days = int(request.args.get('days', 30))
    engine = CalculationEngine(user_id)
    volatility = asyncio.run(engine.get_weight_volatility(days))
    
    return jsonify({
        "metric": "weight_volatility",
        "value": volatility,
        "description": "Standard deviation of weight over the period",
        "unit": "kg",
        "period_days": days
    })


@system_metrics_bp.route('/advanced/surplus-accuracy', methods=['GET'])
def get_surplus_accuracy():
    """Get surplus accuracy percentage"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    target_surplus = int(request.args.get('target_surplus', 0))
    engine = CalculationEngine(user_id)
    accuracy = asyncio.run(engine.get_surplus_accuracy(target_surplus))
    
    return jsonify({
        "metric": "surplus_accuracy",
        "value": accuracy,
        "description": "How close daily net calories are to target surplus",
        "unit": "%",
        "target_surplus": target_surplus
    })


@system_metrics_bp.route('/advanced/maintenance-precision', methods=['GET'])
def get_maintenance_precision():
    """Get maintenance precision percentage"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    engine = CalculationEngine(user_id)
    precision = asyncio.run(engine.get_maintenance_precision())
    
    return jsonify({
        "metric": "maintenance_precision",
        "value": precision,
        "description": "How close target calories are to calculated maintenance",
        "unit": "%"
    })


@system_metrics_bp.route('/advanced/recovery-performance', methods=['GET'])
def get_recovery_performance_consistency():
    """Get recovery-performance consistency score"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    engine = CalculationEngine(user_id)
    score = asyncio.run(engine.get_recovery_performance_consistency())
    
    return jsonify({
        "metric": "recovery_performance_consistency",
        "value": score,
        "description": "Correlation between recovery and workout performance",
        "unit": "score",
        "scale": "0-100"
    })


@system_metrics_bp.route('/advanced/stress-resilience', methods=['GET'])
def get_stress_resilience():
    """Get stress resilience score"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    engine = CalculationEngine(user_id)
    score = asyncio.run(engine.get_stress_resilience_score())
    
    return jsonify({
        "metric": "stress_resilience",
        "value": score,
        "description": "Recovery ability under high stress conditions",
        "unit": "score",
        "scale": "0-100"
    })


@system_metrics_bp.route('/advanced/all', methods=['GET'])
def get_all_advanced_metrics():
    """Get all advanced metrics at once"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    engine = CalculationEngine(user_id)
    
    volatility = asyncio.run(engine.get_weight_volatility(30))
    surplus_accuracy = asyncio.run(engine.get_surplus_accuracy(0))
    maintenance_precision = asyncio.run(engine.get_maintenance_precision())
    recovery_perf = asyncio.run(engine.get_recovery_performance_consistency())
    stress_resilience = asyncio.run(engine.get_stress_resilience_score())
    
    return jsonify({
        "weight_volatility": volatility,
        "surplus_accuracy": surplus_accuracy,
        "maintenance_precision": maintenance_precision,
        "recovery_performance_consistency": recovery_perf,
        "stress_resilience": stress_resilience
    })


@system_metrics_bp.route('/week', methods=['GET'])
def get_metrics_by_iso_week():
    """Get system metrics for ISO week format (YYYY-WW). Query: ?week=2024-01"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    week_param = request.args.get('week')
    if not week_param:
        return jsonify({"detail": "Week parameter required (format: YYYY-WW)"}), 400
    
    try:
        parts = week_param.split('-')
        if len(parts) != 2:
            return jsonify({"detail": "Invalid format. Use YYYY-WW (e.g., 2024-01)"}), 400
        
        year, week_number = int(parts[0]), int(parts[1])
        from datetime import timedelta
        jan_4 = date(year, 1, 4)
        week_1_start = jan_4 - timedelta(days=jan_4.weekday())
        target_monday = week_1_start + timedelta(weeks=week_number - 1)
        
        existing = supabase_admin.table('system_metrics').select('*').eq('user_id', user_id).eq('week_start', target_monday.isoformat()).execute()
        if existing.data:
            return jsonify(existing.data[0])
        
        engine = CalculationEngine(user_id)
        metrics = asyncio.run(engine.run_weekly_calculations(target_monday))
        metrics['weight_volatility'] = asyncio.run(engine.get_weight_volatility(7))
        
        prev_week = target_monday - timedelta(days=7)
        prev = supabase_admin.table('system_metrics').select('weight_volatility').eq('user_id', user_id).eq('week_start', prev_week.isoformat()).execute()
        metrics['prev_weight_volatility'] = prev.data[0]['weight_volatility'] if prev.data else None
        
        metrics['user_id'] = user_id
        supabase_admin.table('system_metrics').insert(metrics).execute()
        return jsonify(metrics)
    except Exception as e:
        return jsonify({"detail": f"Error: {str(e)}"}), 500
