'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { DailyLog } from '@/types';
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
  Filter,
} from 'lucide-react';

interface DateRangeSummary {
  startDate: string;
  endDate: string;
  totalDays: number;
  totalLogs: number;
  avgWeight: number | null;
  weightChange: number;
  avgCalories: number | null;
  avgSleep: number | null;
  avgRecovery: number | null;
  avgPerformance: number | null;
  avgStress: number | null;
  totalCaloriesIn: number;
  totalCaloriesBurned: number;
  // Macros
  avgProtein: number | null;
  avgCarbs: number | null;
  avgFats: number | null;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  // End Macros
  missedDays: number;
  missedDates: string[];
}

export default function MonthlyMetricsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [dateRange, setDateRange] = useState<{start: Date; end: Date}>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date()
  });
  const [summary, setSummary] = useState<DateRangeSummary | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'range'>('month');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (dailyLogs.length > 0) {
      calculateSummary();
    }
  }, [dateRange, dailyLogs, viewMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      const logs = await api.getDailyLogs({ limit: 500 });
      setDailyLogs(logs);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = () => {
    const startStr = dateRange.start.toISOString().split('T')[0];
    const endStr = dateRange.end.toISOString().split('T')[0];
    
    const filteredLogs = dailyLogs.filter(log => {
      const logDate = log.date;
      return logDate >= startStr && logDate <= endStr;
    });

    if (filteredLogs.length === 0) {
      setSummary(null);
      return;
    }

    const loggedDates = new Set(filteredLogs.map(l => l.date));
    
    // Calculate all dates in range
    const allDates: string[] = [];
    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      allDates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    const missedDates = allDates.filter(d => !loggedDates.has(d));

    // Calculate averages
    const weights = filteredLogs.filter(l => l.bodyweight !== null).map(l => l.bodyweight as number);
    const calories = filteredLogs.map(l => l.calories_intake || 0);
    const sleep = filteredLogs.filter(l => l.sleep_hours !== null).map(l => l.sleep_hours || 0);
    const recovery = filteredLogs.filter(l => l.recovery_score !== null).map(l => l.recovery_score || 0);
    const performance = filteredLogs.filter(l => l.workout_performance !== null).map(l => l.workout_performance || 0);
    const stress = filteredLogs.filter(l => l.stress_level !== null).map(l => l.stress_level || 0);
    // Macros
    const protein = filteredLogs.filter(l => l.protein !== null).map(l => l.protein || 0);
    const carbs = filteredLogs.filter(l => l.carbs !== null).map(l => l.carbs || 0);
    const fats = filteredLogs.filter(l => l.fats !== null).map(l => l.fats || 0);

    // Calculate weight change (first to last logged weight)
    const sortedByDate = [...filteredLogs].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const firstWeight = sortedByDate[0]?.bodyweight;
    const lastWeight = sortedByDate[sortedByDate.length - 1]?.bodyweight;
    const weightChange = (firstWeight && lastWeight) ? lastWeight - firstWeight : 0;

    setSummary({
      startDate: startStr,
      endDate: endStr,
      totalDays: allDates.length,
      totalLogs: filteredLogs.length,
      avgWeight: weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : null,
      weightChange,
      avgCalories: calories.length > 0 ? calories.reduce((a, b) => a + b, 0) / calories.length : null,
      avgSleep: sleep.length > 0 ? sleep.reduce((a, b) => a + b, 0) / sleep.length : null,
      avgRecovery: recovery.length > 0 ? recovery.reduce((a, b) => a + b, 0) / recovery.length : null,
      avgPerformance: performance.length > 0 ? performance.reduce((a, b) => a + b, 0) / performance.length : null,
      avgStress: stress.length > 0 ? stress.reduce((a, b) => a + b, 0) / stress.length : null,
      totalCaloriesIn: calories.reduce((a, b) => a + b, 0),
      totalCaloriesBurned: filteredLogs.reduce((a, b) => a + b.calories_burned, 0),
      // Macros
      avgProtein: protein.length > 0 ? Math.round(protein.reduce((a, b) => a + b, 0) / protein.length) : null,
      avgCarbs: carbs.length > 0 ? Math.round(carbs.reduce((a, b) => a + b, 0) / carbs.length) : null,
      avgFats: fats.length > 0 ? Math.round(fats.reduce((a, b) => a + b, 0) / fats.length) : null,
      totalProtein: protein.reduce((a, b) => a + b, 0),
      totalCarbs: carbs.reduce((a, b) => a + b, 0),
      totalFats: fats.reduce((a, b) => a + b, 0),
      // End Macros
      missedDays: missedDates.length,
      missedDates
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(dateRange.start);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    
    const firstDay = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
    const lastDay = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0);
    
    setDateRange({ start: firstDay, end: lastDay });
  };

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    const newDate = new Date(value);
    if (type === 'start') {
      setDateRange({ start: newDate, end: newDate > dateRange.end ? newDate : dateRange.end });
    } else {
      setDateRange({ start: dateRange.start, end: newDate });
    }
    setViewMode('range');
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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
                  TIME SUMMARY
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'month' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('month');
                  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                  const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
                  setDateRange({ start: firstDay, end: lastDay });
                }}
                className={viewMode === 'month' ? 'bg-gold-600 hover:bg-gold-700' : 'border-gold-700 text-gold-400'}
              >
                Month
              </Button>
              <Button
                variant={viewMode === 'range' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('range')}
                className={viewMode === 'range' ? 'bg-gold-600 hover:bg-gold-700' : 'border-gold-700 text-gold-400'}
              >
                <Filter className="w-4 h-4 mr-1" />
                Custom Range
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          {viewMode === 'month' ? (
            <>
              <Button
                variant="outline"
                onClick={() => navigateMonth('prev')}
                className="border-gold-700 text-gold-400 hover:bg-gold-900/30"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">
                  {monthNames[dateRange.start.getMonth()]} {dateRange.start.getFullYear()}
                </h2>
                <p className="text-gray-400 text-sm">
                  {summary?.totalLogs || 0} days tracked
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigateMonth('next')}
                disabled={new Date().getMonth() === dateRange.start.getMonth() && new Date().getFullYear() === dateRange.start.getFullYear()}
                className="border-gold-700 text-gold-400 hover:bg-gold-900/30 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <div className="w-full flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-sm">From:</label>
                <input
                  type="date"
                  value={dateRange.start.toISOString().split('T')[0]}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="bg-dark-200 border border-dark-300 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-sm">To:</label>
                <input
                  type="date"
                  value={dateRange.end.toISOString().split('T')[0]}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="bg-dark-200 border border-dark-300 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold-500 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {summary ? (
          <>
            {/* Date Range Info */}
            <Card className="mb-8 bg-dark-100 border-dark-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Date Range</p>
                    <p className="text-white text-lg font-bold">
                      {new Date(summary.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - 
                      {new Date(summary.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Tracking</p>
                    <p className="text-gold-400 text-lg font-bold">
                      {summary.totalLogs} / {summary.totalDays} days ({Math.round((summary.totalLogs / summary.totalDays) * 100)}%)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weight Section */}
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
                        {summary.avgWeight ? `${formatNumber(summary.avgWeight, 1)} kg` : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover bg-dark-100 border-dark-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      summary.weightChange > 0 
                        ? 'bg-gradient-to-br from-power-500 to-power-600' 
                        : summary.weightChange < 0
                          ? 'bg-gradient-to-br from-gold-500 to-gold-600'
                          : 'bg-gradient-to-br from-steel-500 to-steel-600'
                    }`}>
                      {summary.weightChange > 0 
                        ? <TrendingUp className="w-6 h-6 text-white" />
                        : summary.weightChange < 0
                          ? <TrendingDown className="w-6 h-6 text-white" />
                          : <ActivityIcon className="w-6 h-6 text-white" />
                      }
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">Weight Change</p>
                      <p className={`text-2xl font-bold ${
                        summary.weightChange > 0 
                          ? 'text-power-400' 
                          : summary.weightChange < 0
                            ? 'text-gold-400'
                            : 'text-steel-400'
                      }`}>
                        {summary.weightChange > 0 ? '+' : ''}{formatNumber(summary.weightChange, 1)} kg
                      </p>
                    </div>
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
                        {summary.totalLogs}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-power-400" />
                    <span className="text-sm text-power-400">
                      {summary.missedDays} missed day{summary.missedDays !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calories Section */}
            <Card className="mb-8 bg-dark-100 border-dark-200">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-500 to-power-br from-gold-500 flex items-center justify-center">
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
                      {summary.avgCalories ? formatCalories(summary.avgCalories) : '-'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl">
                    <p className="text-xs text-gold-400 uppercase font-bold mb-1">Total In</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCalories(summary.totalCaloriesIn)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl">
                    <p className="text-xs text-power-400 uppercase font-bold mb-1">Total Burned</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCalories(summary.totalCaloriesBurned)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl">
                    <p className="text-xs text-steel-400 uppercase font-bold mb-1">Net Total</p>
                    <p className={`text-2xl font-bold ${
                      summary.totalCaloriesIn - summary.totalCaloriesBurned > 0 
                        ? 'text-power-400' 
                        : 'text-gold-400'
                    }`}>
                      {formatCalories(summary.totalCaloriesIn - summary.totalCaloriesBurned)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Macros Section */}
            {(summary.avgProtein || summary.avgCarbs || summary.avgFats) && (
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
                      <p className="text-xl font-bold text-white">
                        {summary.avgProtein ? `${summary.avgProtein}g` : '-'}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-dark-200 rounded-xl">
                      <p className="text-xs text-blue-400 uppercase font-bold mb-1">Total Protein</p>
                      <p className="text-xl font-bold text-white">
                        {summary.totalProtein ? `${summary.totalProtein}g` : '-'}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-dark-200 rounded-xl">
                      <p className="text-xs text-yellow-400 uppercase font-bold mb-1">Avg Carbs</p>
                      <p className="text-xl font-bold text-white">
                        {summary.avgCarbs ? `${summary.avgCarbs}g` : '-'}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-dark-200 rounded-xl">
                      <p className="text-xs text-yellow-400 uppercase font-bold mb-1">Total Carbs</p>
                      <p className="text-xl font-bold text-white">
                        {summary.totalCarbs ? `${summary.totalCarbs}g` : '-'}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-dark-200 rounded-xl">
                      <p className="text-xs text-red-400 uppercase font-bold mb-1">Avg Fats</p>
                      <p className="text-xl font-bold text-white">
                        {summary.avgFats ? `${summary.avgFats}g` : '-'}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-dark-200 rounded-xl">
                      <p className="text-xs text-red-400 uppercase font-bold mb-1">Total Fats</p>
                      <p className="text-xl font-bold text-white">
                        {summary.totalFats ? `${summary.totalFats}g` : '-'}
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
                      {summary.avgSleep ? formatNumber(summary.avgSleep, 1) + 'h' : '-'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl">
                    <Moon className="w-6 h-6 mx-auto mb-2 text-gold-400" />
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Recovery</p>
                    <p className="text-xl font-bold text-white">
                      {summary.avgRecovery ? formatNumber(summary.avgRecovery, 1) + '/10' : '-'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl">
                    <Dumbbell className="w-6 h-6 mx-auto mb-2 text-power-400" />
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Performance</p>
                    <p className="text-xl font-bold text-white">
                      {summary.avgPerformance ? formatNumber(summary.avgPerformance, 1) + '/10' : '-'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl">
                    <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-400" />
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Stress</p>
                    <p className="text-xl font-bold text-white">
                      {summary.avgStress ? formatNumber(summary.avgStress, 1) + '/10' : '-'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl">
                    <Zap className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Consistency</p>
                    <p className="text-xl font-bold text-white">
                      {Math.round((summary.totalLogs / summary.totalDays) * 100)}%
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
              <p className="text-gray-400 text-lg">No data for this period</p>
              <p className="text-gray-500 text-sm">Start tracking to see your metrics</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
