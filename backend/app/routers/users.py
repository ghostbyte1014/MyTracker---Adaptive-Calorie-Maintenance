"""User Settings API routes"""
from flask import Blueprint, request, jsonify
from supabase import create_client, Client
from ..config import settings
from ..database import supabase_admin

users_bp = Blueprint('users', __name__)


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


@users_bp.route('/settings', methods=['GET'])
def get_user_settings():
    """Get user's settings"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    response = supabase_admin.table('user_settings').select(
        '*'
    ).eq('user_id', user_id).execute()
    
    if not response.data:
        # Create default settings
        default_settings = {
            "user_id": user_id,
            "baseline_weight": None,
            "initial_target_calories": 2000,
            "current_weight": None,
            "target_weight": None,
            "activity_level": "moderate",
            "goal": "maintain"
        }
        response = supabase_admin.table('user_settings').insert(default_settings).execute()
    
    return jsonify(response.data[0])


@users_bp.route('/settings', methods=['PUT'])
def update_user_settings():
    """Update user's settings"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    data = request.get_json()
    
    # Check if settings exist
    existing = supabase_admin.table('user_settings').select(
        'id'
    ).eq('user_id', user_id).execute()
    
    update_data = {k: v for k, v in data.items() if v is not None}
    
    if existing.data:
        # Update existing
        response = supabase_admin.table('user_settings').update(
            update_data
        ).eq('user_id', user_id).execute()
    else:
        # Create new
        update_data['user_id'] = user_id
        response = supabase_admin.table('user_settings').insert(update_data).execute()
    
    if not response.data:
        return jsonify({"detail": "Failed to update settings"}), 400
    
    return jsonify(response.data[0])


@users_bp.route('/settings/initialize', methods=['POST'])
def initialize_user_settings():
    """Initialize user settings with baseline data"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    data = request.get_json()
    
    # Check if already exists
    existing = supabase_admin.table('user_settings').select(
        'id'
    ).eq('user_id', user_id).execute()
    
    if existing.data:
        return jsonify({"detail": "Settings already exist. Use PUT to update."}), 400
    
    settings_data = data.copy()
    settings_data['user_id'] = user_id
    settings_data['current_weight'] = settings_data.get('baseline_weight')
    
    response = supabase_admin.table('user_settings').insert(settings_data).execute()
    
    if not response.data:
        return jsonify({"detail": "Failed to create settings"}), 400
    
    return jsonify(response.data[0])


@users_bp.route('/notifications', methods=['GET'])
def get_notifications():
    """Get user notifications"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    limit = int(request.args.get('limit', 20))
    
    query = supabase_admin.table('notifications').select(
        '*'
    ).eq('user_id', user_id)
    
    if unread_only:
        query = query.eq('is_read', False)
    
    response = query.order('created_at', desc=True).limit(limit).execute()
    
    return jsonify(response.data or [])


@users_bp.route('/notifications/<notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    # Verify ownership
    existing = supabase_admin.table('notifications').select(
        'id'
    ).eq('id', notification_id).eq('user_id', user_id).execute()
    
    if not existing.data:
        return jsonify({"detail": "Notification not found"}), 404
    
    supabase_admin.table('notifications').update(
        {'is_read': True}
    ).eq('id', notification_id).execute()
    
    return jsonify({"message": "Notification marked as read"})


@users_bp.route('/notifications/read-all', methods=['PUT'])
def mark_all_notifications_read():
    """Mark all notifications as read"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    supabase_admin.table('notifications').update(
        {'is_read': True}
    ).eq('user_id', user_id).eq('is_read', False).execute()
    
    return jsonify({"message": "All notifications marked as read"})
