"""User Settings API routes"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from ..config import settings
from ..schemas import UserSettingsCreate, UserSettingsUpdate, UserSettingsResponse

router = APIRouter(prefix="/users", tags=["Users"])
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


@router.get("/settings", response_model=UserSettingsResponse)
async def get_user_settings(
    user_id: str = Depends(get_user_from_token)
):
    """Get user's settings"""
    from ..database import supabase_admin
    
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
    
    return response.data[0]


@router.put("/settings", response_model=UserSettingsResponse)
async def update_user_settings(
    settings_update: UserSettingsUpdate,
    user_id: str = Depends(get_user_from_token)
):
    """Update user's settings"""
    from ..database import supabase_admin
    
    # Check if settings exist
    existing = supabase_admin.table('user_settings').select(
        'id'
    ).eq('user_id', user_id).execute()
    
    update_data = settings_update.model_dump(exclude_unset=True)
    
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update settings"
        )
    
    return response.data[0]


@router.post("/settings/initialize")
async def initialize_user_settings(
    settings: UserSettingsCreate,
    user_id: str = Depends(get_user_from_token)
):
    """Initialize user settings with baseline data"""
    from ..database import supabase_admin
    
    # Check if already exists
    existing = supabase_admin.table('user_settings').select(
        'id'
    ).eq('user_id', user_id).execute()
    
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Settings already exist. Use PUT to update."
        )
    
    settings_data = settings.model_dump()
    settings_data['user_id'] = user_id
    settings_data['current_weight'] = settings_data.get('baseline_weight')
    
    response = supabase_admin.table('user_settings').insert(settings_data).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create settings"
        )
    
    return response.data[0]


@router.get("/notifications")
async def get_notifications(
    user_id: str = Depends(get_user_from_token),
    unread_only: bool = False,
    limit: int = 20
):
    """Get user notifications"""
    from ..database import supabase_admin
    
    query = supabase_admin.table('notifications').select(
        '*'
    ).eq('user_id', user_id)
    
    if unread_only:
        query = query.eq('is_read', False)
    
    response = query.order('created_at', desc=True).limit(limit).execute()
    
    return response.data


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user_id: str = Depends(get_user_from_token)
):
    """Mark a notification as read"""
    from ..database import supabase_admin
    
    # Verify ownership
    existing = supabase_admin.table('notifications').select(
        'id'
    ).eq('id', notification_id).eq('user_id', user_id).execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    supabase_admin.table('notifications').update(
        {'is_read': True}
    ).eq('id', notification_id).execute()
    
    return {"message": "Notification marked as read"}


@router.put("/notifications/read-all")
async def mark_all_notifications_read(
    user_id: str = Depends(get_user_from_token)
):
    """Mark all notifications as read"""
    from ..database import supabase_admin
    
    supabase_admin.table('notifications').update(
        {'is_read': True}
    ).eq('user_id', user_id).eq('is_read', False).execute()
    
    return {"message": "All notifications marked as read"}
