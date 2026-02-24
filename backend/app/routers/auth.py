"""Authentication routes using Supabase with Google OAuth"""
import os
from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse
from supabase import create_client, Client
from ..config import settings
from ..schemas import AuthResponse, LoginRequest, RegisterRequest, UserSettingsCreate

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

# Frontend URL for OAuth redirect - supports multiple ports
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3001")


def get_supabase_client() -> Client:
    """Get Supabase client"""
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@router.post("/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """Register a new user"""
    supabase = get_supabase_client()
    
    try:
        # Sign up the user
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
        })
        
        if auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
        
        # Create user settings with default values
        from ..database import supabase_admin
        supabase_admin.table("user_settings").insert({
            "user_id": auth_response.user.id,
            "baseline_weight": None,
            "initial_target_calories": 2000,
            "current_weight": None
        }).execute()
        
        # Use session directly from auth_response (may be None if email confirmation is enabled)
        if auth_response.session is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create session"
            )
        
        return AuthResponse(
            access_token=auth_response.session.access_token,
            token_type="bearer",
            user={
                "id": auth_response.user.id,
                "email": auth_response.user.email
            }
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login user"""
    supabase = get_supabase_client()
    
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password,
        })
        
        if auth_response.user is None or auth_response.session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        return AuthResponse(
            access_token=auth_response.session.access_token,
            token_type="bearer",
            user={
                "id": auth_response.user.id,
                "email": auth_response.user.email
            }
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )


@router.get("/google")
async def google_sign_in():
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
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to generate Google sign-in URL"
            )
        
        # Return the auth URL to the frontend
        return {
            "url": auth_url.url
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google sign-in error: {str(e)}"
        )


@router.get("/callback")
async def google_callback(code: str = Query(...)):
    """Handle Google OAuth callback and exchange code for session"""
    supabase = get_supabase_client()
    
    try:
        # Exchange code for session
        auth_response = supabase.auth.exchange_code_for_session(code)
        
        if auth_response.user is None or auth_response.session is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create session from OAuth code"
            )
        
        # Check if user exists in user_settings, if not create
        from ..database import supabase_admin
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
        return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?access_token={auth_response.session.access_token}&token_type=bearer")
    
    except Exception as e:
        # Redirect to frontend with error
        return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?error={str(e)}")


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Logout user"""
    supabase = get_supabase_client()
    
    try:
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception:
        return {"message": "Logged out"}


@router.get("/me")
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user info"""
    supabase = get_supabase_client()
    
    try:
        token = credentials.credentials
        user = supabase.auth.get_user(token)
        
        if not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        return {
            "id": user.user.id,
            "email": user.user.email,
            "created_at": user.user.created_at
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
