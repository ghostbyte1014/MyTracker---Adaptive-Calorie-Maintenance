-- MyTracker Database Schema for Supabase
-- Adaptive Calorie Maintenance Engine

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Settings Table (extends Supabase Auth)
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    baseline_weight DECIMAL(5,2),
    initial_target_calories INTEGER DEFAULT 2000,
    current_weight DECIMAL(5,2),
    target_weight DECIMAL(5,2),
    activity_level VARCHAR(20) DEFAULT 'moderate',
    goal VARCHAR(50) DEFAULT 'maintain',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Logs Table
CREATE TABLE daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    bodyweight DECIMAL(5,2),
    calories_intake INTEGER DEFAULT 0,
    calories_burned INTEGER DEFAULT 0,
    protein INTEGER DEFAULT 0,
    carbs INTEGER DEFAULT 0,
    fats INTEGER DEFAULT 0,
    sleep_hours DECIMAL(3,1),
    recovery_score INTEGER CHECK (recovery_score >= 1 AND recovery_score <= 10),
    workout_performance INTEGER CHECK (workout_performance >= 1 AND workout_performance <= 10),
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
    net_calories INTEGER,
    rolling_7day_avg_weight DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- System Metrics Table (Weekly auto-calculated)
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    week_start DATE NOT NULL,
    avg_weight DECIMAL(5,2),
    prev_avg_weight DECIMAL(5,2),
    weight_change DECIMAL(5,2),
    weekly_avg_calories INTEGER,
    maintenance_estimate INTEGER,
    calorie_adjustment INTEGER DEFAULT 0,
    drift_status VARCHAR(20) DEFAULT 'STABLE',
    performance_correlation DECIMAL(4,3),
    fatigue_risk_index DECIMAL(4,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

-- Missed Days Table (Track days user forgot to log)
CREATE TABLE missed_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    missed_date DATE NOT NULL,
    reason VARCHAR(50) DEFAULT 'forgot',
    estimated_calories INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, missed_date)
);

-- Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security Policies

-- User Settings RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" 
    ON user_settings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" 
    ON user_settings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" 
    ON user_settings FOR UPDATE 
    USING (auth.uid() = user_id);

-- Daily Logs RLS
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" 
    ON daily_logs FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs" 
    ON daily_logs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs" 
    ON daily_logs FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs" 
    ON daily_logs FOR DELETE 
    USING (auth.uid() = user_id);

-- System Metrics RLS
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics" 
    ON system_metrics FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics" 
    ON system_metrics FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics" 
    ON system_metrics FOR UPDATE 
    USING (auth.uid() = user_id);

-- Missed Days RLS
ALTER TABLE missed_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own missed days" 
    ON missed_days FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own missed days" 
    ON missed_days FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own missed days" 
    ON missed_days FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own missed days" 
    ON missed_days FOR DELETE 
    USING (auth.uid() = user_id);

-- Notifications RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
    ON notifications FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" 
    ON notifications FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
    ON notifications FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" 
    ON notifications FOR DELETE 
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, date DESC);
CREATE INDEX idx_daily_logs_user_created ON daily_logs(user_id, created_at DESC);
CREATE INDEX idx_system_metrics_user_week ON system_metrics(user_id, week_start DESC);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_missed_days_user_date ON missed_days(user_id, missed_date DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_logs_updated_at 
    BEFORE UPDATE ON daily_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_metrics_updated_at 
    BEFORE UPDATE ON system_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- NEW TABLES FOR ENHANCED FEATURES
-- =====================================================

-- Monthly Metrics Table (Monthly auto-calculated)
CREATE TABLE monthly_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    month_start DATE NOT NULL,
    avg_weight DECIMAL(5,2),
    weight_change DECIMAL(5,2),
    total_logs INTEGER DEFAULT 0,
    total_days INTEGER DEFAULT 0,
    missed_days_count INTEGER DEFAULT 0,
    avg_calories INTEGER,
    avg_sleep DECIMAL(3,1),
    avg_recovery DECIMAL(3,1),
    avg_performance DECIMAL(3,1),
    avg_stress DECIMAL(3,1),
    maintenance_estimate INTEGER,
    total_calories_in INTEGER DEFAULT 0,
    total_calories_burned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month_start)
);

-- User Streaks Table (Track consecutive logging days)
CREATE TABLE user_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_log_date DATE,
    total_logged_days INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weekly Reports Table
CREATE TABLE weekly_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    avg_weight DECIMAL(5,2),
    weight_change DECIMAL(5,2),
    total_logs INTEGER DEFAULT 0,
    missed_days INTEGER DEFAULT 0,
    missed_dates TEXT[],
    avg_calories INTEGER,
    total_calories_in INTEGER,
    total_calories_burned INTEGER,
    avg_sleep DECIMAL(3,1),
    avg_recovery DECIMAL(3,1),
    avg_performance DECIMAL(3,1),
    avg_stress DECIMAL(3,1),
    maintenance_estimate INTEGER,
    calorie_adjustment INTEGER,
    drift_status VARCHAR(20),
    performance_correlation DECIMAL(4,3),
    fatigue_risk_index DECIMAL(4,2),
    summary_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

-- Monthly Reports Table
CREATE TABLE monthly_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    month_start DATE NOT NULL,
    month_end DATE NOT NULL,
    avg_weight DECIMAL(5,2),
    weight_change DECIMAL(5,2),
    total_logs INTEGER DEFAULT 0,
    missed_days INTEGER DEFAULT 0,
    missed_dates TEXT[],
    avg_calories INTEGER,
    total_calories_in INTEGER,
    total_calories_burned INTEGER,
    avg_sleep DECIMAL(3,1),
    avg_recovery DECIMAL(3,1),
    avg_performance DECIMAL(3,1),
    avg_stress DECIMAL(3,1),
    maintenance_estimate INTEGER,
    summary_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month_start)
);

-- =====================================================
-- RLS POLICIES FOR NEW TABLES
-- =====================================================

ALTER TABLE monthly_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own monthly metrics" 
    ON monthly_metrics FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly metrics" 
    ON monthly_metrics FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly metrics" 
    ON monthly_metrics FOR UPDATE 
    USING (auth.uid() = user_id);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks" 
    ON user_streaks FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks" 
    ON user_streaks FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks" 
    ON user_streaks FOR UPDATE 
    USING (auth.uid() = user_id);

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly reports" 
    ON weekly_reports FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly reports" 
    ON weekly_reports FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly reports" 
    ON weekly_reports FOR UPDATE 
    USING (auth.uid() = user_id);

ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own monthly reports" 
    ON monthly_reports FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly reports" 
    ON monthly_reports FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly reports" 
    ON monthly_reports FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE INDEX idx_monthly_metrics_user_month ON monthly_metrics(user_id, month_start DESC);
CREATE INDEX idx_user_streaks_user ON user_streaks(user_id);
CREATE INDEX idx_weekly_reports_user_week ON weekly_reports(user_id, week_start DESC);
CREATE INDEX idx_monthly_reports_user_month ON monthly_reports(user_id, month_start DESC);

CREATE TRIGGER update_monthly_metrics_updated_at 
    BEFORE UPDATE ON monthly_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_streaks_updated_at 
    BEFORE UPDATE ON user_streaks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
