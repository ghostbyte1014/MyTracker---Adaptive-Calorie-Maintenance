'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MetricCard } from '@/components/ui/MetricCard';
import { FloatingActionBar } from '@/components/ui/FloatingActionBar';
import { Signature } from '@/components/ui/Signature';
import { WeightChart } from '@/components/charts/WeightChart';
import { CaloriesChart } from '@/components/charts/CaloriesChart';
import { PerformanceChart } from '@/components/charts/PerformanceChart';
import { api } from '@/lib/api';
import { DailyLog, SystemMetrics, AdvancedMetrics, UserSettings } from '@/types';
import { formatNumber, formatCalories } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Activity, 
  Zap, 
  AlertTriangle,
  Target,
  Flame,
  Dumbbell,
  Trophy,
  Star,
  ChevronDown,
  ChevronUp,
  Calendar,
  History,
  Settings,
  Bell,
  FlameIcon,
  Award
} from 'lucide-react';

const MOTIVATIONAL_QUOTES = [
  "IRON PIGEON - Every rep counts! 💪",
  "DOMINATE YOUR GOALS! 🔥",
  "CONSISTENCY IS KING! 👑",
  "BUILD YOUR LEGACY! 🏆",
  "NO EXCUSES - JUST RESULTS! ⭐",
  "PUSH YOUR LIMITS! 🎯",
  "BE STRONGER THAN YOUR EXCUSES! 💪",
  "EXCELLENCE IS A HABIT! ✨",
];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [latestMetrics, setLatestMetrics] = useState<SystemMetrics | null>(null);
  const [advancedMetrics, setAdvancedMetrics] = useState<AdvancedMetrics | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [streak, setStreak] = useState<{current_streak: number; longest_streak: number; last_log_date: string | null; total_logged_days: number}>({ current_streak: 0, longest_streak: 0, last_log_date: null, total_logged_days: 0 });

  useEffect(() => {
    loadData();
    setQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
  }, []);

  const loadData = async () => {
    try {
      const [logs, metrics, advanced, settingsData, streakData] = await Promise.all([
        api.getDailyLogs({ limit: 30 }),
        api.getLatestMetrics(),
        showAdvanced ? api.getAdvancedMetrics() : Promise.resolve(null),
        api.getSettings(),
        api.getStreak(),
      ]);
      setDailyLogs(logs);
      setLatestMetrics(metrics);
      setAdvancedMetrics(advanced);
      setSettings(settingsData);
      setStreak(streakData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdvanced = async () => {
    if (!showAdvanced) {
      setIsLoadingMetrics(true);
      try {
        const advanced = await api.getAdvancedMetrics();
        setAdvancedMetrics(advanced);
      } catch (error) {
        console.error('Failed to load advanced metrics:', error);
      } finally {
        setIsLoadingMetrics(false);
      }
    }
    setShowAdvanced(!showAdvanced);
  };

  const handleLogout = async () => {
    await api.logout();
    router.push('/');
  };

  const getDriftBadgeVariant = (status: string) => {
    switch (status) {
      case 'WARNING':
        return 'warning';
      case 'STABLE':
        return 'success';
      default:
        return 'default';
    }
  };

  const getFatigueColor = (index: number | null) => {
    if (index === null) return 'text-gray-500';
    if (index > 7) return 'text-power-400';
    if (index > 5) return 'text-yellow-400';
    return 'text-gold-400';
  };

  const getWeightTrend = () => {
    if (!latestMetrics?.weight_change) return null;
    return latestMetrics.weight_change > 0 ? 'up' : latestMetrics.weight_change < 0 ? 'down' : 'stable';
  };

  // Get target from profile settings (from profile)
  const targetFromProfile = settings?.initial_target_calories || 2000;

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-500 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-gold-900 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
            <Trophy className="w-8 h-8 text-gold-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-6 text-gold-400 font-bold tracking-wider uppercase">Loading your stats...</p>
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
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-600 to-gold-700 flex items-center justify-center shadow-lg glow-gold">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold gradient-text tracking-tight">
                  MYTRACKER
                </h1>
              </div>
              <span className="text-dark-400">|</span>
              <span className="text-gold-400/70 font-medium tracking-wide">DASHBOARD</span>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                size="sm"
                onClick={toggleAdvanced}
                className="border-gold-700 text-gold-400 hover:bg-gold-900/30 hover:border-gold-600"
              >
                {showAdvanced ? (
                  <>ADVANCED <ChevronUp className="w-4 h-4 ml-1" /></>
                ) : (
                  <>ADVANCED <ChevronDown className="w-4 h-4 ml-1" /></>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-200 hover:bg-dark-300"
              >
                LOGOUT
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-gold-700 via-gold-600 to-gold-800 text-white shadow-2xl border border-gold-500/30">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
              <Trophy className="w-10 h-10" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-wide">{quote}</p>
              <p className="text-gold-200 text-sm mt-1">
                DOMINATE YOUR DAY! Let's get it! 💪
              </p>
            </div>
          </div>
        </div>

        {/* Row 1: 7-Day Avg, Target, Maintenance, Weekly Adjustment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Card className="stat-card stat-card-gold">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-gold-400 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest text-gold-500/70">7-Day Avg</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatNumber(latestMetrics?.avg_weight || dailyLogs[0]?.rolling_7day_avg_weight, 1)} kg
              </p>
              {getWeightTrend() && (
                <div className="flex items-center gap-1 mt-1">
                  {getWeightTrend() === 'up' && <TrendingUp className="w-3 h-3 text-power-400" />}
                  {getWeightTrend() === 'down' && <TrendingDown className="w-3 h-3 text-gold-400" />}
                  {getWeightTrend() === 'stable' && <Minus className="w-3 h-3 text-gray-500" />}
                  <span className={`text-xs ${getWeightTrend() === 'up' ? 'text-power-400' : getWeightTrend() === 'down' ? 'text-gold-400' : 'text-gray-500'}`}>
                    {latestMetrics && latestMetrics.weight_change && latestMetrics.weight_change > 0 ? '+' : ''}{formatNumber(latestMetrics?.weight_change, 1)} kg
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* TARGET - FROM PROFILE SETTINGS */}
          <Card className="stat-card stat-card-gold">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-gold-400 mb-2">
                <Target className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest text-gold-500/70">Target (Profile)</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatCalories(targetFromProfile)}
              </p>
            </CardContent>
          </Card>

          {/* MAINTENANCE - CALCULATED */}
          <Card className="stat-card stat-card-gold">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-gold-400 mb-2">
                <Flame className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest text-gold-500/70">MAINTENANCE</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {latestMetrics?.maintenance_estimate ? formatCalories(latestMetrics.maintenance_estimate) : '-'}
              </p>
            </CardContent>
          </Card>

          <Card className={`stat-card ${(latestMetrics?.calorie_adjustment || 0) >= 0 ? 'stat-card-gold' : 'stat-card-power'}`}>
            <CardContent className="pt-4">
              <div className={`flex items-center gap-2 mb-2 ${(latestMetrics?.calorie_adjustment || 0) >= 0 ? 'text-gold-400' : 'text-power-400'}`}>
                <Zap className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest text-gold-500/70">WEEKLY ADJ</span>
              </div>
              <p className={`text-2xl font-bold ${(latestMetrics?.calorie_adjustment || 0) >= 0 ? 'text-gold-400' : 'text-power-400'}`}>
                {(latestMetrics?.calorie_adjustment || 0) >= 0 ? '+' : ''}{latestMetrics?.calorie_adjustment || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Status, Performance Correlation, Fatigue Risk, Streak */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="stat-card stat-card-steel">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-steel-400 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest text-steel-500/70">Status</span>
              </div>
              <Badge variant={getDriftBadgeVariant(latestMetrics?.drift_status || 'STABLE')} className="mt-1 bg-gold-900/50 text-gold-400 border-gold-700">
                {latestMetrics?.drift_status || 'STABLE'}
              </Badge>
            </CardContent>
          </Card>

          <Card className="stat-card stat-card-steel">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-steel-400 mb-2">
                <Dumbbell className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest text-steel-500/70">PERF. CORR</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatNumber(latestMetrics?.performance_correlation, 2) || '-'}
              </p>
            </CardContent>
          </Card>

          <Card className="stat-card stat-card-power">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-power-400 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest text-power-500/70">FATIGUE RISK</span>
              </div>
              <p className={`text-2xl font-bold ${getFatigueColor(latestMetrics?.fatigue_risk_index || null)}`}>
                {formatNumber(latestMetrics?.fatigue_risk_index, 1) || '-'}
              </p>
            </CardContent>
          </Card>

          {/* STREAK CARD */}
          <Card className="stat-card stat-card-gold">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-gold-400 mb-2">
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest text-gold-500/70">STREAK</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {streak.current_streak} <span className="text-sm text-gold-400">days</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Best: {streak.longest_streak} days
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-white tracking-wide">WEIGHT TREND</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {dailyLogs.length > 0 ? (
                <WeightChart data={dailyLogs} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-gray-400">No data yet - start grinding!</p>
                    <p className="text-sm text-gray-600">Log your metrics to see progress</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-power-500 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-white tracking-wide">CALORIES TREND</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {dailyLogs.length > 0 ? (
                <CaloriesChart data={dailyLogs} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Flame className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-gray-400">No data yet - start grinding!</p>
                    <p className="text-sm text-gray-600">Log your metrics to see progress</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 card-hover">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-steel-500 to-steel-600 flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-lg font-bold text-white tracking-wide">PERFORMANCE VS RECOVERY VS STRESS</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {dailyLogs.length > 0 ? (
              <PerformanceChart data={dailyLogs} />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-gray-400">No data yet - start grinding!</p>
                  <p className="text-sm text-gray-600">Log your metrics to track performance</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {showAdvanced && (
          <Card className="mb-8 shadow-2xl border border-gold-700/30 bg-dark-100">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-600 to-gold-700 flex items-center justify-center glow-gold">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold gradient-text">ADVANCED ANALYTICS</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingMetrics ? (
                <div className="h-32 flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-gold-900 border-t-gold-500 rounded-full animate-spin"></div>
                </div>
              ) : advancedMetrics ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-dark-200 rounded-xl border border-dark-300">
                    <p className="text-xs text-gold-500 font-bold mb-1 uppercase">Weight Volatility</p>
                    <p className="text-xl font-bold text-white">{formatNumber(advancedMetrics.weight_volatility, 2)} kg</p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl border border-dark-300">
                    <p className="text-xs text-gold-500 font-bold mb-1 uppercase">Surplus Accuracy</p>
                    <p className="text-xl font-bold text-white">{formatNumber(advancedMetrics.surplus_accuracy, 1)}%</p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl border border-dark-300">
                    <p className="text-xs text-gold-500 font-bold mb-1 uppercase">Maintenance Prec.</p>
                    <p className="text-xl font-bold text-white">{formatNumber(advancedMetrics.maintenance_precision, 1)}%</p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl border border-dark-300">
                    <p className="text-xs text-gold-500 font-bold mb-1 uppercase">Recovery-Perf</p>
                    <p className="text-xl font-bold text-white">{formatNumber(advancedMetrics.recovery_performance_consistency, 1)}</p>
                  </div>
                  <div className="text-center p-4 bg-dark-200 rounded-xl border border-dark-300">
                    <p className="text-xs text-gold-500 font-bold mb-1 uppercase">Stress Resilience</p>
                    <p className="text-xl font-bold text-white">{formatNumber(advancedMetrics.stress_resilience, 1)}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Enable advanced tracking to unlock insights</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </main>

      {/* Floating Bottom Quick Actions Bar */}
      <FloatingActionBar />
    </div>
  );
}
