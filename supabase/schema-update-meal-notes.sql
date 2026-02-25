-- =====================================================
-- MyTracker Meal Notes Feature
-- Daily Nutrition Journal System
-- =====================================================

-- =====================================================
-- MEAL NOTES TABLE
-- =====================================================

CREATE TABLE meal_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    log_date DATE NOT NULL,
    content TEXT NOT NULL CHECK (char_length(content) <= 1000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, log_date)
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE meal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal notes" 
    ON meal_notes FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal notes" 
    ON meal_notes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal notes" 
    ON meal_notes FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal notes" 
    ON meal_notes FOR DELETE 
    USING (auth.uid() = user_id);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_meal_notes_user_date ON meal_notes(user_id, log_date DESC);
CREATE INDEX idx_meal_notes_user_created ON meal_notes(user_id, created_at DESC);

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

CREATE TRIGGER update_meal_notes_updated_at
    BEFORE UPDATE ON meal_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
