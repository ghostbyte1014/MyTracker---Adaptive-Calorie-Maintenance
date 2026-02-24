"""
Script to populate test data for MyTracker using direct REST API
Creates a test user and populates daily logs from January 1st 2025,
plus generates weekly reports, monthly reports, streaks, notifications, and missed days
"""
import requests
import json
from datetime import date, timedelta
import random

# Supabase credentials


# Test user credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "test123456"

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}


def create_user():
    """Create user via Supabase Auth API - try to get existing user first"""
    # First try to get existing user
    existing_user_id = get_user_id()
    if existing_user_id:
        print("Using existing user")
        return existing_user_id
    
    # If not found, try to create new user
    url = f"{SUPABASE_URL}/auth/v1/signup"
    data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    response = requests.post(url, headers=HEADERS, json=data)
    if response.status_code == 200:
        user_data = response.json()
        if user_data.get("user"):
            return user_data["user"]["id"]
        print("User might already exist, trying to get user ID...")
        return get_user_id()
    elif response.status_code == 400:
        print("User already exists, signing in...")
        return get_user_id()
    else:
        print(f"Error creating user: {response.text}")
        return None


def get_user_id():
    """Get user ID by trying to sign in"""
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    response = requests.post(url, headers={"apikey": SUPABASE_SERVICE_KEY}, json=data)
    if response.status_code == 200:
        return response.json()["user"]["id"]
    print(f"Error getting user: {response.text}")
    return None


def create_user_settings(user_id):
    """Create user settings"""
    url = f"{SUPABASE_URL}/rest/v1/user_settings"
    data = {
        "user_id": user_id,
        "baseline_weight": 80.0,
        "initial_target_calories": 2200,
        "current_weight": 78.5,
        "target_weight": 75.0,
        "activity_level": "moderate",
        "goal": "cut"
    }
    response = requests.post(url, headers=HEADERS, json=data)
    if response.status_code == 201:
        print("✓ User settings created")
    else:
        print(f"User settings might already exist: {response.text[:100]}")


def generate_daily_logs(user_id: str, start_date: date, end_date: date):
    """Generate realistic daily log data"""
    logs = []
    current_date = start_date
    base_weight = 80.0
    
    while current_date <= end_date:
        # Simulate weight loss progress (slow and steady)
        weight_change = random.uniform(-0.1, 0.05)
        base_weight += weight_change
        
        # Calorie intake varies but averages around 2200
        calories_intake = random.randint(1800, 2600)
        
        # Calories burned from exercise
        calories_burned = random.randint(200, 600)
        
        # Macros
        protein = random.randint(150, 220)
        carbs = random.randint(200, 300)
        fats = random.randint(60, 90)
        
        # Sleep and recovery
        sleep_hours = random.uniform(5.5, 9.0)
        recovery_score = random.randint(4, 10)
        workout_performance = random.randint(3, 10)
        stress_level = random.randint(2, 8)
        
        log = {
            "user_id": user_id,
            "date": current_date.isoformat(),
            "bodyweight": round(base_weight, 1),
            "calories_intake": calories_intake,
            "calories_burned": calories_burned,
            "protein": protein,
            "carbs": carbs,
            "fats": fats,
            "sleep_hours": round(sleep_hours, 1),
            "recovery_score": recovery_score,
            "workout_performance": workout_performance,
            "stress_level": stress_level,
        }
        logs.append(log)
        current_date += timedelta(days=1)
    
    return logs


def insert_daily_logs(logs):
    """Insert daily logs in batches"""
    url = f"{SUPABASE_URL}/rest/v1/daily_logs"
    
    batch_size = 30
    for i in range(0, len(logs), batch_size):
        batch = logs[i:i+batch_size]
        response = requests.post(url, headers=HEADERS, json=batch)
        if response.status_code == 201:
            print(f"  Inserted logs {i+1} to {min(i+batch_size, len(logs))}")
        else:
            print(f"  Error inserting batch: {response.text[:100]}")


def get_monday_of_week(d: date) -> date:
    """Get Monday of the week for a given date"""
    return d - timedelta(days=d.weekday())


def get_week_range(week_start: date) -> tuple:
    """Get Monday and Sunday of a week"""
    return week_start, week_start + timedelta(days=6)


