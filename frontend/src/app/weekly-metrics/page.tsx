'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
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
  ChevronLeft,
  ChevronRight,
  Target,
  Zap,
  AlertTriangle,
  Scale,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface WeeklyReport {
  week_start: string;
  week_end: string;
  avg_weight: number | null;
  weight_change: number;
  total_logs: number;
  total_days: number;
  missed_days: number;
  missed_dates: string[];
  avg_calories: number | null;
  total_calories_in: number;
  total_calories_burned: number;
  avg_sleep: number | null;
  avg_recovery: number | null;
  avg_performance: number | null;
  avg_stress: number | null;
  // Macros
  avg_protein: number | null;
  avg_carbs: number | null;
  avg_fats: number | null;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  // End Macros
  maintenance_estimate: number;
  calorie_adjustment: number;
  drift_status: string;
  performance_correlation: number | null;
  fatigue_risk_index: number;
  summary_text: string;
}

export default function WeeklyMetricsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    loadWeeklyReport();
  }, [selectedDate]);

  const loadWeeklyReport = async () => {
    setLoading(true);
    try {
      const report = await api.getWeekReport(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        selectedDate.getDate()
      );
      setWeeklyReport(report);
    } catch (error) {
      console.error('Failed to load weekly report:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setSelectedDate(newDate);
  };

  const getWeekRange = () => {
    const monday = new Date(selectedDate);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    
    return `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-500 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-gold-900 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-gold-400 font-bold tracking-wider uppercase">Loading metrics...</p>
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
                  WEEKLY METRICS
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            onClick={() => navigateWeek('prev')}
            className="border-gold-700 text-gold-400 hover:bg-gold-900/30"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">
              {getWeekRange()}
            </h2>
            <p className="text-gray-400 text-sm">
              Monday - Sunday
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigateWeek('next')}
            className="border-gold-700 text-gold-400 hover:bg-gold-900/30"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {weeklyReport ? (
          <>
            {/* Summary Text */}
            <Card className="mb-8 bg-dark-100 border-dark-200">
              <CardContent className="pt-6">
                <p className="text-gray-300 text-lg">{weeklyReport.summary_text}</p>
              </CardContent>
            </Card>

            {/* Days Tracked */}
            <div className="grid grid-cols-7 gap-2 mb-8">
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date(weeklyReport.week_start);
                date.setDate(date.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                const isMissed = weeklyReport.missed_dates?.includes(dateStr);
                
                return (
                  <div 
                    key={i}
                    className={`p-3 rounded-lg text-center ${
                      isMissed 
                        ? 'bg-power-900/30 border border-power-700/50' 
                        : 'bg-dark-200 border border-dark-300'
                    }`}
                  >
                    <p className="text-xs text-gray-400 uppercase">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-lg font-bold text-white">{date.getDate()}</p>
                    {isMissed ? (
                      <XCircle className="w-5 h-5 mx-auto text-power-400 mt-1" />
                    ) : (
                      <CheckCircle className="w-5 h-5 mx-auto text-gold-400 mt-1" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="card-hover bg-dark-100 border-dark-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center">
                      <Scale className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">Average Weight</p>
                      <p className="text-2xl font-bold text-white">
                        {weeklyReport.avg_weight ? `${formatNumber(weeklyReport.avg_weight, 1)} kg` : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${
                      weeklyReport.weight_change > 0 ? 'text-power-400' : 
                      weeklyReport.weight_change < 0 ? 'text-gold-400' : 'text-gray-400'
                    }`}>
                      {weeklyReport.weight_change > 0 ? '+' : ''}{formatNumber(weeklyReport.weight_change, 1)} kg
                    </span>
                    <span className="text-gray-500 text-sm">vs last week</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover bg-dark-100 border-dark-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-500 to-power-500 flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">Days Tracked</p>
                      <p className="text-2xl font-bold text-white">
                        {weeklyReport.total_logs} / {weeklyReport.total_days}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-power-400" />
                    <span className="text-sm text-power-400">
                      {weeklyReport.missed_days} missed day{weeklyReport.missed_days !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover bg-dark-100 border-dark-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      weeklyReport.drift_status === 'WARNING' 
                        ? 'bg-gradient-to-br from-power-500 to-power-600'
                        : 'bg-gradient-to-br from-gold-500 to-gold-600'
                    }`}>
                      {weeklyReport.drift_status === 'WARNING' ? (
                        <AlertTriangle className="w-6 h-6 text-white" />
                      ) : (
                        <ActivityIcon className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">Drift Status</p>
<Badge variant={weeklyReport.drift_status === 'WARNING' ? 'danger' : 'success'}>
                        {weeklyReport.drift_status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calories Section */}
            <Card className="mb-8 bg-dark-100 border-dark-200">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-power-500 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-white" />
                  </div>
                  <CardTitle className="text-lg font-bold text-white tracking-wide">CALORIE SUMMARY</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-dark-200 rounded-xl">
                    <p className="text-xs text-gold-400 uppercase font-bold mb-1">Avg Daily</p>
                    <p className="text-2xl font-bold text-white">
                      {weeklyReport.avg_calories ? formatCalories(weeklyReport.avg_calories) : '-'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl">
                    <p className="text-xs text-gold-400 uppercase font-bold mb-1">Total In</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCalories(weeklyReport.total_calories_in)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl">
                    <p className="text-xs text-power-400 uppercase font-bold mb-1">Total Burned</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCalories(weeklyReport.total_calories_burned)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl">
                    <p className="text-xs text-gold-400 uppercase font-bold mb-1">Adjustment</p>
                    <p className={`text-2xl font-bold ${
                      weeklyReport.calorie_adjustment > 0 ? 'text-gold-400' : 
                      weeklyReport.calorie_adjustment < 0 ? 'text-power-400' : 'text-gray-400'
                    }`}>
                      {weeklyReport.calorie_adjustment > 0 ? '+' : ''}{weeklyReport.calorie_adjustment}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Macros Section */}
            {(weeklyReport.avg_protein || weeklyReport.avg_carbs || weeklyReport.avg_fats) && (
              <Card className="mb-8 bg-dark-100 border-dark-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-steel-500 to-steel-600 flex items-center justify-center">
                      <Dumbbell className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-white tracking-wide">MACROS SUMMARY</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="text-center p-4 bg-dark-200 rounded-xl">
                      <p className="text-xs text-blue-400 uppercase font-bold mb-1">Avg Protein</p>
                      <p className-bold text-white">
="text-xl font                        {weeklyReport.avg_protein ? `${weeklyReport.avg_protein}g` : '-'}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-dark-200 rounded-xl">
                      <p className="text-xs text-blue-400 uppercase font-bold mb-1">Total Protein</p>
                      <p className="text-xl font-bold text-white">
                        {weeklyReport.total_protein ? `${weeklyReport.total_protein}g` : '-'}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-dark-200 rounded-xl">
                      <p className="text-xs text-yellow-400 uppercase font-bold mb-1">Avg Carbs</p>
                      <p className="text-xl font-bold text-white">
                        {weeklyReport.avg_carbs ? `${weeklyReport.avg_carbs}g` : '-'}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-dark-200 rounded-xl">
                      <p className="text-xs text-yellow-400 uppercase font-bold mb-1">Total Carbs</p>
                      <p className="text-xl font-bold text-white">
                        {weeklyReport.total_carbs ? `${weeklyReport.total_carbs}g` : '-'}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-dark-200 rounded-xl">
                      <p className="text-xs text-red-400 uppercase font-bold mb-1">Avg Fats</p>
                      <p className="text-xl font-bold text-white">
                        {weeklyReport.avg_fats ? `${weeklyReport.avg_fats}g` : '-'}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-dark-200 rounded-xl">
                      <p className="text-xs text-red-400 uppercase font-bold mb-1">Total Fats</p>
                      <p className="text-xl font-bold text-white">
                        {weeklyReport.total_fats ? `${weeklyReport.total_fats}g` : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Daily Ratings Section */}
            <Card className="mb-8 bg-dark-100 border-dark-200">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-steel-500 to-steel-600 flex items-center justify-center">
                    <ActivityIcon className="w-4 h-4 text-white" />
                  </div>
                  <CardTitle className="text-lg font-bold text-white tracking-wide">DAILY RATINGS AVERAGE</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-dark-200 rounded-xl">
                    <Moon className="w-6 h-6 mx-auto mb-2 text-steel-400" />
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Sleep</p>
                    <p className="text-xl font-bold text-white">
                      {weeklyReport.avg_sleep ? formatNumber(weeklyReport.avg_sleep, 1) + 'h' : '-'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl">
                    <Moon className="w-6 h-6 mx-auto mb-2 text-gold-400" />
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Recovery</p>
                    <p className="text-xl font-bold text-white">
                      {weeklyReport.avg_recovery ? formatNumber(weeklyReport.avg_recovery, 1) + '/10' : '-'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl">
                    <Dumbbell className="w-6 h-6 mx-auto mb-2 text-power-400" />
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Performance</p>
                    <p className="text-xl font-bold text-white">
                      {weeklyReport.avg_performance ? formatNumber(weeklyReport.avg_performance, 1) + '/10' : '-'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl">
                    <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-400" />
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Stress</p>
                    <p className="text-xl font-bold text-white">
                      {weeklyReport.avg_stress ? formatNumber(weeklyReport.avg_stress, 1) + '/10' : '-'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl">
                    <Zap className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Fatigue Risk</p>
                    <p className="text-xl font-bold text-white">
                      {formatNumber(weeklyReport.fatigue_risk_index, 1)}/10
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="bg-dark-100 border-dark-200">
            <CardContent className="py-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 text-lg">No data for this week</p>
              <p className="text-gray-500 text-sm">Start tracking to see your weekly metrics</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
