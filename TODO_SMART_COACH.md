# MyTracker Smart Coach Implementation Plan

## Overview
Implement Smart Coaching behavior with 5 main parts as per requirements.

---

## PART 1: Smart Trend Notifications

### Files to Create/Modify:
1. **Create**: `backend/app/services/trend_engine.py` - New service for trend detection

### Implementation Details:

#### 1.1 Weight Volatility Increasing Detection
- Use `system_metrics.weight_volatility` and `system_metrics.prev_weight_volatility`
- Logic: If current > previous by 15%+ → trigger notification
- Schema:
  - type = "trend"
  - category = "weight"
  - severity = "medium"
  - reference_date = week_start
  - metadata: {current_volatility, previous_volatility, percent_change}

#### 1.2 Recovery Declining (3-Day Trend)
- Fetch last 3 recovery_score values
- If strictly decreasing → trigger notification
- Schema:
  - type = "trend"
  - category = "recovery"
  - severity = "high"
  - reference_date = today

#### 1.3 Performance Drop Detected
- Calculate 3-day avg vs 7-day avg workout_performance
- If 3-day < 7-day by 10%+ → trigger
- Schema:
  - type = "trend"
  - category = "performance"
  - severity = "high"
  - reference_date = today

### Duplicate Prevention:
- Check for existing notification with same user_id, category, reference_date before inserting

---

## PART 2: Streak Calculation Improvement

### Files to Modify:
1. **Modify**: `backend/app/services/calculations.py` - Update `calculate_streak` and `update_streak` methods

### Implementation:
- Use `streak_start_date` field in user_streaks table
- Calculate streaks dynamically from daily_logs using SQL window grouping
- Include in calculation:
  - current_streak
  - longest_streak
  - streak_start_date
  - last_log_date
  - total_logged_days

### Trigger Points:
- After log insert (in daily_logs.py)
- After log delete (in daily_logs.py)
- After log update (in daily_logs.py)

---

## PART 3: Complete Monthly Calculation Endpoint

### Files to Modify:
1. **Modify**: `backend/app/routers/reports.py` - Add POST endpoint for monthly metrics
2. **Modify**: `backend/app/services/calculations.py` - Update monthly calculation to include new fields

### Implementation:
- Create: `POST /api/calculate-monthly-metrics`
- Aggregate daily_logs by month
- Calculate:
  - avg_weight
  - weight_change
  - weight_volatility (STDDEV)
  - avg_calories
  - avg_sleep
  - avg_recovery
  - avg_performance
  - avg_stress
  - total_calories_in
  - total_calories_burned
  - total_logs
  - missed_days_count
  - maintenance_estimate
  - drift_status (STABLE if ±0.3kg, else WARNING)

### Requirements:
- UPSERT into monthly_metrics
- Generate monthly_reports
- Be idempotent
- Handle missing days safely

---

## PART 4: Week Selector Extension

### Files to Modify:
1. **Modify**: `backend/app/routers/system_metrics.py` - Add week selector endpoint
2. **Modify**: `frontend/src/app/weekly-metrics/page.tsx` - Add week dropdown

### Implementation:
- Extend: `GET /api/system-metrics?week=YYYY-WW`
- Parse ISO week format
- Return system_metrics for selected week
- If not existing → calculate and insert

### Frontend:
- Add week dropdown selector
- Maintain current layout
- Add loading and empty states

---

## PART 5: Notification UI Improvement

### Files to Modify:
1. **Modify**: `frontend/src/app/notifications/page.tsx` - Enhance notification UI
2. **Modify**: `frontend/src/types/index.ts` - Add new notification fields
3. **Modify**: `frontend/src/lib/api.ts` - Update API to support new fields

### Implementation:
- Show unread badge count (already exists in filter tab)
- Sort by newest first (already exists)
- Allow mark as read (already exists)
- Style by severity:
  - high → red border/background
  - medium → yellow border/background
  - low → blue border/background
- Add category icon display

### New Notification Fields:
```
typescript
interface Notification {
  // existing fields
  category?: 'trend' | 'recovery' | 'performance' | 'system';
  severity?: 'low' | 'medium' | 'high';
  reference_date?: string;
  metadata?: Record<string, any>;
}
```

---

## Implementation Order

1. **Phase 1**: Create trend_engine.py service (PART 1)
2. **Phase 2**: Update streak calculation in calculations.py (PART 2)
3. **Phase 3**: Complete monthly calculation endpoint (PART 3)
4. **Phase 4**: Week selector extension (PART 4)
5. **Phase 5**: Notification UI improvements (PART 5)

---

## Testing Checklist
- [ ] Test weight volatility notification triggers correctly
- [ ] Test recovery declining detection
- [ ] Test performance drop detection
- [ ] Test streak calculation after log insert/delete/update
- [ ] Test monthly calculation endpoint
- [ ] Test week selector returns correct data
- [ ] Test notification UI with new severity styling
- [ ] Verify no duplicate notifications are created
