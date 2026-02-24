// API client for communicating with FastAPI backend
import { 
  DailyLog, 
  DailyLogCreate, 
  SystemMetrics, 
  UserSettings, 
  Notification,
  AuthResponse,
  AdvancedMetrics,
  LogSummary,
  DashboardMetrics,
  MissedDay,
  MissedDayCreate
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('mytracker_token', token);
    } else {
      localStorage.removeItem('mytracker_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = typeof window !== 'undefined' ? localStorage.getItem('mytracker_token') : null;
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async register(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async googleSignIn(): Promise<{ url: string }> {
    // This returns the Google OAuth URL - redirect to it
    return this.request<{ url: string }>('/auth/google', { method: 'GET' });
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getCurrentUser() {
    return this.request<{ id: string; email: string; created_at: string }>('/auth/me');
  }

  // User Settings
  async getSettings(): Promise<UserSettings> {
    return this.request<UserSettings>('/users/settings');
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return this.request<UserSettings>('/users/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async initializeSettings(settings: {
    baseline_weight?: number;
    initial_target_calories?: number;
  }): Promise<UserSettings> {
    return this.request<UserSettings>('/users/settings/initialize', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  // Daily Logs
  async getDailyLogs(params?: { start_date?: string; end_date?: string; limit?: number }): Promise<DailyLog[]> {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return this.request<DailyLog[]>(`/daily-logs/${query ? `?${query}` : ''}`);
  }

  async getLatestLog(): Promise<DailyLog | null> {
    return this.request<DailyLog | null>('/daily-logs/latest');
  }

  async createDailyLog(log: DailyLogCreate): Promise<DailyLog> {
    return this.request<DailyLog>('/daily-logs/', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  }

  async updateDailyLog(logId: string, log: Partial<DailyLogCreate>): Promise<DailyLog> {
    return this.request<DailyLog>(`/daily-logs/${logId}`, {
      method: 'PUT',
      body: JSON.stringify(log),
    });
  }

  async deleteDailyLog(logId: string): Promise<void> {
    await this.request(`/daily-logs/${logId}`, { method: 'DELETE' });
  }

  async getLogSummary(days: number = 7): Promise<LogSummary> {
    return this.request<LogSummary>(`/daily-logs/stats/summary?days=${days}`);
  }

  // System Metrics
  async getSystemMetrics(limit: number = 12): Promise<SystemMetrics[]> {
    return this.request<SystemMetrics[]>(`/system-metrics/?limit=${limit}`);
  }

  async getLatestMetrics(): Promise<SystemMetrics | null> {
    return this.request<SystemMetrics | null>('/system-metrics/latest');
  }

  async triggerWeeklyCalculation(): Promise<{ success: boolean; metrics: SystemMetrics }> {
    return this.request('/system-metrics/trigger-weekly', { method: 'POST' });
  }

  async getAdvancedMetrics(): Promise<AdvancedMetrics> {
    return this.request<AdvancedMetrics>('/system-metrics/advanced/all');
  }

  // Notifications
  async getNotifications(unreadOnly: boolean = false): Promise<Notification[]> {
    return this.request<Notification[]>(`/users/notifications?unread_only=${unreadOnly}`);
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await this.request(`/users/notifications/${notificationId}/read`, { method: 'PUT' });
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.request('/users/notifications/read-all', { method: 'PUT' });
  }

  // Dashboard
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // This would be a custom endpoint combining all data
    const [metrics, latestLog, logs] = await Promise.all([
      this.getLatestMetrics(),
      this.getLatestLog(),
      this.getDailyLogs({ limit: 7 }),
    ]);

    return {
      current_7day_avg_weight: metrics?.avg_weight || null,
      drift_status: metrics?.drift_status || 'STABLE',
      current_target_calories: (await this.getSettings())?.initial_target_calories || null,
      maintenance_estimate: metrics?.maintenance_estimate || null,
      weekly_adjustment: metrics?.calorie_adjustment || 0,
      performance_correlation: metrics?.performance_correlation || null,
      fatigue_risk_index: metrics?.fatigue_risk_index || null,
      latest_daily_log: latestLog,
      recent_metrics: metrics ? [metrics] : [],
    };
  }

  // Missed Days
  async getMissedDays(): Promise<MissedDay[]> {
    return this.request<MissedDay[]>('/missed-days/');
  }

  async createMissedDay(missedDay: MissedDayCreate): Promise<MissedDay> {
    return this.request<MissedDay>('/missed-days/', {
      method: 'POST',
      body: JSON.stringify(missedDay),
    });
  }

  async deleteMissedDay(missedDayId: string): Promise<void> {
    await this.request(`/missed-days/${missedDayId}`, { method: 'DELETE' });
  }

  // Weekly Reports
  async getCurrentWeekReport(): Promise<any> {
    return this.request('/reports/weekly/current');
  }

  async getWeekReport(year: number, month: number, day: number): Promise<any> {
    return this.request(`/reports/weekly/${year}/${month}/${day}`);
  }

  async getAllWeeklyReports(limit: number = 12): Promise<any[]> {
    return this.request(`/reports/weekly/?limit=${limit}`);
  }

  // Monthly Reports
  async getCurrentMonthReport(): Promise<any> {
    return this.request('/reports/monthly/current');
  }

  async getMonthReport(year: number, month: number): Promise<any> {
    return this.request(`/reports/monthly/${year}/${month}`);
  }

  async getAllMonthlyReports(limit: number = 12): Promise<any[]> {
    return this.request(`/reports/monthly/?limit=${limit}`);
  }

  // Streaks
  async getStreak(): Promise<{current_streak: number; longest_streak: number; last_log_date: string | null; total_logged_days: number}> {
    return this.request('/reports/streaks');
  }

  async refreshStreak(): Promise<any> {
    return this.request('/reports/streaks/refresh', { method: 'POST' });
  }

  // Advanced Metrics with Defaults
  async getAdvancedMetricsWithDefaults(): Promise<any> {
    return this.request('/reports/advanced-metrics');
  }

  // Generate Notifications
  async generateNotifications(): Promise<any> {
    return this.request('/reports/generate-notifications', { method: 'POST' });
  }
}

export const api = new ApiClient();
