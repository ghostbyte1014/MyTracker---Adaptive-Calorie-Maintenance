"""Calculation Engine Service - Core business logic for adaptive calorie maintenance"""
from datetime import date, datetime, timedelta
from typing import Optional, Tuple, List
import statistics
from ..database import supabase_admin


class CalculationEngine:
    """Engine for all fitness calculations"""
    
    # Constants
    CALORIES_PER_KG_FAT = 7700  # ~7700 kcal per kg of body fat
    DAYS_IN_WEEK = 7
    
    def __init__(self, user_id: str):
        self.user_id = user_id
    
    def calculate_net_calories(self, calories_intake: int, calories_burned: int) -> int:
        """Calculate net calories"""
        return calories_intake - calories_burned
    
    async def get_rolling_7day_avg_weight(self, target_date: date) -> Optional[float]:
        """Calculate rolling 7-day average weight"""
        start_date = target_date - timedelta(days=6)
        
        response = supabase_admin.table('daily_logs').select(
            'bodyweight, date'
        ).eq(
            'user_id', self.user_id
        ).gte('date', start_date).lte('date', target_date).execute()
        
        weights = [log['bodyweight'] for log in response.data if log.get('bodyweight')]
        
        if len(weights) >= 3:  # Need at least 3 days
            return round(statistics.mean(weights), 2)
        return None
    
    async def calculate_daily_metrics(self, log_data: dict, target_date: date) -> dict:
        """Calculate all daily metrics when a log is created/updated"""
        
        # Calculate net calories
        net_calories = self.calculate_net_calories(
            log_data.get('calories_intake', 0),
            log_data.get('calories_burned', 0)
        )
        
        # Calculate rolling 7-day average weight
        rolling_avg = await self.get_rolling_7day_avg_weight(target_date)
        
        return {
            'net_calories': net_calories,
            'rolling_7day_avg_weight': rolling_avg
        }
    
    async def get_previous_week_avg_weight(self, week_start: date) -> Optional[float]:
        """Get previous week's average weight"""
        prev_week_start = week_start - timedelta(days=7)
        
        response = supabase_admin.table('daily_logs').select(
            'bodyweight, date'
        ).eq(
            'user_id', self.user_id
        ).gte('date', prev_week_start).lt('date', week_start).execute()
        
        weights = [log['bodyweight'] for log in response.data if log.get('bodyweight')]
        
        if weights:
            return round(statistics.mean(weights), 2)
        return None
    
    async def get_current_week_avg_weight(self, week_start: date) -> Optional[float]:
        """Get current week's average weight"""
        week_end = week_start + timedelta(days=6)
        
        response = supabase_admin.table('daily_logs').select(
            'bodyweight, date'
        ).eq(
            'user_id', self.user_id
        ).gte('date', week_start).lte('date', week_end).execute()
        
        weights = [log['bodyweight'] for log in response.data if log.get('bodyweight')]
        
        if weights:
            return round(statistics.mean(weights), 2)
        return None
    
    async def get_weekly_avg_calories(self, week_start: date) -> Optional[int]:
        """Get weekly average calories"""
        week_end = week_start + timedelta(days=6)
        
        response = supabase_admin.table('daily_logs').select(
            'calories_intake'
        ).eq(
            'user_id', self.user_id
        ).gte('date', week_start).lte('date', week_end).execute()
        
        calories = [log['calories_intake'] for log in response.data]
        
        if calories:
            return round(statistics.mean(calories))
        return None
    
    def calculate_weight_change(self, current_avg: float, prev_avg: float) -> float:
        """Calculate weight change between weeks"""
        return round(current_avg - prev_avg, 2)
    
    def calculate_calorie_adjustment(self, weight_change: float) -> int:
        """Calculate adaptive calorie adjustment based on weight change"""
        if weight_change > 0.2:
            return -100  # Weight gain - reduce calories
        elif weight_change < -0.2:
            return 100   # Weight loss - increase calories
        return 0        # Stable - no change
    
    def calculate_maintenance_estimate(self, weekly_avg_calories: int, weight_change: float) -> int:
        """Calculate maintenance calorie estimate"""
        # Formula: weekly_avg_calories - (weight_change * 7700 / 7)
        daily_adjustment = (weight_change * self.CALORIES_PER_KG_FAT) / self.DAYS_IN_WEEK
        maintenance = round(weekly_avg_calories - daily_adjustment)
        return max(1200, maintenance)  # Minimum 1200 calories
    
    def calculate_drift(self, current_avg: float, baseline_weight: float) -> Tuple[str, float]:
        """Calculate drift from baseline"""
        drift = current_avg - baseline_weight
        if abs(drift) > 0.5:
            return ("WARNING", drift)
        return ("STABLE", drift)
    
    def calculate_performance_correlation(self, 
                                           calories: List[int], 
                                           performance: List[int]) -> Optional[float]:
        """Calculate Pearson correlation between calories and performance"""
        if len(calories) < 3 or len(performance) < 3:
            return None
        
        if len(calories) != len(performance):
            # Align the data
            min_len = min(len(calories), len(performance))
            calories = calories[-min_len:]
            performance = performance[-min_len:]
        
        mean_cal = statistics.mean(calories)
        mean_perf = statistics.mean(performance)
        
        numerator = sum((c - mean_cal) * (p - mean_perf) for c, p in zip(calories, performance))
        denom_cal = sum((c - mean_cal) ** 2 for c in calories) ** 0.5
        denom_perf = sum((p - mean_perf) ** 2 for p in performance) ** 0.5
        
        if denom_cal == 0 or denom_perf == 0:
            return 0.0
        
        correlation = numerator / (denom_cal * denom_perf)
        return round(correlation, 3)
    
    def calculate_fatigue_risk_index(self,
                                       stress_level: int,
                                       recovery_score: int,
                                       workout_performance: int) -> float:
        """Calculate fatigue risk index (0-10 scale)"""
        fatigue = (
            (stress_level * 0.4) +
            ((10 - recovery_score) * 0.4) +
            ((10 - workout_performance) * 0.2)
        )
        return round(min(max(fatigue, 0), 10), 2)
    
    async def run_weekly_calculations(self, week_start: date) -> dict:
        """Run all weekly calculations"""
        
        # Get baseline weight from user settings
        settings_response = supabase_admin.table('user_settings').select(
            'baseline_weight'
        ).eq('user_id', self.user_id).execute()
        
        baseline_weight = settings_response.data[0]['baseline_weight'] if settings_response.data else None
        
        # Get current and previous week averages
        current_avg = await self.get_current_week_avg_weight(week_start)
        prev_avg = await self.get_previous_week_avg_weight(week_start)
        weekly_avg_calories = await self.get_weekly_avg_calories(week_start)
        
        # Step 1: Weight Change
        weight_change = 0
        if current_avg and prev_avg:
            weight_change = self.calculate_weight_change(current_avg, prev_avg)
        
        # Step 2: Calorie Adjustment
        calorie_adjustment = self.calculate_calorie_adjustment(weight_change)
        
        # Step 3: Maintenance Estimate
        maintenance_estimate = 2000  # Default
        if weekly_avg_calories and current_avg:
            maintenance_estimate = self.calculate_maintenance_estimate(
                weekly_avg_calories, weight_change
            )
        
        # Step 4: Drift Detection
        drift_status = "STABLE"
        if baseline_weight and current_avg:
            drift_status, _ = self.calculate_drift(current_avg, baseline_weight)
        
        # Step 5: Performance Correlation
        # Get last 7 days of data
        week_end = week_start + timedelta(days=6)
        logs_response = supabase_admin.table('daily_logs').select(
            'calories_intake, workout_performance'
        ).eq('user_id', self.user_id).gte('date', week_end - timedelta(days=30)).lte('date', week_end).execute()
        
        calories = [log['calories_intake'] for log in logs_response.data if log.get('calories_intake')]
        performance = [log['workout_performance'] for log in logs_response.data if log.get('workout_performance')]
        
        performance_correlation = self.calculate_performance_correlation(calories, performance)
        
        # Step 6: Fatigue Risk Index (use latest data)
        latest_log = supabase_admin.table('daily_logs').select(
            'stress_level, recovery_score, workout_performance'
        ).eq('user_id', self.user_id).order('date', desc=True).limit(1).execute()
        
        fatigue_risk_index = 0.0
        if latest_log.data:
            log = latest_log.data[0]
            if log.get('stress_level') and log.get('recovery_score') and log.get('workout_performance'):
                fatigue_risk_index = self.calculate_fatigue_risk_index(
                    log['stress_level'],
                    log['recovery_score'],
                    log['workout_performance']
                )
        
        # Convert dates to strings for JSON serialization
        return {
            'week_start': week_start.isoformat() if isinstance(week_start, date) else week_start,
            'avg_weight': current_avg,
            'prev_avg_weight': prev_avg,
            'weight_change': weight_change,
            'weekly_avg_calories': weekly_avg_calories,
            'maintenance_estimate': maintenance_estimate,
            'calorie_adjustment': calorie_adjustment,
            'drift_status': drift_status,
            'performance_correlation': performance_correlation,
            'fatigue_risk_index': fatigue_risk_index
        }
    
    async def get_weight_volatility(self, days: int = 30) -> Optional[float]:
        """Calculate weight volatility (standard deviation)"""
        start_date = date.today() - timedelta(days=days)
        
        response = supabase_admin.table('daily_logs').select(
            'bodyweight'
        ).eq('user_id', self.user_id).gte('date', start_date).execute()
        
        weights = [log['bodyweight'] for log in response.data if log.get('bodyweight')]
        
        if len(weights) >= 2:
            return round(statistics.stdev(weights), 2)
        return None
    
    async def get_surplus_accuracy(self, target_surplus: int = 0) -> Optional[float]:
        """Calculate surplus accuracy percentage"""
        # Get last 30 days of net calories
        start_date = date.today() - timedelta(days=30)
        
        response = supabase_admin.table('daily_logs').select(
            'net_calories'
        ).eq('user_id', self.user_id).gte('date', start_date).execute()
        
        net_calories = [log['net_calories'] for log in response.data if log.get('net_calories') is not None]
        
        if len(net_calories) >= 7:
            # Calculate how close to target
            differences = [abs(nc - target_surplus) for nc in net_calories]
            avg_diff = statistics.mean(differences)
            accuracy = max(0, 100 - (avg_diff / 100 * 100))  # Percentage
            return round(accuracy, 1)
        return None
    
    async def get_maintenance_precision(self) -> Optional[float]:
        """Calculate maintenance precision percentage"""
        # Compare target calories vs maintenance estimate
        settings_response = supabase_admin.table('user_settings').select(
            'initial_target_calories'
        ).eq('user_id', self.user_id).execute()
        
        if not settings_response.data:
            return None
        
        target = settings_response.data[0].get('initial_target_calories')
        if not target:
            return None
        
        # Get latest maintenance estimate
        metrics_response = supabase_admin.table('system_metrics').select(
            'maintenance_estimate'
        ).eq('user_id', self.user_id).order('week_start', desc=True).limit(1).execute()
        
        if not metrics_response.data:
            return None
        
        maintenance = metrics_response.data[0].get('maintenance_estimate')
        if not maintenance:
            return None
        
        precision = 100 - (abs(target - maintenance) / target * 100)
        return round(max(0, precision), 1)
    
    async def get_recovery_performance_consistency(self) -> Optional[float]:
        """Calculate recovery-performance consistency score"""
        start_date = date.today() - timedelta(days=30)
        
        response = supabase_admin.table('daily_logs').select(
            'recovery_score, workout_performance'
        ).eq('user_id', self.user_id).gte('date', start_date).execute()
        
        data = [(log['recovery_score'], log['workout_performance']) 
                for log in response.data 
                if log.get('recovery_score') and log.get('workout_performance')]
        
        if len(data) >= 7:
            # High recovery should correlate with high performance
            recovery = [d[0] for d in data]
            performance = [d[1] for d in data]
            correlation = self.calculate_performance_correlation(recovery, performance)
            if correlation:
                return round((correlation + 1) * 50, 1)  # Normalize to 0-100
        return None
    
    async def get_stress_resilience_score(self) -> Optional[float]:
        """Calculate stress resilience score"""
        start_date = date.today() - timedelta(days=30)
        
        response = supabase_admin.table('daily_logs').select(
            'stress_level, recovery_score'
        ).eq('user_id', self.user_id).gte('date', start_date).execute()
        
        data = [(log['stress_level'], log['recovery_score']) 
                for log in response.data 
                if log.get('stress_level') and log.get('recovery_score')]
        
        if len(data) >= 7:
            # Good resilience = high recovery despite high stress
            stress = [d[0] for d in data]
            recovery = [d[1] for d in data]
            
            # Calculate average recovery when stress is high (>5)
            high_stress_recovery = [r for s, r in zip(stress, recovery) if s > 5]
            
            if high_stress_recovery:
                score = statistics.mean(high_stress_recovery) * 10  # 0-100 scale
                return round(score, 1)
        return None
    
    # =====================================================
    # NEW METHODS FOR ENHANCED FEATURES
    # =====================================================
    
    def get_week_monday_sunday(self, week_start: date) -> Tuple[date, date]:
        """Get Monday and Sunday for a given week start date"""
        # If week_start is already Monday, use it
        # Otherwise find the Monday of that week
        monday = week_start - timedelta(days=week_start.weekday())
        sunday = monday + timedelta(days=6)
        return monday, sunday
    
    async def run_weekly_calculations_strict(self, week_start: date) -> dict:
        """
        Run weekly calculations strictly from Monday to Sunday.
        Shows all 7 days regardless of missing data, and identifies missed days.
        """
        monday, sunday = self.get_week_monday_sunday(week_start)
        
        # Get all logs for this Monday-Sunday period
        response = supabase_admin.table('daily_logs').select(
            '*'
        ).eq('user_id', self.user_id).gte('date', monday).lte('date', sunday).execute()
        
        logs = response.data
        logged_dates = {log['date'] for log in logs if log.get('date')}
        
        # Find missed days (dates in the week without logs)
        all_week_dates = [monday + timedelta(days=i) for i in range(7)]
        missed_dates = [d for d in all_week_dates if d not in logged_dates]
        missed_dates_str = [d.isoformat() for d in missed_dates]
        
        # Calculate metrics from available logs
        weights = [log['bodyweight'] for log in logs if log.get('bodyweight')]
        calories_intake = [log['calories_intake'] for log in logs if log.get('calories_intake')]
        calories_burned = [log['calories_burned'] for log in logs if log.get('calories_burned')]
        sleep = [log['sleep_hours'] for log in logs if log.get('sleep_hours')]
        recovery = [log['recovery_score'] for log in logs if log.get('recovery_score')]
        performance = [log['workout_performance'] for log in logs if log.get('workout_performance')]
        stress = [log['stress_level'] for log in logs if log.get('stress_level')]
        
        # Calculate averages
        avg_weight = round(statistics.mean(weights), 2) if weights else None
        avg_calories = round(statistics.mean(calories_intake)) if calories_intake else None
        avg_sleep = round(statistics.mean(sleep), 1) if sleep else None
        avg_recovery = round(statistics.mean(recovery), 1) if recovery else None
        avg_performance = round(statistics.mean(performance), 1) if performance else None
        avg_stress = round(statistics.mean(stress), 1) if stress else None
        
        total_cal_in = sum(calories_intake) if calories_intake else 0
        total_cal_burned = sum(calories_burned) if calories_burned else 0
        
        # Get baseline for drift
        settings_response = supabase_admin.table('user_settings').select('baseline_weight').eq('user_id', self.user_id).execute()
        baseline_weight = settings_response.data[0]['baseline_weight'] if settings_response.data else None
        
        # Calculate weight change (from previous week)
        prev_monday = monday - timedelta(days=7)
        prev_response = supabase_admin.table('daily_logs').select('bodyweight').eq('user_id', self.user_id).gte('date', prev_monday).lt('date', monday).execute()
        prev_weights = [log['bodyweight'] for log in prev_response.data if log.get('bodyweight')]
        prev_avg_weight = round(statistics.mean(prev_weights), 2) if prev_weights else None
        
        weight_change = 0
        if avg_weight and prev_avg_weight:
            weight_change = round(avg_weight - prev_avg_weight, 2)
        
        # Drift status
        drift_status = "STABLE"
        if baseline_weight and avg_weight:
            drift = avg_weight - baseline_weight
            if abs(drift) > 0.5:
                drift_status = "WARNING"
        
        # Calculate maintenance estimate
        maintenance_estimate = 2000
        if avg_calories:
            daily_adjustment = (weight_change * self.CALORIES_PER_KG_FAT) / self.DAYS_IN_WEEK
            maintenance_estimate = max(1200, round(avg_calories - daily_adjustment))
        
        # Calorie adjustment
        calorie_adjustment = self.calculate_calorie_adjustment(weight_change)
        
        # Performance correlation (last 30 days)
        logs_30d = supabase_admin.table('daily_logs').select('calories_intake, workout_performance').eq('user_id', self.user_id).gte('date', sunday - timedelta(days=30)).lte('date', sunday).execute()
        calories = [log['calories_intake'] for log in logs_30d.data if log.get('calories_intake')]
        perf = [log['workout_performance'] for log in logs_30d.data if log.get('workout_performance')]
        performance_correlation = self.calculate_performance_correlation(calories, perf)
        
        # Fatigue risk index
        fatigue_risk_index = 0.0
        if logs:
            latest_log = max(logs, key=lambda x: x.get('date', ''))
            if all(latest_log.get(k) for k in ['stress_level', 'recovery_score', 'workout_performance']):
                fatigue_risk_index = self.calculate_fatigue_risk_index(
                    latest_log['stress_level'],
                    latest_log['recovery_score'],
                    latest_log['workout_performance']
                )
        
        # Generate summary text
        summary_parts = []
        if avg_weight:
            summary_parts.append(f"Weighted {avg_weight}kg on average")
        if avg_calories:
            summary_parts.append(f"consumed {avg_calories}cal/day")
        if missed_dates_str:
            summary_parts.append(f"missed {len(missed_dates_str)} days")
        summary_text = ". ".join(summary_parts) if summary_parts else "No data logged this week"
        
        return {
            'week_start': monday,
            'week_end': sunday,
            'avg_weight': avg_weight,
            'prev_avg_weight': prev_avg_weight,
            'weight_change': weight_change,
            'total_logs': len(logs),
            'total_days': 7,
            'missed_days': len(missed_dates),
            'missed_dates': missed_dates_str,
            'avg_calories': avg_calories,
            'total_calories_in': total_cal_in,
            'total_calories_burned': total_cal_burned,
            'avg_sleep': avg_sleep,
            'avg_recovery': avg_recovery,
            'avg_performance': avg_performance,
            'avg_stress': avg_stress,
            'maintenance_estimate': maintenance_estimate,
            'calorie_adjustment': calorie_adjustment,
            'drift_status': drift_status,
            'performance_correlation': performance_correlation,
            'fatigue_risk_index': fatigue_risk_index,
            'summary_text': summary_text
        }
    
    def get_month_start_end(self, year: int, month: int) -> Tuple[date, date]:
        """Get first and last day of a month"""
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(year, month + 1, 1) - timedelta(days=1)
        return month_start, month_end
    
    async def run_monthly_calculations_strict(self, year: int, month: int) -> dict:
        """
        Run monthly calculations strictly from first to last day of month.
        Shows all days regardless of missing data, and identifies missed days.
        """
        month_start, month_end = self.get_month_start_end(year, month)
        
        # Get all logs for this month
        response = supabase_admin.table('daily_logs').select(
            '*'
        ).eq('user_id', self.user_id).gte('date', month_start).lte('date', month_end).execute()
        
        logs = response.data
        logged_dates = {log['date'] for log in logs if log.get('date')}
        
        # Find missed days
        all_days_in_month = []
        current = month_start
        while current <= month_end:
            all_days_in_month.append(current)
            current += timedelta(days=1)
        
        missed_dates = [d for d in all_days_in_month if d not in logged_dates]
        missed_dates_str = [d.isoformat() for d in missed_dates]
        
        # Calculate metrics
        weights = [log['bodyweight'] for log in logs if log.get('bodyweight')]
        calories_intake = [log['calories_intake'] for log in logs if log.get('calories_intake')]
        calories_burned = [log['calories_burned'] for log in logs if log.get('calories_burned')]
        sleep = [log['sleep_hours'] for log in logs if log.get('sleep_hours')]
        recovery = [log['recovery_score'] for log in logs if log.get('recovery_score')]
        performance = [log['workout_performance'] for log in logs if log.get('workout_performance')]
        stress = [log['stress_level'] for log in logs if log.get('stress_level')]
        
        avg_weight = round(statistics.mean(weights), 2) if weights else None
        avg_calories = round(statistics.mean(calories_intake)) if calories_intake else None
        avg_sleep = round(statistics.mean(sleep), 1) if sleep else None
        avg_recovery = round(statistics.mean(recovery), 1) if recovery else None
        avg_performance = round(statistics.mean(performance), 1) if performance else None
        avg_stress = round(statistics.mean(stress), 1) if stress else None
        
        total_cal_in = sum(calories_intake) if calories_intake else 0
        total_cal_burned = sum(calories_burned) if calories_burned else 0
        
        # Get previous month for weight change
        if month == 1:
            prev_year, prev_month = year - 1, 12
        else:
            prev_year, prev_month = year, month - 1
        prev_month_start, _ = self.get_month_start_end(prev_year, prev_month)
        
        prev_response = supabase_admin.table('daily_logs').select('bodyweight').eq('user_id', self.user_id).gte('date', prev_month_start).lt('date', month_start).execute()
        prev_weights = [log['bodyweight'] for log in prev_response.data if log.get('bodyweight')]
        prev_avg_weight = round(statistics.mean(prev_weights), 2) if prev_weights else None
        
        weight_change = 0
        if avg_weight and prev_avg_weight:
            weight_change = round(avg_weight - prev_avg_weight, 2)
        
        # Get baseline for drift
        settings_response = supabase_admin.table('user_settings').select('baseline_weight').eq('user_id', self.user_id).execute()
        baseline_weight = settings_response.data[0]['baseline_weight'] if settings_response.data else None
        
        drift_status = "STABLE"
        if baseline_weight and avg_weight:
            drift = avg_weight - baseline_weight
            if abs(drift) > 0.5:
                drift_status = "WARNING"
        
        # Maintenance estimate
        maintenance_estimate = 2000
        if avg_calories:
            daily_adjustment = (weight_change * self.CALORIES_PER_KG_FAT) / 30
            maintenance_estimate = max(1200, round(avg_calories - daily_adjustment))
        
        # Summary text
        summary_parts = []
        if avg_weight:
            summary_parts.append(f"Monthly average weight: {avg_weight}kg")
        if weight_change:
            direction = "gained" if weight_change > 0 else "lost"
            summary_parts.append(f"You {direction} {abs(weight_change)}kg")
        if avg_calories:
            summary_parts.append(f"Average {avg_calories}cal/day")
        summary_text = ". ".join(summary_parts) if summary_parts else "No data logged this month"
        
        return {
            'month_start': month_start,
            'month_end': month_end,
            'avg_weight': avg_weight,
            'weight_change': weight_change,
            'total_logs': len(logs),
            'total_days': len(all_days_in_month),
            'missed_days': len(missed_dates),
            'missed_dates': missed_dates_str,
            'avg_calories': avg_calories,
            'total_calories_in': total_cal_in,
            'total_calories_burned': total_cal_burned,
            'avg_sleep': avg_sleep,
            'avg_recovery': avg_recovery,
            'avg_performance': avg_performance,
            'avg_stress': avg_stress,
            'maintenance_estimate': maintenance_estimate,
            'summary_text': summary_text
        }
    
    async def calculate_streak(self) -> dict:
        """
        Calculate user logging streak with streak_start_date.
        Uses SQL window grouping to identify consecutive date sequences.
        """
        # Get all logs sorted by date descending
        response = supabase_admin.table('daily_logs').select('date').eq('user_id', self.user_id).order('date', desc=True).execute()
        
        if not response.data:
            return {
                'current_streak': 0,
                'longest_streak': 0,
                'streak_start_date': None,
                'last_log_date': None,
                'total_logged_days': 0
            }
        
        # Get unique dates - convert strings to date objects
        date_strings = sorted(set(log['date'] for log in response.data), reverse=True)
        dates = [datetime.strptime(d, '%Y-%m-%d').date() if isinstance(d, str) else d for d in date_strings]
        
        last_log_date = dates[0]
        last_log_date_str = date_strings[0]  # Keep string for return
        total_days = len(dates)
        
        # Calculate current streak (consecutive days from today/yesterday)
        today = date.today()
        current_streak = 0
        streak_start_date = None
        
        # Check if the latest log is today or yesterday
        if last_log_date == today or last_log_date == today - timedelta(days=1):
            # Count consecutive days and track start date
            check_date = last_log_date
            streak_dates = []
            for d in dates:
                if d == check_date:
                    streak_dates.append(d)
                    check_date -= timedelta(days=1)
                else:
                    break
            current_streak = len(streak_dates)
            streak_start_date = streak_dates[-1].isoformat() if streak_dates else None
        
        # Calculate longest streak using window grouping approach
        longest_streak = 0
        longest_streak_start = None
        if dates:
            # Convert to sorted ascending for longest calculation
            dates_asc = sorted(dates)
            
            # Track streaks using gap detection
            current_streak_count = 1
            current_streak_start = dates_asc[0]
            
            for i in range(1, len(dates_asc)):
                if (dates_asc[i] - dates_asc[i-1]).days == 1:
                    current_streak_count += 1
                else:
                    # Check if this streak is longer
                    if current_streak_count > longest_streak:
                        longest_streak = current_streak_count
                        longest_streak_start = current_streak_start
                    # Reset for new streak
                    current_streak_count = 1
                    current_streak_start = dates_asc[i]
            
            # Check the last streak
            if current_streak_count > longest_streak:
                longest_streak = current_streak_count
                longest_streak_start = current_streak_start
            
            # Ensure current streak is also considered for longest
            if current_streak > longest_streak:
                longest_streak = current_streak
        
        # Get existing streak to preserve longest_streak if it's higher
        existing_streak = supabase_admin.table('user_streaks').select('longest_streak').eq('user_id', self.user_id).execute()
        existing_longest = existing_streak.data[0]['longest_streak'] if existing_streak.data else 0
        longest_streak = max(longest_streak, existing_longest)
        
        return {
            'current_streak': current_streak,
            'longest_streak': longest_streak,
            'streak_start_date': streak_start_date,
            'last_log_date': last_log_date_str,
            'total_logged_days': total_days
        }
    
    async def update_streak(self) -> dict:
        """Update user streak in database with streak_start_date"""
        streak_data = await self.calculate_streak()
        
        # Check if streak record exists
        check = supabase_admin.table('user_streaks').select('id, longest_streak').eq('user_id', self.user_id).execute()
        
        # Determine the longest streak (preserve if higher)
        new_longest = max(streak_data['longest_streak'], check.data[0].get('longest_streak', 0) if check.data else 0)
        
        if check.data:
            # Update existing
            supabase_admin.table('user_streaks').update({
                'current_streak': streak_data['current_streak'],
                'longest_streak': new_longest,
                'streak_start_date': streak_data['streak_start_date'],
                'last_log_date': streak_data['last_log_date'],
                'total_logged_days': streak_data['total_logged_days']
            }).eq('user_id', self.user_id).execute()
        else:
            # Insert new
            supabase_admin.table('user_streaks').insert({
                'user_id': self.user_id,
                'current_streak': streak_data['current_streak'],
                'longest_streak': streak_data['longest_streak'],
                'streak_start_date': streak_data['streak_start_date'],
                'last_log_date': streak_data['last_log_date'],
                'total_logged_days': streak_data['total_logged_days']
            }).execute()
        
        return streak_data
    
    async def get_advanced_metrics_with_defaults(self) -> dict:
        """Get advanced metrics with default values for empty states"""
        # Get all the metrics
        volatility = await self.get_weight_volatility(30)
        surplus_acc = await self.get_surplus_accuracy(0)
        maintenance_prec = await self.get_maintenance_precision()
        recovery_perf = await self.get_recovery_performance_consistency()
        stress_res = await self.get_stress_resilience_score()
        
        # Return with defaults for None values
        return {
            'weight_volatility': volatility if volatility is not None else 0.0,
            'surplus_accuracy': surplus_acc if surplus_acc is not None else 0.0,
            'maintenance_precision': maintenance_prec if maintenance_prec is not None else 0.0,
            'recovery_performance_consistency': recovery_perf if recovery_perf is not None else 0.0,
            'stress_resilience': stress_res if stress_res is not None else 0.0
        }
