"""Authentication routes using Supabase with Google OAuth"""
import os
from flask import Blueprint, request, jsonify, redirect
from supabase import create_client, Client
from ..config import settings
from ..database import supabase_admin

auth_bp = Blueprint('auth', __name__)

# Frontend URL for OAuth redirect
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3001")


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


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"detail": "Email and password required"}), 400
    
    supabase = get_supabase_client()
    
    try:
        # Sign up the user
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password,
        })
        
        if auth_response.user is None:
            return jsonify({"detail": "Failed to create user"}), 400
        
        # Create user settings with default values
        supabase_admin.table("user_settings").insert({
            "user_id": auth_response.user.id,
            "baseline_weight": None,
            "initial_target_calories": 2000,
            "current_weight": None
        }).execute()
        
        # Use session directly from auth_response (may be None if email confirmation is enabled)
        if auth_response.session is None:
            return jsonify({"detail": "Failed to create session - check email for confirmation"}), 400
        
        return jsonify({
            "access_token": auth_response.session.access_token,
            "token_type": "bearer",
            "user": {
                "id": auth_response.user.id,
                "email": auth_response.user.email
            }
        })
    
    except Exception as e:
        return jsonify({"detail": str(e)}), 400


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"detail": "Email and password required"}), 401
    
    supabase = get_supabase_client()
    
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })
        
        if auth_response.user is None or auth_response.session is None:
            return jsonify({"detail": "Invalid credentials"}), 401
        
        return jsonify({
            "access_token": auth_response.session.access_token,
            "token_type": "bearer",
            "user": {
                "id": auth_response.user.id,
                "email": auth_response.user.email
            }
        })
    
    except Exception as e:
        return jsonify({"detail": "Invalid credentials"}), 401


@auth_bp.route('/google', methods=['GET'])
def google_sign_in():
    """Initiate Google OAuth sign-in flow"""
    supabase = get_supabase_client()
    
    try:
        # Build the redirect URL
        redirect_to = f"{FRONTEND_URL}/auth/callback"
        
        # Generate Google OAuth URL
        auth_url = supabase.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {
                "redirect_to": redirect_to,
                "scopes": "email profile openid"
            }
        })
        
        if not auth_url.url:
            return jsonify({"detail": "Failed to generate Google sign-in URL"}), 400
        
        # Return the auth URL to the frontend
        return jsonify({
            "url": auth_url.url
        })
    
    except Exception as e:
        return jsonify({"detail": f"Google sign-in error: {str(e)}"}), 400


@auth_bp.route('/callback', methods=['GET'])
def google_callback():
    """Handle Google OAuth callback and exchange code for session"""
    code = request.args.get('code')
    
    if not code:
        return redirect(f"{FRONTEND_URL}/auth/callback?error=No code provided")
    
    supabase = get_supabase_client()
    
    try:
        # Exchange code for session
        auth_response = supabase.auth.exchange_code_for_session(code)
        
        if auth_response.user is None or auth_response.session is None:
            return redirect(f"{FRONTEND_URL}/auth/callback?error=Failed to create session")
        
        # Check if user exists in user_settings, if not create
        try:
            existing_settings = supabase_admin.table("user_settings").select("*").eq("user_id", auth_response.user.id).execute()
            
            if not existing_settings.data or len(existing_settings.data) == 0:
                # Create user settings with default values for new OAuth users
                supabase_admin.table("user_settings").insert({
                    "user_id": auth_response.user.id,
                    "baseline_weight": None,
                    "initial_target_calories": 2000,
                    "current_weight": None
                }).execute()
        except Exception:
            pass  # Settings might already exist
        
        # Redirect to frontend with success
        return redirect(f"{FRONTEND_URL}/auth/callback?access_token={auth_response.session.access_token}&token_type=bearer")
    
    except Exception as e:
        # Redirect to frontend with error
        return redirect(f"{FRONTEND_URL}/auth/callback?error={str(e)}")


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout user"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    supabase = get_supabase_client()
    
    try:
        supabase.auth.sign_out()
        return jsonify({"message": "Logged out successfully"})
    except Exception:
        return jsonify({"message": "Logged out"})


@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Get current user info"""
    user_id, error_response, status_code = get_user_from_token()
    if error_response:
        return error_response
    
    supabase = get_supabase_client()
    
    try:
        auth_header = request.headers.get('Authorization')
        token = auth_header.replace('Bearer ', '')
        user = supabase.auth.get_user(token)
        
        if not user.user:
            return jsonify({"detail": "Invalid token"}), 401
        
        return jsonify({
            "id": user.user.id,
            "email": user.user.email,
            "created_at": user.user.created_at
        })
    except Exception as e:
        return jsonify({"detail": "Invalid token"}), 401