def calculate_weekly_report(user_id: str, week_start: date) -> dict:
    """Calculate weekly report for a given week (Monday-Sunday)"""
    week_end = week_start + timedelta(days=6)
    
    # Get logs for this week
    url = f"{SUPABASE_URL}/rest/v1/daily_logs"
    params = {
        "user_id": f"eq.{user_id}",
        "date": f"gte.{week_start.isoformat()}",
        "date": f"lte.{week_end.isoformat()}"
    }
    response = requests.get(url, headers=HEADERS, params=params)
    logs = response.json() if response.status_code == 200 else []
    
    logged_dates = {log['date'] for log in logs if log.get('date')}
    
    # Find missed days
    all_week_dates = [week_start + timedelta(days=i) for i in range(7)]
    missed_dates = [d for d in all_week_dates if d.isoformat() not in logged_dates]
    
    # Calculate averages
    weights = [log['bodyweight'] for log in logs if log.get('bodyweight')]
    calories = [log['calories_intake'] for log in logs if log.get('calories_intake')]
    calories_burned = [log['calories_burned'] for log in logs if log.get('calories_burned')]
    sleep = [log['sleep_hours'] for log in logs if log.get('sleep_hours')]
    recovery = [log['recovery_score'] for log in logs if log.get('recovery_score')]
    performance = [log['workout_performance'] for log in logs if log.get('workout_performance')]
    stress = [log['stress_level'] for log in logs if log.get('stress_level')]
    
    import statistics
    avg_weight = round(statistics.mean(weights), 2) if weights else None
    avg_calories = round(statistics.mean(calories)) if calories else None
    avg_sleep = round(statistics.mean(sleep), 1) if sleep else None
    avg_recovery = round(statistics.mean(recovery), 1) if recovery else None
    avg_performance = round(statistics.mean(performance), 1) if performance else None
    avg_stress = round(statistics.mean(stress), 1) if stress else None
    
    total_cal_in = sum(calories) if calories else 0
    total_cal_burned = sum(calories_burned) if calories_burned else 0
    
    # Get previous week for weight change
    prev_week_start = week_start - timedelta(days=7)
    prev_week_end = prev_week_start + timedelta(days=6)
    params_prev = {
        "user_id": f"eq.{user_id}",
        "date": f"gte.{prev_week_start.isoformat()}",
        "date": f"lte.{prev_week_end.isoformat()}"
    }
    response_prev = requests.get(url, headers=HEADERS, params=params_prev)
    prev_logs = response_prev.json() if response_prev.status_code == 200 else []
    prev_weights = [log['bodyweight'] for log in prev_logs if log.get('bodyweight')]
    prev_avg_weight = round(statistics.mean(prev_weights), 2) if prev_weights else None
    
    weight_change = 0
    if avg_weight and prev_avg_weight:
        weight_change = round(avg_weight - prev_avg_weight, 2)
    
    # Drift status
    url_settings = f"{SUPABASE_URL}/rest/v1/user_settings"
    params_settings = {"user_id": f"eq.{user_id}"}
    response_settings = requests.get(url_settings, headers=HEADERS, params=params_settings)
    settings_data = response_settings.json() if response_settings.status_code == 200 else []
    baseline_weight = settings_data[0].get('baseline_weight') if settings_data else None
    
    drift_status = "STABLE"
    if baseline_weight and avg_weight:
        drift = avg_weight - baseline_weight
        if abs(drift) > 0.5:
            drift_status = "WARNING"
    
    # Maintenance estimate
    maintenance_estimate = 2000
    if avg_calories:
        daily_adjustment = (weight_change * 7700) / 7
        maintenance_estimate = max(1200, round(avg_calories - daily_adjustment))
    
    # Calorie adjustment
    calorie_adjustment = 0
    if weight_change > 0.2:
        calorie_adjustment = -100
    elif weight_change < -0.2:
        calorie_adjustment = 100
    
    # Summary text
    summary_parts = []
    if avg_weight:
        summary_parts.append(f"Weighted {avg_weight}kg on average")
    if avg_calories:
        summary_parts.append(f"consumed {avg_calories}cal/day")
    if missed_dates:
        summary_parts.append(f"missed {len(missed_dates)} days")
    summary_text = ". ".join(summary_parts) if summary_parts else "No data logged this week"
    
    return {
        'user_id': user_id,
        'week_start': week_start.isoformat(),
        'week_end': week_end.isoformat(),
        'avg_weight': avg_weight,
        'weight_change': weight_change,
        'total_logs': len(logs),
        'missed_days': len(missed_dates),
        'missed_dates': [d.isoformat() for d in missed_dates],
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
        'performance_correlation': None,
        'fatigue_risk_index': 0.0,
        'summary_text': summary_text
    }


