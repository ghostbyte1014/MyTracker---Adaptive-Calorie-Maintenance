-- =====================================================
-- MyTracker Database Schema (Smart Coach Version)
-- Adaptive Calorie Maintenance Engine
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USER SETTINGS
-- =====================================================

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

-- =====================================================
-- DAILY LOGS
-- =====================================================

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
    recovery_score INTEGER CHECK (recovery_score BETWEEN 1 AND 10),
    workout_performance INTEGER CHECK (workout_performance BETWEEN 1 AND 10),
    stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
    net_calories INTEGER,
    rolling_7day_avg_weight DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- =====================================================
-- WEEKLY SYSTEM METRICS
-- =====================================================

CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    week_start DATE NOT NULL,

    avg_weight DECIMAL(5,2),
    prev_avg_weight DECIMAL(5,2),
    weight_change DECIMAL(5,2),

    weight_volatility DECIMAL(6,3),
    prev_weight_volatility DECIMAL(6,3),

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

-- =====================================================
-- MONTHLY METRICS
-- =====================================================

CREATE TABLE monthly_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    month_start DATE NOT NULL,

    avg_weight DECIMAL(5,2),
    weight_change DECIMAL(5,2),

    weight_volatility DECIMAL(6,3),
    drift_status VARCHAR(20),

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

-- =====================================================
-- USER STREAKS
-- =====================================================

CREATE TABLE user_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    streak_start_date DATE,
    last_log_date DATE,
    total_logged_days INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- MISSED DAYS
-- =====================================================

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

-- =====================================================
-- WEEKLY REPORTS
-- =====================================================

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

-- =====================================================
-- MONTHLY REPORTS
-- =====================================================

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
-- SMART COACH NOTIFICATIONS
-- =====================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    type VARCHAR(50) NOT NULL,
    category VARCHAR(50) DEFAULT 'system',
    severity VARCHAR(20) DEFAULT 'medium',

    title VARCHAR(200) NOT NULL,
    message TEXT,

    reference_date DATE,
    metadata JSONB,

    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, date DESC);
CREATE INDEX idx_daily_logs_user_performance ON daily_logs(user_id, workout_performance, date DESC);
CREATE INDEX idx_daily_logs_user_recovery ON daily_logs(user_id, recovery_score, date DESC);

CREATE INDEX idx_system_metrics_user_week ON system_metrics(user_id, week_start DESC);
CREATE INDEX idx_monthly_metrics_user_month ON monthly_metrics(user_id, month_start DESC);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_user_category_date ON notifications(user_id, category, reference_date DESC);

CREATE INDEX idx_missed_days_user_date ON missed_days(user_id, missed_date DESC);

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_logs_updated_at
BEFORE UPDATE ON daily_logs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_metrics_updated_at
BEFORE UPDATE ON system_metrics
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_metrics_updated_at
BEFORE UPDATE ON monthly_metrics
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_streaks_updated_at
BEFORE UPDATE ON user_streaks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();