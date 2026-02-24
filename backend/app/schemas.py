"""Pydantic schemas for request/response validation"""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# User Settings Schemas
class UserSettingsBase(BaseModel):
    baseline_weight: Optional[float] = None
    initial_target_calories: Optional[int] = None
    current_weight: Optional[float] = None
    target_weight: Optional[float] = None
    activity_level: Optional[str] = None
    goal: Optional[str] = None


class UserSettingsCreate(UserSettingsBase):
    pass


class UserSettingsUpdate(BaseModel):
    baseline_weight: Optional[float] = None
    initial_target_calories: Optional[int] = None
    current_weight: Optional[float] = None
    target_weight: Optional[float] = None
    activity_level: Optional[str] = None
    goal: Optional[str] = None


class UserSettingsResponse(UserSettingsBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Daily Log Schemas
class DailyLogBase(BaseModel):
    date: date
    bodyweight: Optional[float] = None
    calories_intake: int = 0
    calories_burned: int = 0
    protein: int = 0
    carbs: int = 0
    fats: int = 0
    sleep_hours: Optional[float] = None
    recovery_score: Optional[int] = Field(None, ge=1, le=10)
    workout_performance: Optional[int] = Field(None, ge=1, le=10)
    stress_level: Optional[int] = Field(None, ge=1, le=10)


class DailyLogCreate(DailyLogBase):
    pass


class DailyLogUpdate(BaseModel):
    bodyweight: Optional[float] = None
    calories_intake: Optional[int] = None
    calories_burned: Optional[int] = None
    protein: Optional[int] = None
    carbs: Optional[int] = None
    fats: Optional[int] = None
    sleep_hours: Optional[float] = None
    recovery_score: Optional[int] = Field(None, ge=1, le=10)
    workout_performance: Optional[int] = Field(None, ge=1, le=10)
    stress_level: Optional[int] = Field(None, ge=1, le=10)


class DailyLogResponse(DailyLogBase):
    id: str
    user_id: str
    net_calories: Optional[int] = None
    rolling_7day_avg_weight: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# System Metrics Schemas
class SystemMetricsBase(BaseModel):
    week_start: date
    avg_weight: Optional[float] = None
    prev_avg_weight: Optional[float] = None
    weight_change: Optional[float] = None
    weekly_avg_calories: Optional[int] = None
    maintenance_estimate: Optional[int] = None
    calorie_adjustment: int = 0
    drift_status: str = "STABLE"
    performance_correlation: Optional[float] = None
    fatigue_risk_index: Optional[float] = None


class SystemMetricsCreate(SystemMetricsBase):
    pass


class SystemMetricsUpdate(BaseModel):
    avg_weight: Optional[float] = None
    prev_avg_weight: Optional[float] = None
    weight_change: Optional[float] = None
    weekly_avg_calories: Optional[int] = None
    maintenance_estimate: Optional[int] = None
    calorie_adjustment: Optional[int] = None
    drift_status: Optional[str] = None
    performance_correlation: Optional[float] = None
    fatigue_risk_index: Optional[float] = None


class SystemMetricsResponse(SystemMetricsBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Notification Schemas
class NotificationBase(BaseModel):
    type: str
    title: str
    message: Optional[str] = None


class NotificationCreate(NotificationBase):
    pass


class NotificationResponse(NotificationBase):
    id: str
    user_id: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Auth Schemas
class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str


# Dashboard Schema
class DashboardMetrics(BaseModel):
    current_7day_avg_weight: Optional[float] = None
    drift_status: str = "STABLE"
    current_target_calories: Optional[int] = None
    maintenance_estimate: Optional[int] = None
    weekly_adjustment: int = 0
    performance_correlation: Optional[float] = None
    fatigue_risk_index: Optional[float] = None
    latest_daily_log: Optional[DailyLogResponse] = None
    recent_metrics: List[SystemMetricsResponse] = []


# Missed Day Schemas
class MissedDayBase(BaseModel):
    missed_date: date
    reason: str = "forgot"
    estimated_calories: Optional[int] = None
    notes: Optional[str] = None


class MissedDayCreate(MissedDayBase):
    pass


class MissedDayUpdate(BaseModel):
    reason: Optional[str] = None
    estimated_calories: Optional[int] = None
    notes: Optional[str] = None


class MissedDayResponse(MissedDayBase):
    id: str
    user_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