def calculate_monthly_report(user_id: str, year: int, month: int) -> dict:
    """Calculate monthly report for a given month"""
    month_start = date(year, month, 1)
    if month == 12:
        month_end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(year, month + 1, 1) - timedelta(days=1)
    
    # Get logs for this month
    url = f"{SUPABASE_URL}/rest/v1/daily_logs"
    params = {
        "user_id": f"eq.{user_id}",
        "date": f"gte.{month_start.isoformat()}",
        "date": f"lte.{month_end.isoformat()}"
    }
    response = requests.get(url, headers=HEADERS, params=params)
    logs = response.json() if response.status_code == 200 else []
    
    logged_dates = {log['date'] for log in logs if log.get('date')}
    
    # Find missed days
    all_days_in_month = []
    current = month_start
    while current <= month_end:
        all_days_in_month.append(current)
        current += timedelta(days=1)
    
    missed_dates = [d for d in all_days_in_month if d.isoformat() not in logged_dates]
    
    # Calculate averages
    import statistics
    weights = [log['bodyweight'] for log in logs if log.get('bodyweight')]
    calories = [log['calories_intake'] for log in logs if log.get('calories_intake')]
    calories_burned = [log['calories_burned'] for log in logs if log.get('calories_burned')]
    sleep = [log['sleep_hours'] for log in logs if log.get('sleep_hours')]
    recovery = [log['recovery_score'] for log in logs if log.get('recovery_score')]
    performance = [log['workout_performance'] for log in logs if log.get('workout_performance')]
    stress = [log['stress_level'] for log in logs if log.get('stress_level')]
    
    avg_weight = round(statistics.mean(weights), 2) if weights else None
    avg_calories = round(statistics.mean(calories)) if calories else None
    avg_sleep = round(statistics.mean(sleep), 1) if sleep else None
    avg_recovery = round(statistics.mean(recovery), 1) if recovery else None
    avg_performance = round(statistics.mean(performance), 1) if performance else None
    avg_stress = round(statistics.mean(stress), 1) if stress else None
    
    total_cal_in = sum(calories) if calories else 0
    total_cal_burned = sum(calories_burned) if calories_burned else 0
    
    # Get previous month for weight change
    if month == 1:
        prev_year, prev_month = year - 1, 12
    else:
        prev_year, prev_month = year, month - 1
    prev_month_start = date(prev_year, prev_month, 1)
    if prev_month == 12:
        prev_month_end = date(prev_year + 1, 1, 1) - timedelta(days=1)
    else:
        prev_month_end = date(prev_year, prev_month + 1, 1) - timedelta(days=1)
    
    params_prev = {
        "user_id": f"eq.{user_id}",
        "date": f"gte.{prev_month_start.isoformat()}",
        "date": f"lte.{prev_month_end.isoformat()}"
    }
    response_prev = requests.get(url, headers=HEADERS, params=params_prev)
    prev_logs = response_prev.json() if response_prev.status_code == 200 else []
    prev_weights = [log['bodyweight'] for log in prev_logs if log.get('bodyweight')]
    prev_avg_weight = round(statistics.mean(prev_weights), 2) if prev_weights else None
    
    weight_change = 0
    if avg_weight and prev_avg_weight:
        weight_change = round(avg_weight - prev_avg_weight, 2)
    
    # Maintenance estimate
    maintenance_estimate = 2000
    if avg_calories:
        daily_adjustment = (weight_change * 7700) / 30
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
        'user_id': user_id,
        'month_start': month_start.isoformat(),
        'month_end': month_end.isoformat(),
        'avg_weight': avg_weight,
        'weight_change': weight_change,
        'total_logs': len(logs),
        'missed_days': len(missed_dates),
        'missed_dates': [d.isoformat() for d in missed_dates],
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


