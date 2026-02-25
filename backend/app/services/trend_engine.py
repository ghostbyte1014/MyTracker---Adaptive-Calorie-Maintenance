"""Trend Engine Service - Smart Coaching notification triggers"""
from datetime import date, datetime, timedelta
from typing import List, Optional
from ..database import supabase_admin
import statistics


class TrendEngine:
    """Engine for detecting trends and creating smart notifications"""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
    
    def _check_duplicate_notification(self, category: str, reference_date: str) -> bool:
        """Check if a notification of same category and reference_date already exists"""
        existing = supabase_admin.table('notifications').select('id').eq(
            'user_id', self.user_id
        ).eq('category', category).eq('reference_date', reference_date).execute()
        
        return len(existing.data) > 0 if existing.data else False
    
    def _create_notification(self, notification_type: str, category: str, severity: str,
                           title: str, message: str, reference_date: str, 
                           metadata: dict = None) -> bool:
        """Create a notification if it doesn't already exist"""
        # Check for duplicates
        if self._check_duplicate_notification(category, reference_date):
            return False
        
        notif_data = {
            'user_id': self.user_id,
            'type': notification_type,
            'category': category,
            'severity': severity,
            'title': title,
            'message': message,
            'reference_date': reference_date,
        }
        
        if metadata:
            notif_data['metadata'] = metadata
        
        supabase_admin.table('notifications').insert(notif_data).execute()
        return True
    
    async def check_weight_volatility_increasing(self) -> bool:
        """
        Check if weight volatility is increasing by 15%+ compared to previous week.
        
        Uses system_metrics.weight_volatility and system_metrics.prev_weight_volatility
        """
        # Get current week and previous week metrics
        today = date.today()
        current_week_start = today - timedelta(days=today.weekday())
        
        current = supabase_admin.table('system_metrics').select(
            'weight_volatility, prev_weight_volatility, week_start'
        ).eq('user_id', self.user_id).eq('week_start', current_week_start.isoformat()).execute()
        
        if not current.data or not current.data[0].get('weight_volatility'):
            return False
        
        current_vol = current.data[0]['weight_volatility']
        prev_vol = current.data[0].get('prev_weight_volatility')
        
        if not prev_vol or prev_vol == 0:
            return False
        
        # Calculate percentage change
        percent_change = ((current_vol - prev_vol) / prev_vol) * 100
        
        if percent_change >= 15:
            metadata = {
                'current_volatility': current_vol,
                'previous_volatility': prev_vol,
                'percent_change': round(percent_change, 1)
            }
            
            return self._create_notification(
                notification_type='trend',
                category='weight',
                severity='medium',
                title='Weight Volatility Increasing',
                message=f"Your weight fluctuation has increased by {round(percent_change)}% compared to last week. Current volatility: {current_vol}kg",
                reference_date=current_week_start.isoformat(),
                metadata=metadata
            )
        
        return False
    
    async def check_recovery_declining(self) -> bool:
        """
        Check if recovery score is strictly decreasing over 3 days.
        
        Uses daily_logs.recovery_score
        """
        # Get last 5 days of recovery scores
        start_date = date.today() - timedelta(days=4)
        
        response = supabase_admin.table('daily_logs').select(
            'date, recovery_score'
        ).eq('user_id', self.user_id).gte('date', start_date.isoformat()).order('date', desc=True).execute()
        
        if not response.data:
            return False
        
        # Extract recovery scores
        recovery_data = [(log['date'], log['recovery_score']) 
                        for log in response.data 
                        if log.get('recovery_score') is not None]
        
        if len(recovery_data) < 3:
            return False
        
        # Sort by date ascending for trend analysis
        recovery_data.sort(key=lambda x: x[0])
        scores = [r[1] for r in recovery_data]
        
        # Check if strictly decreasing (each day lower than previous)
        is_declining = all(scores[i] > scores[i+1] for i in range(len(scores)-1))
        
        # Also ensure we have at least 3 consecutive decreasing days
        if is_declining and len(scores) >= 3:
            # Check if we've already notified in this 3-day window
            today_str = date.today().isoformat()
            yesterday_str = (date.today() - timedelta(days=1)).isoformat()
            
            if self._check_duplicate_notification('recovery', today_str):
                return False
            
            if self._check_duplicate_notification('recovery', yesterday_str):
                return False
            
            metadata = {
                'recovery_scores': scores[-3:],
                'trend': 'declining'
            }
            
            return self._create_notification(
                notification_type='trend',
                category='recovery',
                severity='high',
                title='Recovery Score Declining',
                message=f"Your recovery scores have been declining: {scores[-3:]}. Consider taking extra rest days.",
                reference_date=today_str,
                metadata=metadata
            )
        
        return False
    
    async def check_performance_drop(self) -> bool:
        """
        Check if 3-day average workout performance is 10%+ lower than 7-day average.
        
        Uses daily_logs.workout_performance
        """
        today = date.today()
        
        # Get last 7 days
        start_date_7d = today - timedelta(days=6)
        response_7d = supabase_admin.table('daily_logs').select(
            'date, workout_performance'
        ).eq('user_id', self.user_id).gte('date', start_date_7d.isoformat()).order('date', desc=True).execute()
        
        # Get last 3 days
        start_date_3d = today - timedelta(days=2)
        response_3d = supabase_admin.table('daily_logs').select(
            'date, workout_performance'
        ).eq('user_id', self.user_id).gte('date', start_date_3d.isoformat()).order('date', desc=True).execute()
        
        if not response_7d.data or not response_3d.data:
            return False
        
        # Extract performance scores
        perf_7d = [log['workout_performance'] for log in response_7d.data 
                   if log.get('workout_performance') is not None]
        perf_3d = [log['workout_performance'] for log in response_3d.data 
                   if log.get('workout_performance') is not None]
        
        if len(perf_7d) < 3 or len(perf_3d) < 3:
            return False
        
        avg_7d = statistics.mean(perf_7d)
        avg_3d = statistics.mean(perf_3d)
        
        # Calculate percentage drop
        if avg_7d > 0:
            percent_drop = ((avg_7d - avg_3d) / avg_7d) * 100
            
            if percent_drop >= 10:
                # Check for duplicates
                today_str = today.isoformat()
                if self._check_duplicate_notification('performance', today_str):
                    return False
                
                metadata = {
                    '3day_avg': round(avg_3d, 1),
                    '7day_avg': round(avg_7d, 1),
                    'percent_drop': round(percent_drop, 1)
                }
                
                return self._create_notification(
                    notification_type='trend',
                    category='performance',
                    severity='high',
                    title='Performance Drop Detected',
                    message=f"Your recent workout performance has dropped by {round(percent_drop)}% compared to your 7-day average.",
                    reference_date=today_str,
                    metadata=metadata
                )
        
        return False
    
    async def run_all_trend_checks(self) -> dict:
        """Run all trend checks and return results"""
        results = {
            'weight_volatility': await self.check_weight_volatility_increasing(),
            'recovery_declining': await self.check_recovery_declining(),
            'performance_drop': await self.check_performance_drop()
        }
        
        return results
    
    async def create_notifications_from_trends(self) -> dict:
        """Run all trend checks and create notifications - wrapper for daily_logs router"""
        results = await self.run_all_trend_checks()
        return results


# Helper function to run trend checks for a user
async def check_and_create_trend_notifications(user_id: str) -> dict:
    """Entry point for running all trend checks for a user"""
    engine = TrendEngine(user_id)
    results = await engine.run_all_trend_checks()
    return results
