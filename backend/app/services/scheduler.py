"""Weekly Cron Job Scheduler - Automated weekly calculations"""
from datetime import date, datetime, timedelta
from typing import List
import asyncio
from ..database import supabase_admin
from .calculations import CalculationEngine


class WeeklyScheduler:
    """Handles weekly cron job for system metrics calculation"""
    
    @staticmethod
    def get_week_start(d: date = None) -> date:
        """Get the Monday of the week for a given date"""
        if d is None:
            d = date.today()
        return d - timedelta(days=d.weekday())
    
    @staticmethod
    async def run_weekly_job_for_user(user_id: str) -> dict:
        """Run weekly calculations for a specific user"""
        engine = CalculationEngine(user_id)
        
        # Get the current week's Monday
        week_start = WeeklyScheduler.get_week_start()
        
        # Check if we already have metrics for this week
        existing = supabase_admin.table('system_metrics').select(
            'id'
        ).eq('user_id', user_id).eq('week_start', week_start).execute()
        
        # Run calculations
        metrics = await engine.run_weekly_calculations(week_start)
        
        if existing.data:
            # Update existing record
            supabase_admin.table('system_metrics').update(metrics).eq(
                'id', existing.data[0]['id']
            ).execute()
        else:
            # Insert new record
            metrics['user_id'] = user_id
            supabase_admin.table('system_metrics').insert(metrics).execute()
        
        # Check for notifications
        await WeeklyScheduler.check_and_create_notifications(user_id, metrics)
        
        return metrics
    
    @staticmethod
    async def check_and_create_notifications(user_id: str, metrics: dict) -> None:
        """Check conditions and create notifications"""
        notifications = []
        
        # Drift warning
        if metrics.get('drift_status') == 'WARNING':
            notifications.append({
                'user_id': user_id,
                'type': 'drift_warning',
                'title': 'Weight Drift Detected',
                'message': f"Your weight has drifted more than 0.5kg from baseline. Current avg: {metrics.get('avg_weight')}kg"
            })
        
        # High fatigue risk
        if metrics.get('fatigue_risk_index', 0) > 7:
            notifications.append({
                'user_id': user_id,
                'type': 'high_fatigue',
                'title': 'High Fatigue Risk',
                'message': "Your fatigue risk index is high. Consider taking extra rest days."
            })
        
        # Significant weight change
        weight_change = abs(metrics.get('weight_change', 0))
        if weight_change > 0.5:
            direction = "gained" if metrics.get('weight_change', 0) > 0 else "lost"
            notifications.append({
                'user_id': user_id,
                'type': 'weight_change',
                'title': f'Significant Weight Change',
                'message': f"You've {direction} {weight_change}kg this week. Calorie adjustment: {metrics.get('calorie_adjustment')}kcal"
            })
        
        # Insert notifications
        for notif in notifications:
            supabase_admin.table('notifications').insert(notif).execute()
    
    @staticmethod
    async def run_all_users_weekly_job() -> dict:
        """Run weekly job for all active users"""
        # Get all users with settings
        users_response = supabase_admin.table('user_settings').select('user_id').execute()
        
        if not users_response.data:
            return {'processed': 0, 'results': []}
        
        results = []
        for user_data in users_response.data:
            try:
                result = await WeeklyScheduler.run_weekly_job_for_user(user_data['user_id'])
                results.append({
                    'user_id': user_data['user_id'],
                    'success': True,
                    'metrics': result
                })
            except Exception as e:
                results.append({
                    'user_id': user_data['user_id'],
                    'success': False,
                    'error': str(e)
                })
        
        return {
            'processed': len(results),
            'results': results
        }


# Background task runner (for development/testing)
async def run_weekly_job():
    """Entry point for running the weekly job"""
    result = await WeeklyScheduler.run_all_users_weekly_job()
    print(f"Weekly job completed: {result}")
    return result
