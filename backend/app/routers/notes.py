"""Meal Notes API routes"""
from flask import Blueprint, request, jsonify
from supabase import create_client, Client
from ..config import settings
from ..database import supabase_admin

notes_bp = Blueprint('notes', __name__)


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


MAX_CONTENT_LENGTH = 1000


@notes_bp.route('/', methods=['GET'])
def get_notes():
    """Get all notes for the user, ordered by log_date DESC"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    limit = int(request.args.get('limit', 100))
    
    response = supabase_admin.table('meal_notes').select(
        'id, user_id, log_date, content, created_at, updated_at'
    ).eq('user_id', user_id).order('log_date', desc=True).limit(limit).execute()
    
    return jsonify(response.data or [])


@notes_bp.route('/<date>', methods=['GET'])
def get_note_by_date(date):
    """Get note for a specific date"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    response = supabase_admin.table('meal_notes').select(
        'id, user_id, log_date, content, created_at, updated_at'
    ).eq('user_id', user_id).eq('log_date', date).execute()
    
    if not response.data:
        return jsonify({"detail": "Note not found"}), 404
    
    return jsonify(response.data[0])


@notes_bp.route('/', methods=['POST'])
def create_note():
    """Create a new note"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    data = request.get_json()
    content = data.get('content', '')
    
    # Validate content length
    if len(content) > MAX_CONTENT_LENGTH:
        return jsonify({"detail": f"Content must be {MAX_CONTENT_LENGTH} characters or less"}), 400
    
    log_date = data.get('log_date')
    if not log_date:
        return jsonify({"detail": "log_date is required"}), 400
    
    # Check if note already exists for this date
    # If it exists, return it instead of throwing error
    existing = supabase_admin.table('meal_notes').select(
        'id, user_id, log_date, content, created_at, updated_at'
    ).eq('user_id', user_id).eq('log_date', log_date).execute()
    
    if existing.data:
        # Note exists - return it (allows frontend to proceed with PUT updates)
        return jsonify(existing.data[0]), 200
    
    # Note doesn't exist - create it
    note_data = {
        'user_id': user_id,
        'log_date': log_date,
        'content': content
    }
    
    response = supabase_admin.table('meal_notes').insert(note_data).execute()
    
    if not response.data:
        return jsonify({"detail": "Failed to create note"}), 400
    
    return jsonify(response.data[0]), 201


@notes_bp.route('/<date>', methods=['PUT'])
def update_note(date):
    """Update an existing note"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    data = request.get_json()
    content = data.get('content', '')
    
    # Validate content length
    if len(content) > MAX_CONTENT_LENGTH:
        return jsonify({"detail": f"Content must be {MAX_CONTENT_LENGTH} characters or less"}), 400
    
    # Check if note exists
    existing = supabase_admin.table('meal_notes').select(
        'id'
    ).eq('user_id', user_id).eq('log_date', date).execute()
    
    if not existing.data:
        return jsonify({"detail": "Note not found for this date"}), 404
    
    # Update the note
    response = supabase_admin.table('meal_notes').update({
        'content': content
    }).eq('user_id', user_id).eq('log_date', date).execute()
    
    return jsonify(response.data[0])


@notes_bp.route('/<date>', methods=['DELETE'])
def delete_note(date):
    """Delete a note"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    # Check if note exists
    existing = supabase_admin.table('meal_notes').select(
        'id'
    ).eq('user_id', user_id).eq('log_date', date).execute()
    
    if not existing.data:
        return jsonify({"detail": "Note not found"}), 404
    
    supabase_admin.table('meal_notes').delete().eq('user_id', user_id).eq('log_date', date).execute()
    
    return jsonify({"message": "Note deleted successfully"})
