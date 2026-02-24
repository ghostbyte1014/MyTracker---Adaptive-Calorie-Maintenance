"""Daily Logs API routes"""
from flask import Blueprint, request, jsonify
from typing import List
from datetime import date, timedelta
from supabase import create_client, Client
from ..config import settings
from ..database import supabase_admin
from ..services.calculations import CalculationEngine
import asyncio

daily_logs_bp = Blueprint('daily_logs', __name__)


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


@daily_logs_bp.route('/', methods=['GET'])
def get_daily_logs():
    """Get user's daily logs"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    limit = int(request.args.get('limit', 30))
    
    query = supabase_admin.table('daily_logs').select('*').eq('user_id', user_id)
    
    if start_date:
        query = query.gte('date', start_date)
    if end_date:
        query = query.lte('date', end_date)
    
    response = query.order('date', desc=True).limit(limit).execute()
    
    return jsonify(response.data or [])


@daily_logs_bp.route('/latest', methods=['GET'])
def get_latest_log():
    """Get the most recent daily log"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    response = supabase_admin.table('daily_logs').select(
        '*'
    ).eq('user_id', user_id).order('date', desc=True).limit(1).execute()
    
    if not response.data:
        return jsonify(None)
    
    return jsonify(response.data[0])


@daily_logs_bp.route('/<log_id>', methods=['GET'])
def get_daily_log(log_id):
    """Get a specific daily log"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    response = supabase_admin.table('daily_logs').select(
        '*'
    ).eq('id', log_id).eq('user_id', user_id).execute()
    
    if not response.data:
        return jsonify({"detail": "Log not found"}), 404
    
    return jsonify(response.data[0])


@daily_logs_bp.route('/', methods=['POST'])
def create_daily_log():
    """Create a new daily log"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    data = request.get_json()
    
    # Check if log exists for this date
    log_date = data.get('date')
    existing = supabase_admin.table('daily_logs').select(
        'id'
    ).eq('user_id', user_id).eq('date', log_date).execute()
    
    if existing.data:
        return jsonify({"detail": "Log already exists for this date. Use PUT to update."}), 400
    
    # Prepare data (without calculated metrics first)
    log_data = data.copy()
    log_data['user_id'] = user_id
    
    # Insert the log first so rolling average can include it
    response = supabase_admin.table('daily_logs').insert(log_data).execute()
    
    if not response.data:
        return jsonify({"detail": "Failed to create log"}), 400
    
    # Now calculate metrics AFTER insertion (so rolling avg includes this log)
    target_date = log_date
    engine = CalculationEngine(user_id)
    calculated = asyncio.run(engine.calculate_daily_metrics(data, date.fromisoformat(target_date) if isinstance(target_date, str) else target_date))
    
    # Update the log with calculated metrics
    supabase_admin.table('daily_logs').update(calculated).eq('id', response.data[0]['id']).execute()
    
    # Get the updated log to return
    updated_response = supabase_admin.table('daily_logs').select('*').eq('id', response.data[0]['id']).execute()
    
    # Update user current weight if provided
    if data.get('bodyweight'):
        supabase_admin.table('user_settings').update({
            'current_weight': data.get('bodyweight')
        }).eq('user_id', user_id).execute()
    
    return jsonify(updated_response.data[0])


@daily_logs_bp.route('/<log_id>', methods=['PUT'])
def update_daily_log(log_id):
    """Update an existing daily log"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    data = request.get_json()
    
    # Verify ownership
    existing = supabase_admin.table('daily_logs').select(
        'date'
    ).eq('id', log_id).eq('user_id', user_id).execute()
    
    if not existing.data:
        return jsonify({"detail": "Log not found"}), 404
    
    target_date = existing.data[0]['date']
    
    # Get current log data for calculations
    current = supabase_admin.table('daily_logs').select('*').eq('id', log_id).execute()
    current_data = current.data[0] if current.data else {}
    
    # Merge with update data first
    merged_data = {**current_data, **data}
    
    # Update with the merged data first
    response = supabase_admin.table('daily_logs').update(
        data
    ).eq('id', log_id).execute()
    
    if not response.data:
        return jsonify({"detail": "Failed to update log"}), 400
    
    # Now recalculate metrics AFTER update (so rolling avg includes updated data)
    engine = CalculationEngine(user_id)
    calculated = asyncio.run(engine.calculate_daily_metrics(merged_data, target_date))
    
    # Update with calculated metrics
    supabase_admin.table('daily_logs').update(calculated).eq('id', log_id).execute()
    
    # Get the updated log to return
    updated_response = supabase_admin.table('daily_logs').select('*').eq('id', log_id).execute()
    
    return jsonify(updated_response.data[0])


@daily_logs_bp.route('/<log_id>', methods=['DELETE'])
def delete_daily_log(log_id):
    """Delete a daily log"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    # Verify ownership
    existing = supabase_admin.table('daily_logs').select(
        'id'
    ).eq('id', log_id).eq('user_id', user_id).execute()
    
    if not existing.data:
        return jsonify({"detail": "Log not found"}), 404
    
    supabase_admin.table('daily_logs').delete().eq('id', log_id).execute()
    
    return jsonify({"message": "Log deleted successfully"})


@daily_logs_bp.route('/stats/summary', methods=['GET'])
def get_log_summary():
    """Get summary statistics for daily logs"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    days = int(request.args.get('days', 7))
    start_date = date.today() - timedelta(days=days)
    
    response = supabase_admin.table('daily_logs').select(
        'bodyweight, calories_intake, calories_burned, net_calories, sleep_hours, recovery_score, workout_performance, stress_level'
    ).eq('user_id', user_id).gte('date', start_date.isoformat()).execute()
    
    if not response.data:
        return jsonify({
            "days_tracked": 0,
            "avg_weight": None,
            "avg_calories": None,
            "avg_sleep": None,
            "avg_recovery": None,
            "avg_performance": None,
            "avg_stress": None
        })
    
    logs = response.data
    
    # Calculate averages
    weights = [l['bodyweight'] for l in logs if l.get('bodyweight')]
    calories = [l['calories_intake'] for l in logs if l.get('calories_intake')]
    sleep = [l['sleep_hours'] for l in logs if l.get('sleep_hours')]
    recovery = [l['recovery_score'] for l in logs if l.get('recovery_score')]
    performance = [l['workout_performance'] for l in logs if l.get('workout_performance')]
    stress = [l['stress_level'] for l in logs if l.get('stress_level')]
    
    from statistics import mean
    
    return jsonify({
        "days_tracked": len(logs),
        "avg_weight": round(mean(weights), 2) if weights else None,
        "avg_calories": round(mean(calories)) if calories else None,
        "avg_sleep": round(mean(sleep), 1) if sleep else None,
        "avg_recovery": round(mean(recovery), 1) if recovery else None,
        "avg_performance": round(mean(performance), 1) if performance else None,
        "avg_stress": round(mean(stress), 1) if stress else None
    })