def calculate_streak(user_id: str) -> dict:
    """Calculate user streak"""
    url = f"{SUPABASE_URL}/rest/v1/daily_logs"
    params = {
        "user_id": f"eq.{user_id}",
        "select": "date",
        "order": "date.desc"
    }
    response = requests.get(url, headers=HEADERS, params=params)
    if response.status_code != 200:
        return {'current_streak': 0, 'longest_streak': 0, 'last_log_date': None, 'total_logged_days': 0}
    
    logs = response.json()
    if not logs:
        return {'current_streak': 0, 'longest_streak': 0, 'last_log_date': None, 'total_logged_days': 0}
    
    dates = sorted(set(log['date'] for log in logs), reverse=True)
    last_log_date = dates[0]
    total_days = len(dates)
    
    # Calculate current streak
    today = date.today()
    current_streak = 0
    
    last_date = date.fromisoformat(last_log_date)
    if last_date == today or last_date == today - timedelta(days=1):
        check_date = last_date
        for d in dates:
            d_date = date.fromisoformat(d) if isinstance(d, str) else d
            if d_date == check_date:
                current_streak += 1
                check_date -= timedelta(days=1)
            else:
                break
    
    # Calculate longest streak
    longest_streak = 0
    if dates:
        dates_asc = sorted([date.fromisoformat(d) if isinstance(d, str) else d for d in dates])
        streak = 1
        for i in range(1, len(dates_asc)):
            if (dates_asc[i] - dates_asc[i-1]).days == 1:
                streak += 1
                longest_streak = max(longest_streak, streak)
            else:
                streak = 1
        longest_streak = max(longest_streak, current_streak)
    
    return {
        'current_streak': current_streak,
        'longest_streak': longest_streak,
        'last_log_date': last_log_date,
        'total_logged_days': total_days
    }


def populate_weekly_reports(user_id: str, start_date: date, end_date: date):
    """Populate weekly reports for all weeks"""
    print("\nGenerating weekly reports...")
    
    # Find all Mondays from start_date to end_date
    current_monday = get_monday_of_week(start_date)
    reports = []
    
    while current_monday <= end_date:
        report = calculate_weekly_report(user_id, current_monday)
        reports.append(report)
        current_monday += timedelta(days=7)
    
    # Insert weekly reports
    url = f"{SUPABASE_URL}/rest/v1/weekly_reports"
    batch_size = 10
    for i in range(0, len(reports), batch_size):
        batch = reports[i:i+batch_size]
        response = requests.post(url, headers=HEADERS, json=batch)
        if response.status_code == 201:
            print(f"  Inserted weekly reports {i+1} to {min(i+batch_size, len(reports))}")
        else:
            print(f"  Error: {response.text[:100]}")
    
    print(f"✓ Generated {len(reports)} weekly reports")


def populate_monthly_reports(user_id: str, start_date: date, end_date: date):
    """Populate monthly reports for all months"""
    print("\nGenerating monthly reports...")
    
    reports = []
    current = start_date
    
    while current <= end_date:
        report = calculate_monthly_report(user_id, current.year, current.month)
        reports.append(report)
        # Move to next month
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)
    
    # Insert monthly reports
    url = f"{SUPABASE_URL}/rest/v1/monthly_reports"
    batch_size = 10
    for i in range(0, len(reports), batch_size):
        batch = reports[i:i+batch_size]
        response = requests.post(url, headers=HEADERS, json=batch)
        if response.status_code == 201:
            print(f"  Inserted monthly reports {i+1} to {min(i+batch_size, len(reports))}")
        else:
            print(f"  Error: {response.text[:100]}")
    
    print(f"✓ Generated {len(reports)} monthly reports")


def populate_streak(user_id: str):
    """Populate user streak"""
    print("\nCalculating streak...")
    streak_data = calculate_streak(user_id)
    
    url = f"{SUPABASE_URL}/rest/v1/user_streaks"
    data = {
        'user_id': user_id,
        'current_streak': streak_data['current_streak'],
        'longest_streak': streak_data['longest_streak'],
        'last_log_date': streak_data['last_log_date'],
        'total_logged_days': streak_data['total_logged_days']
    }
    response = requests.post(url, headers=HEADERS, json=data)
    if response.status_code == 201:
        print(f"✓ Streak calculated: {streak_data['current_streak']} current, {streak_data['longest_streak']} longest")
    else:
        print(f"  Streak might already exist: {response.text[:100]}")


