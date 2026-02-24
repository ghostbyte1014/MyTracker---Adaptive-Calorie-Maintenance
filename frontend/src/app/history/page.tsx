'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { DailyLog, SystemMetrics, MissedDay } from '@/types';
import { formatNumber, formatCalories } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  Flame,
  Dumbbell,
  Moon,
  Activity as ActivityIcon,
  Trash2,
} from 'lucide-react';

type TabType = 'logs' | 'metrics' | 'missed';

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('logs');
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics[]>([]);
  const [missedDaysList, setMissedDaysList] = useState<MissedDay[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [logs, metrics, missed] = await Promise.all([
        api.getDailyLogs({ limit: 90 }),
        api.getSystemMetrics(52),
        api.getMissedDays(),
      ]);
      setDailyLogs(logs);
      setSystemMetrics(metrics);
      setMissedDaysList(missed);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this log?')) return;
    try {
      await api.deleteDailyLog(logId);
      setDailyLogs((prev) => prev.filter((log) => log.id !== logId));
    } catch (error) {
      console.error('Failed to delete log:', error);
    }
  };

  const handleDeleteMissedDay = async (missedDayId: string) => {
    if (!confirm('Are you sure you want to delete this missed day?')) return;
    try {
      await api.deleteMissedDay(missedDayId);
      setMissedDaysList((prev) => prev.filter((m) => m.id !== missedDayId));
    } catch (error) {
      console.error('Failed to delete missed day:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-500 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-gold-900 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-gold-400 font-bold tracking-wider uppercase">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-500">
      <header className="bg-dark-200/90 backdrop-blur-lg border-b border-dark-300 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/dashboard')}
                className="text-gray-400 hover:text-gray-200 hover:bg-dark-300"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-600 to-gold-700 flex items-center justify-center shadow-lg glow-gold">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold gradient-text tracking-tight">
                  HISTORY
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['logs', 'metrics', 'missed'] as TabType[]).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'primary' : 'outline'}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab 
                ? 'bg-gold-600 hover:bg-gold-700 text-white' 
                : 'border-gold-700 text-gold-400 hover:bg-gold-900/30'
              }
            >
              {tab === 'logs' && 'DAILY LOGS'}
              {tab === 'metrics' && 'WEEKLY METRICS'}
              {tab === 'missed' && 'MISSED DAYS'}
            </Button>
          ))}
        </div>

        {/* Daily Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {dailyLogs.length === 0 ? (
              <Card className="bg-dark-100 border-dark-200">
                <CardContent className="py-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400 text-lg">No daily logs yet</p>
                  <p className="text-gray-500 text-sm">Start tracking to see your history</p>
                </CardContent>
              </Card>
            ) : (
              dailyLogs.map((log) => (
                <Card key={log.id} className="bg-dark-100 border-dark-200 card-hover">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-gold-400 font-bold text-lg">{formatDate(log.date)}</p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-gray-400">
                            <Flame className="w-4 h-4 inline mr-1" />
                            {formatCalories(log.calories_intake)} kcal
                          </span>
                          {log.bodyweight && (
                            <span className="text-gray-400">
                              <TrendingUp className="w-4 h-4 inline mr-1" />
                              {log.bodyweight} kg
                            </span>
                          )}
                          {log.sleep_hours && (
                            <span className="text-gray-400">
                              <Moon className="w-4 h-4 inline mr-1" />
                              {log.sleep_hours}h sleep
                            </span>
                          )}
                          {log.recovery_score && (
                            <span className="text-gray-400">
                              <ActivityIcon className="w-4 h-4 inline mr-1" />
                              Recovery: {log.recovery_score}/10
                            </span>
                          )}
                          {log.workout_performance && (
                            <span className="text-gray-400">
                              <Dumbbell className="w-4 h-4 inline mr-1" />
                              Perf: {log.workout_performance}/10
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLog(log.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* System Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            {systemMetrics.length === 0 ? (
              <Card className="bg-dark-100 border-dark-200">
                <CardContent className="py-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400 text-lg">No weekly metrics yet</p>
                  <p className="text-gray-500 text-sm">Weekly metrics are calculated automatically</p>
                </CardContent>
              </Card>
            ) : (
              systemMetrics.map((metric) => (
                <Card key={metric.id} className="bg-dark-100 border-dark-200 card-hover">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="text-gold-400 font-bold text-lg">
                            Week of {formatDate(metric.week_start)}
                          </p>
                          <Badge variant={metric.drift_status === 'STABLE' ? 'success' : 'warning'}>
                            {metric.drift_status}
                          </Badge>
                        </div>
                        <div className="flex gap-6 mt-3 text-sm">
                          <span className="text-gray-400">
                            Avg Weight: {metric.avg_weight ? `${metric.avg_weight} kg` : '-'}
                          </span>
                          <span className="text-gray-400">
                            Change: 
                            {metric.weight_change !== null && (
                              <span className={metric.weight_change > 0 ? 'text-power-400 ml-1' : 'text-gold-400 ml-1'}>
                                {metric.weight_change > 0 ? '+' : ''}{formatNumber(metric.weight_change, 1)} kg
                              </span>
                            )}
                          </span>
                          <span className="text-gray-400">
                            Maintenance: {metric.maintenance_estimate ? formatCalories(metric.maintenance_estimate) : '-'}
                          </span>
                          <span className="text-gray-400">
                            Adjustment: 
                            <span className={metric.calorie_adjustment >= 0 ? 'text-gold-400 ml-1' : 'text-power-400 ml-1'}>
                              {metric.calorie_adjustment >= 0 ? '+' : ''}{metric.calorie_adjustment}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Missed Days Tab */}
        {activeTab === 'missed' && (
          <div className="space-y-4">
            {missedDaysList.length === 0 ? (
              <Card className="bg-dark-100 border-dark-200">
                <CardContent className="py-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400 text-lg">No missed days recorded</p>
                  <p className="text-gray-500 text-sm">Great job staying consistent!</p>
                </CardContent>
              </Card>
            ) : (
              missedDaysList.map((missed) => (
                <Card key={missed.id} className="bg-dark-100 border-dark-200 card-hover">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-gold-400 font-bold text-lg">{formatDate(missed.missed_date)}</p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-gray-400">
                            Reason: {missed.reason}
                          </span>
                          {missed.estimated_calories && (
                            <span className="text-gray-400">
                              Est. Calories: {missed.estimated_calories}
                            </span>
                          )}
                          {missed.notes && (
                            <span className="text-gray-500">
                              Note: {missed.notes}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMissedDay(missed.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
