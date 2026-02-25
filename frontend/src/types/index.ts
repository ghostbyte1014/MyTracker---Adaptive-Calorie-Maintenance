// Types for MyTracker Application

export interface User {
  id: string;
  email: string;
  created_at?: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  baseline_weight: number | null;
  initial_target_calories: number | null;
  current_weight: number | null;
  target_weight: number | null;
  activity_level: string | null;
  goal: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  bodyweight: number | null;
  calories_intake: number;
  calories_burned: number;
  protein: number;
  carbs: number;
  fats: number;
  sleep_hours: number | null;
  recovery_score: number | null;
  workout_performance: number | null;
  stress_level: number | null;
  net_calories: number | null;
  rolling_7day_avg_weight: number | null;
  created_at: string;
  updated_at: string;
}

export interface DailyLogCreate {
  date: string;
  bodyweight?: number;
  calories_intake?: number;
  calories_burned?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  sleep_hours?: number;
  recovery_score?: number;
  workout_performance?: number;
  stress_level?: number;
}

export interface SystemMetrics {
  id: string;
  user_id: string;
  week_start: string;
  avg_weight: number | null;
  prev_avg_weight: number | null;
  weight_change: number | null;
  weekly_avg_calories: number | null;
  maintenance_estimate: number | null;
  calorie_adjustment: number;
  drift_status: string;
  performance_correlation: number | null;
  fatigue_risk_index: number | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  category?: string;
  severity?: 'low' | 'medium' | 'high';
  title: string;
  message: string | null;
  reference_date?: string;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface DashboardMetrics {
  current_7day_avg_weight: number | null;
  drift_status: string;
  current_target_calories: number | null;
  maintenance_estimate: number | null;
  weekly_adjustment: number;
  performance_correlation: number | null;
  fatigue_risk_index: number | null;
  latest_daily_log: DailyLog | null;
  recent_metrics: SystemMetrics[];
}

export interface AdvancedMetrics {
  weight_volatility: number | null;
  surplus_accuracy: number | null;
  maintenance_precision: number | null;
  recovery_performance_consistency: number | null;
  stress_resilience: number | null;
}

export interface LogSummary {
  days_tracked: number;
  avg_weight: number | null;
  avg_calories: number | null;
  avg_sleep: number | null;
  avg_recovery: number | null;
  avg_performance: number | null;
  avg_stress: number | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface MissedDay {
  id: string;
  user_id: string;
  missed_date: string;
  reason: string;
  estimated_calories: number | null;
  notes: string | null;
  created_at: string;
}

export interface MissedDayCreate {
  missed_date: string;
  reason?: string;
  estimated_calories?: number;
  notes?: string;
}

export interface MealNote {
  id: string;
  user_id: string;
  log_date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface MealNoteCreate {
  log_date: string;
  content: string;
}