def populate_notifications(user_id: str, start_date: date, end_date: date):
    """Populate notifications"""
    print("\nGenerating notifications...")
    
    notifications = []
    
    # Get weekly reports to generate notifications
    url = f"{SUPABASE_URL}/rest/v1/weekly_reports"
    params = {"user_id": f"eq.{user_id}", "order": "week_start.desc", "limit": 10}
    response = requests.get(url, headers=HEADERS, params=params)
    
    if response.status_code == 200:
        reports = response.json()
        for report in reports[:4]:  # Last 4 weeks
            notifications.append({
                'user_id': user_id,
                'type': 'weekly_report',
                'title': f"Weekly Report: {report['week_start']}",
                'message': report.get('summary_text', 'Your weekly summary is ready'),
                'is_read': False
            })
    
    # Add some reminder notifications
    notifications.append({
        'user_id': user_id,
        'type': 'reminder',
        'title': 'Daily Log Reminder',
        'message': "Don't forget to log your metrics today!",
        'is_read': False
    })
    
    notifications.append({
        'user_id': user_id,
        'type': 'milestone',
        'title': 'Welcome to MyTracker!',
        'message': "Start tracking your fitness journey today!",
        'is_read': False
    })
    
    # Insert notifications
    url = f"{SUPABASE_URL}/rest/v1/notifications"
    response = requests.post(url, headers=HEADERS, json=notifications)
    if response.status_code == 201:
        print(f"✓ Created {len(notifications)} notifications")
    else:
        print(f"  Error: {response.text[:100]}")


def populate_missed_days(user_id: str, start_date: date, end_date: date):
    """Populate missed days"""
    print("\nGenerating missed days...")
    
    # Get all daily logs to find missed days
    url = f"{SUPABASE_URL}/rest/v1/daily_logs"
    params = {
        "user_id": f"eq.{user_id}",
        "date": f"gte.{start_date.isoformat()}",
        "date": f"lte.{end_date.isoformat()}",
        "select": "date"
    }
    response = requests.get(url, headers=HEADERS, params=params)
    
    if response.status_code != 200:
        print("  Error getting logs")
        return
    
    logs = response.json()
    logged_dates = {log['date'] for log in logs}
    
    # Find all dates in range
    missed_days = []
    current = start_date
    while current <= end_date:
        if current.isoformat() not in logged_dates:
            # Randomly decide if it's a missed day (some days user forgot)
            if random.random() < 0.15:  # 15% chance of missing
                missed_days.append({
                    'user_id': user_id,
                    'missed_date': current.isoformat(),
                    'reason': random.choice(['forgot', 'travel', 'sick', 'busy']),
                    'notes': None
                })
        current += timedelta(days=1)
    
    # Insert missed days
    if missed_days:
        url = f"{SUPABASE_URL}/rest/v1/missed_days"
        batch_size = 20
        for i in range(0, len(missed_days), batch_size):
            batch = missed_days[i:i+batch_size]
            response = requests.post(url, headers=HEADERS, json=batch)
            if response.status_code == 201:
                print(f"  Inserted missed days {i+1} to {min(i+batch_size, len(missed_days))}")
            else:
                print(f"  Error: {response.text[:100]}")
        
        print(f"✓ Created {len(missed_days)} missed day records")
    else:
        print("✓ No missed days to record")


def main():
    print(f"Connecting to Supabase: {SUPABASE_URL}")
    
    # Create test user
    print(f"\nCreating test user: {TEST_EMAIL}")
    user_id = create_user()
    if not user_id:
        print("Failed to create/get user")
        return
    
    print(f"✓ User ID: {user_id}")
    
    # Create user settings
    print("\nCreating user settings...")
    create_user_settings(user_id)
    
    # Generate daily logs from January 1st 2025
    start_date = date(2025, 1, 1)
    end_date = date.today()
    print(f"\nGenerating daily logs from {start_date} to {end_date}...")
    
    logs = generate_daily_logs(user_id, start_date, end_date)
    print(f"✓ Generated {len(logs)} daily logs")
    
    # Insert logs
    insert_daily_logs(logs)
    
    # Populate weekly reports
    populate_weekly_reports(user_id, start_date, end_date)
    
    # Populate monthly reports
    populate_monthly_reports(user_id, start_date, end_date)
    
    # Populate streak
    populate_streak(user_id)
    
    # Populate notifications
    populate_notifications(user_id, start_date, end_date)
    
    # Populate missed days
    populate_missed_days(user_id, start_date, end_date)
    
    print("\n" + "="*50)
    print("ALL TEST DATA POPULATED SUCCESSFULLY!")
    print("="*50)
    print(f"Email: {TEST_EMAIL}")
    print(f"Password: {TEST_PASSWORD}")
    print(f"Daily logs created: {len(logs)}")
    print(f"Date range: {start_date} to {end_date}")
    print("\nTables populated:")
    print("  - user_settings")
    print("  - daily_logs")
    print("  - weekly_reports")
    print("  - monthly_reports")
    print("  - user_streaks")
    print("  - notifications")
    print("  - missed_days")


if __name__ == "__main__":
    main()
