"""Trend Engine Service - Smart Coaching trend detection and notifications"""
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any
import statistics
from ..database import supabase_admin
from .calculations import CalculationEngine


class TrendEngine:
    """Engine for detecting trends and generating smart coaching notifications"""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.engine = CalculationEngine(user_id)
    
    # =====================================================
    # WEIGHT VOLATILITY INCREASING DETECTION
    # =====================================================
    
    async def check_weight_volatility_increase(self) -> Optional[Dict[str, Any]]:
        """
        Check if weight volatility is increasing by 15%+ compared to previous week.
        
        Returns notification data if triggered, None otherwise.
        """
        today = date.today()
        
        # Get current week and previous week metrics
        current_week_start = today - timedelta(days=today.weekday())
        prev_week_start = current_week_start - timedelta(days=7)
        
        # Get current week volatility
        current_response = supabase_admin.table('system_metrics').select(
            'weight_volatility, week_start'
        ).eq('user_id', self.user_id).eq('week_start', current_week_start.isoformat()).execute()
        
        if not current_response.data or current_response.data[0].get('weight_volatility') is None:
            return None
        
        current_volatility = current_response.data[0]['weight_volatility']
        
        # Get previous week volatility
        prev_response = supabase_admin.table('system_metrics').select(
            'weight_volatility, week_start'
        ).eq('user_id', self.user_id).eq('week_start', prev_week_start.isoformat()).execute()
        
        if not prev_response.data or prev_response.data[0].get('weight_volatility') is None:
            return None
        
        prev_volatility = prev_response.data[0]['weight_volatility']
        
        # Calculate percent change
        if prev_volatility == 0:
            return None
            
        percent_change = ((current_volatility - prev_volatility) / prev_volatility) * 100
        
        # Trigger if increased by 15%+
        if percent_change >= 15:
            # Check for duplicate notification
            if await self._has_recent_notification('weight', current_week_start.isoformat()):
                return None
            
            return {
                'type': 'trend',
                'category': 'weight',
                'severity': 'medium',
                'title': 'Weight Volatility Increasing',
                'message': f"Your weight fluctuations increased by {percent_change:.1f}% this week. Current volatility: {current_volatility}kg",
                'reference_date': current_week_start.isoformat(),
                'metadata': {
                    'current_volatility': current_volatility,
                    'previous_volatility': prev_volatility,
                    'percent_change': round(percent_change, 1)
                }
            }
        
        return None
    
    # =====================================================
    # RECOVERY DECLINING DETECTION (3-Day Trend)
    # =====================================================
    
    async def check_recovery_declining(self) -> Optional[Dict[str, Any]]:
        """
        Check if recovery_score is strictly decreasing over 3 days.
        
        Returns notification data if triggered, None otherwise.
        """
        # Get last 5 recovery scores to find 3 consecutive days
        response = supabase_admin.table('daily_logs').select(
            'recovery_score, date'
        ).eq('user_id', self.user_id).is_('recovery_score', 'not.is.null').order('date', desc=True).limit(5).execute()
        
        if not response.data or len(response.data) < 3:
            return None
        
        # Get recovery scores with dates
        recovery_data = [
            (datetime.strptime(log['date'], '%Y-%m-%d').date(), log['recovery_score'])
            for log in response.data
            if log.get('recovery_score') is not None
        ]
        
        if len(recovery_data) < 3:
            return None
        
        # Check if we have 3 consecutive days with strictly decreasing recovery
        # Need at least 3 logs on consecutive days
        consecutive_three = []
        for i in range(len(recovery_data) - 2):
            d1, r1 = recovery_data[i]
            d2, r2 = recovery_data[i + 1]
            d3, r3 = recovery_data[i + 2]
            
            # Check if consecutive days
            if (d1 - d2).days == 1 and (d2 - d3).days == 1:
                # Check if strictly decreasing
                if r1 > r2 > r3:
                    consecutive_three = [(d1, r1), (d2, r2), (d3, r3)]
                    break
        
        if not consecutive_three:
            return None
        
        # Check for duplicate - don't alert inside same 3-day window
        today = date.today()
        if await self._has_recent_notification('recovery', today.isoformat(), hours=72):
            return None
        
        return {
            'type': 'trend',
            'category': 'recovery',
            'severity': 'high',
            'title': 'Recovery Score Declining',
            'message': f"Your recovery has been declining for 3 consecutive days ({consecutive_three[2][1]} → {consecutive_three[1][1]} → {consecutive_three[0][1]}). Consider taking extra rest.",
            'reference_date': today.isoformat(),
            'metadata': {
                'recovery_scores': [r for _, r in consecutive_three],
                'dates': [d.isoformat() for d, _ in consecutive_three]
            }
        }
    
    # =====================================================
    # PERFORMANCE DROP DETECTION
    # =====================================================
    
    async def check_performance_drop(self) -> Optional[Dict[str, Any]]:
        """
        Check if 3-day average workout_performance is 10%+ lower than 7-day average.
        
        Returns notification data if triggered, None otherwise.
        """
        today = date.today()
        
        # Get last 7 days of performance data
        start_date = today - timedelta(days=6)
        response = supabase_admin.table('daily_logs').select(
            'workout_performance, date'
        ).eq('user_id', self.user_id).is_('workout_performance', 'not.null').gte('date', start_date.isoformat()).execute()
        
        if not response.data or len(response.data) < 3:
            return None
        
        # Get performance scores
        performance_data = [
            log['workout_performance']
            for log in response.data
            if log.get('workout_performance') is not None
        ]
        
        if len(performance_data) < 3:
            return None
        
        # Calculate 3-day and 7-day averages
        avg_3day = statistics.mean(performance_data[:3])
        avg_7day = statistics.mean(performance_data)
        
        # Calculate percent drop
        if avg_7day == 0:
            return None
            
        percent_drop = ((avg_7day - avg_3day) / avg_7day) * 100
        
        # Trigger if 3-day avg is 10%+ lower than 7-day avg
        if percent_drop >= 10:
            # Check for duplicate - don't alert inside same detection window (24 hours)
            if await self._has_recent_notification('performance', today.isoformat(), hours=24):
                return None
            
            return {
                'type': 'trend',
                'category': 'performance',
                'severity': 'high',
                'title': 'Performance Drop Detected',
                'message': f"Your recent workout performance is {percent_drop:.1f}% below your 7-day average. 3-day avg: {avg_3day:.1f}, 7-day avg: {avg_7day:.1f}. Check your recovery and sleep.",
                'reference_date': today.isoformat(),
                'metadata': {
                    'avg_3day': round(avg_3day, 1),
                    'avg_7day': round(avg_7day, 1),
                    'percent_drop': round(percent_drop, 1)
                }
            }
        
        return None
    
    # =====================================================
    # HELPER METHODS
    # =====================================================
    
    async def _has_recent_notification(
        self, 
        category: str, 
        reference_date: str, 
        hours: int = None
    ) -> bool:
        """
        Check if a notification with same category and reference_date already exists.
        
        Args:
            category: The notification category
            reference_date: The reference date to check
            hours: If provided, also check if notification was created within this many hours
            
        Returns:
            True if duplicate exists, False otherwise
        """
        query = supabase_admin.table('notifications').select(
            'id, created_at'
        ).eq('user_id', self.user_id).eq('category', category).eq('reference_date', reference_date)
        
        response = query.execute()
        
        if not response.data:
            return False
        
        # If hours specified, also check creation time
        if hours:
            for notif in response.data:
                created_at = datetime.fromisoformat(notif['created_at'].replace('+00:00', ''))
                now = datetime.now()
                if (now - created_at).total_seconds() / 3600 < hours:
                    return True
        
        return True
    
    async def run_all_trend_checks(self) -> List[Dict[str, Any]]:
        """
        Run all trend checks and return list of triggered notifications.
        
        Returns:
            List of notification data dictionaries
        """
        notifications = []
        
        # Check weight volatility
        weight_notif = await self.check_weight_volatility_increase()
        if weight_notif:
            notifications.append(weight_notif)
        
        # Check recovery declining
        recovery_notif = await self.check_recovery_declining()
        if recovery_notif:
            notifications.append(recovery_notif)
        
        # Check performance drop
        performance_notif = await self.check_performance_drop()
        if performance_notif:
            notifications.append(performance_notif)
        
        return notifications
    
    async def create_notifications_from_trends(self) -> Dict[str, Any]:
        """
        Run all trend checks and create notifications in database.
        
        Returns:
            Summary of notifications created
        """
        notifications = await self.run_all_trend_checks()
        
        created = []
        for notif_data in notifications:
            # Add user_id
            notif_data['user_id'] = self.user_id
            
            # Insert into database
            result = supabase_admin.table('notifications').insert(notif_data).execute()
            
            if result.data:
                created.append({
                    'type': notif_data['type'],
                    'category': notif_data['category'],
                    'title': notif_data['title']
                })
        
        return {
            'total_trends_checked': 3,
            'notifications_created': len(created),
            'notifications': created
        }


# =====================================================
# STANDALONE FUNCTIONS FOR SCHEDULER
# =====================================================

async def run_trend_checks_for_user(user_id: str) -> Dict[str, Any]:
    """Run trend checks for a specific user"""
    engine = TrendEngine(user_id)
    return await engine.create_notifications_from_trends()


async def run_trend_checks_for_all_users() -> Dict[str, Any]:
    """Run trend checks for all active users"""
    # Get all users with settings
    users_response = supabase_admin.table('user_settings').select('user_id').execute()
    
    if not users_response.data:
        return {'processed': 0, 'results': []}
    
    results = []
    for user_data in users_response.data:
        try:
            result = await run_trend_checks_for_user(user_data['user_id'])
            results.append({
                'user_id': user_data['user_id'],
                'success': True,
                'result': result
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
