"""Missed days routes - Track days user forgot to log"""
from flask import Blueprint, request, jsonify
from supabase import create_client, Client
from datetime import date
from ..config import settings
from ..database import supabase_admin

missed_days_bp = Blueprint('missed_days', __name__)


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


@missed_days_bp.route('/', methods=['POST'])
def create_missed_day():
    """Record a missed day"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    data = request.get_json()
    
    try:
        missed_date = data.get('missed_date')
        if isinstance(missed_date, date):
            missed_date = missed_date.isoformat()
        
        insert_data = {
            "user_id": user_id,
            "missed_date": missed_date,
            "reason": data.get('reason') or "forgot",
            "estimated_calories": data.get('estimated_calories'),
            "notes": data.get('notes')
        }
        result = supabase_admin.table("missed_days").insert(insert_data).execute()
        
        if not result.data:
            return jsonify({"detail": "Failed to create missed day record"}), 400
        
        return jsonify(result.data[0])
    except Exception as e:
        return jsonify({"detail": str(e)}), 400


@missed_days_bp.route('/', methods=['GET'])
def get_missed_days():
    """Get all missed days for current user"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    try:
        result = supabase_admin.table("missed_days").select("*").eq("user_id", user_id).order("missed_date", desc=True).execute()
        return jsonify(result.data or [])
    except Exception as e:
        return jsonify({"detail": str(e)}), 400


@missed_days_bp.route('/<missed_day_id>', methods=['DELETE'])
def delete_missed_day(missed_day_id):
    """Delete a missed day record"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    try:
        result = supabase_admin.table("missed_days").delete().eq("id", missed_day_id).eq("user_id", user_id).execute()
        
        if not result.data:
            return jsonify({"detail": "Missed day record not found"}), 404
        
        return jsonify({"message": "Missed day deleted successfully"})
    except Exception as e:
        return jsonify({"detail": str(e)}), 400
