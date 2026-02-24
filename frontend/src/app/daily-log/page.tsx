'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { DailyLog, UserSettings, MissedDay, SystemMetrics } from '@/types';
import { 
  CheckCircle2, 
  Loader2, 
  ArrowLeft,
  Save,
  Flame,
  Dumbbell,
  Moon,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Trophy,
  Target,
  Activity,
  Zap,
  CalendarOff,
  Plus,
  X,
  Info,
  Calculator
} from 'lucide-react';

export default function DailyLogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [latestMetrics, setLatestMetrics] = useState<SystemMetrics | null>(null);
  const [existingLog, setExistingLog] = useState<DailyLog | null>(null);
  const [missedDays, setMissedDays] = useState<MissedDay[]>([]);
  const [showMissedDayModal, setShowMissedDayModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcExpression, setCalcExpression] = useState('');
  
  const [missedDayForm, setMissedDayForm] = useState({
    missed_date: '',
    reason: 'forgot',
    estimated_calories: '',
    notes: '',
  });
  
  const today = new Date().toISOString().split('T')[0];
  
  // Get target calories - prioritize from profile settings (initial_target_calories), then fall back to maintenance_estimate
  const targetCalories = useMemo(() => {
    return settings?.initial_target_calories || latestMetrics?.maintenance_estimate || 2000;
  }, [settings, latestMetrics]);
  
  const [formData, setFormData] = useState({
    date: today,
    bodyweight: '',
    target_calories: targetCalories.toString(),
    extra_calories: '',
    calories_burned: '',
    protein: '',
    carbs: '',
    fats: '',
    sleep_hours: '',
    recovery_score: '7',
    workout_performance: '7',
    stress_level: '5',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Update target calories when settings are loaded
    if (settings?.initial_target_calories) {
      setFormData(prev => ({
        ...prev,
        target_calories: settings.initial_target_calories!.toString()
      }));
    }
  }, [settings]);

  const loadData = async () => {
    try {
      const [settingsData, metricsData, todayLog, missedData] = await Promise.all([
        api.getSettings(),
        api.getLatestMetrics(),
        api.getLatestLog(),
        api.getMissedDays(),
      ]);
      setSettings(settingsData);
      setLatestMetrics(metricsData);
      setExistingLog(todayLog);
      setMissedDays(missedData || []);

      // Get target from profile settings first, then fallback to maintenance_estimate
      const target = settingsData?.initial_target_calories || metricsData?.maintenance_estimate || 2000;

      if (todayLog) {
        // Calculate extra calories (total - target)
        const extra = todayLog.calories_intake - target;
        setFormData({
          date: todayLog.date,
          bodyweight: todayLog.bodyweight?.toString() || '',
          target_calories: target.toString(),
          extra_calories: extra > 0 ? extra.toString() : '',
          calories_burned: todayLog.calories_burned?.toString() || '',
          protein: todayLog.protein?.toString() || '',
          carbs: todayLog.carbs?.toString() || '',
          fats: todayLog.fats?.toString() || '',
          sleep_hours: todayLog.sleep_hours?.toString() || '',
          recovery_score: todayLog.recovery_score?.toString() || '7',
          workout_performance: todayLog.workout_performance?.toString() || '7',
          stress_level: todayLog.stress_level?.toString() || '5',
        });
      } else {
        setFormData(prev => ({
          ...prev,
          target_calories: target.toString()
        }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const target = parseInt(formData.target_calories) || 0;
      const extra = parseInt(formData.extra_calories) || 0;
      const totalCalories = target + extra;
      
      await api.createDailyLog({
        date: formData.date,
        bodyweight: formData.bodyweight ? parseFloat(formData.bodyweight) : undefined,
        calories_intake: totalCalories,
        calories_burned: parseInt(formData.calories_burned) || 0,
        protein: parseInt(formData.protein) || 0,
        carbs: parseInt(formData.carbs) || 0,
        fats: parseInt(formData.fats) || 0,
        sleep_hours: formData.sleep_hours ? parseFloat(formData.sleep_hours) : undefined,
        recovery_score: parseInt(formData.recovery_score),
        workout_performance: parseInt(formData.workout_performance),
        stress_level: parseInt(formData.stress_level),
      });
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev: typeof formData) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleMissedDayChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setMissedDayForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAddMissedDay = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createMissedDay({
        missed_date: missedDayForm.missed_date,
        reason: missedDayForm.reason,
        estimated_calories: missedDayForm.estimated_calories ? parseInt(missedDayForm.estimated_calories) : undefined,
        notes: missedDayForm.notes || undefined,
      });
      setShowMissedDayModal(false);
      setMissedDayForm({
        missed_date: '',
        reason: 'forgot',
        estimated_calories: '',
        notes: '',
      });
      const missedData = await api.getMissedDays();
      setMissedDays(missedData || []);
    } catch (error) {
      console.error('Failed to add missed day:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMissedDay = async (id: string) => {
    try {
      await api.deleteMissedDay(id);
      setMissedDays(missedDays.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete missed day:', error);
    }
  };

  // Calculate totals
  const targetCal = parseInt(formData.target_calories) || 0;
  const extraCal = parseInt(formData.extra_calories) || 0;
  const totalCalories = targetCal + extraCal;
  const burned = parseInt(formData.calories_burned) || 0;
  const netCalories = totalCalories - burned;
  const remainingAllowance = targetCal - burned;

  const getNetCaloriesColor = () => {
    if (netCalories > 500) return 'text-power-400';
    if (netCalories > 0) return 'text-yellow-400';
    if (netCalories < -500) return 'text-steel-400';
    return 'text-gold-400';
  };

  const getNetCaloriesTrend = () => {
    if (netCalories > 0) return <TrendingUp className="w-5 h-5" />;
    if (netCalories < 0) return <TrendingDown className="w-5 h-5" />;
    return <Minus className="w-5 h-5" />;
  };

  const getRemainingColor = () => {
    if (remainingAllowance < 0) return 'text-red-400';
    if (remainingAllowance < 500) return 'text-yellow-400';
    return 'text-gold-400';
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      'forgot': 'Forgot to log',
      'sick': 'Sick/Illness',
      'travel': 'Travel',
      'busy': 'Too Busy',
      'other': 'Other',
    };
    return labels[reason] || reason;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-500 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-gold-900 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
            <Loader2 className="w-8 h-8 text-gold-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-6 text-gold-400 font-bold tracking-wider uppercase">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-500">
      <header className="bg-dark-200/90 backdrop-blur-lg border-b border-dark-300 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold gradient-text tracking-tight">
                  DAILY LOG
                </h1>
              </div>
            </div>
            {success && (
              <div className="flex items-center gap-2 text-gold-400 bg-gold-900/30 px-4 py-2 rounded-xl border border-gold-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold">SAVED!</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCalculator(!showCalculator)}
              className="text-gold-400 hover:text-gold-300 hover:bg-dark-300"
            >
              <Calculator className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {success && (
          <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-gold-700 via-gold-600 to-gold-800 text-white shadow-2xl border border-gold-500/30 animate-pulse">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
                <Trophy className="w-10 h-10" />
              </div>
              <div>
                <p className="text-xl font-bold tracking-wide">LOG SAVED!</p>
                <p className="text-gold-200 text-sm mt-1">
                  KEEP PUSHING! You're dominating! 💪
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="mb-6 card-hover bg-dark-100 border-dark-200">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-white tracking-wide">DATE</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="input-field bg-dark-200 border-dark-300 text-white"
              />
            </CardContent>
          </Card>

          <Card className="mb-6 card-hover bg-dark-100 border-dark-200">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-white tracking-wide">BODY METRICS</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">
                    Body Weight (kg) <span className="text-gray-500 text-xs ml-1">OPTIONAL</span>
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    name="bodyweight"
                    value={formData.bodyweight}
                    onChange={handleChange}
                    placeholder="e.g., 80.5"
                    className="input-field"
                  />
                </div>
                {existingLog?.rolling_7day_avg_weight && (
                  <div className="flex items-center p-4 bg-dark-200 rounded-xl border border-dark-300">
                    <div className="w-10 h-10 rounded-lg bg-gold-900/30 flex items-center justify-center mr-3">
                      <TrendingUp className="w-5 h-5 text-gold-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">7-Day Avg</p>
                      <p className="text-lg font-bold text-white">{existingLog.rolling_7day_avg_weight} kg</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* TARGET CALORIES - FROM PROFILE */}
          <Card className="mb-6 card-hover bg-dark-100 border-dark-200">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-white tracking-wide">DAILY CALORIE TARGET</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label flex items-center gap-2">
                    <Target className="w-4 h-4 text-gold-400" />
                    Target Calories (from Profile)
                    <span className="text-xs text-gray-500">(Daily Maximum)</span>
                  </label>
                  <Input
                    type="number"
                    name="target_calories"
                    value={formData.target_calories}
                    onChange={handleChange}
                    placeholder="e.g., 2200"
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Set in Profile → Daily Target Calories
                  </p>
                </div>
                <div>
                  <label className="input-label flex items-center gap-2">
                    <Plus className="w-4 h-4 text-power-400" />
                    Extra Calories
                    <span className="text-xs text-gray-500">(Optional)</span>
                  </label>
                  <Input
                    type="number"
                    name="extra_calories"
                    value={formData.extra_calories}
                    onChange={handleChange}
                    placeholder="e.g., 200"
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Extra food (post-workout meal, cheat meal, etc.)
                  </p>
                </div>
              </div>
              
              {/* Remaining Allowance Display */}
              <div className="mt-4 p-4 bg-dark-200 rounded-xl border border-dark-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-steel-400" />
                    <span className="text-gray-400 font-medium">Remaining Allowance</span>
                  </div>
                  <div className={`text-2xl font-bold ${getRemainingColor()}`}>
                    {remainingAllowance} kcal
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  How many calories you can still eat today (Target - Calories Burned)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 card-hover bg-dark-100 border-dark-200">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-power-500 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-white tracking-wide">CALORIES SUMMARY</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="input-label flex items-center gap-2">
                    <Flame className="w-4 h-4 text-gold-400" />
                    Total Calories
                  </label>
                  <div className="text-2xl font-bold text-white">
                    {totalCalories}
                  </div>
                  <p className="text-xs text-gray-500">Target + Extra</p>
                </div>
                <div>
                  <label className="input-label flex items-center gap-2">
                    <Zap className="w-4 h-4 text-power-400" />
                    Calories Burned
                  </label>
                  <Input
                    type="number"
                    name="calories_burned"
                    value={formData.calories_burned}
                    onChange={handleChange}
                    placeholder="e.g., 500"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label flex items-center gap-2">
                    {getNetCaloriesTrend()}
                    Net Calories
                  </label>
                  <div className={`text-2xl font-bold ${getNetCaloriesColor()}`}>
                    {netCalories}
                  </div>
                  <p className="text-xs text-gray-500">Total - Burned</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 card-hover bg-dark-100 border-dark-200">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-steel-500 to-steel-600 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-white tracking-wide">MACROS (g)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="input-label text-steel-400">Protein</label>
                  <Input
                    type="number"
                    name="protein"
                    value={formData.protein}
                    onChange={handleChange}
                    placeholder="e.g., 180"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label text-blue-400">Carbs</label>
                  <Input
                    type="number"
                    name="carbs"
                    value={formData.carbs}
                    onChange={handleChange}
                    placeholder="e.g., 250"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label text-yellow-400">Fats</label>
                  <Input
                    type="number"
                    name="fats"
                    value={formData.fats}
                    onChange={handleChange}
                    placeholder="e.g., 70"
                    className="input-field"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 card-hover bg-dark-100 border-dark-200">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-steel-600 to-steel-700 flex items-center justify-center">
                  <Moon className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-white tracking-wide">SLEEP & RECOVERY</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="input-label flex items-center gap-2">
                    <Moon className="w-4 h-4 text-steel-400" />
                    Sleep Hours
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    name="sleep_hours"
                    value={formData.sleep_hours}
                    onChange={handleChange}
                    placeholder="e.g., 7.5"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label flex items-center gap-2">
                    <Moon className="w-4 h-4 text-gold-400" />
                    Recovery Score
                  </label>
                  <select
                    name="recovery_score"
                    value={formData.recovery_score}
                    onChange={handleChange}
                    className="input-field"
                  >
                    {[...Array(10)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-power-400" />
                    Workout Performance
                  </label>
                  <select
                    name="workout_performance"
                    value={formData.workout_performance}
                    onChange={handleChange}
                    className="input-field"
                  >
                    {[...Array(10)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 card-hover bg-dark-100 border-dark-200">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-power-500 to-power-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-white tracking-wide">STRESS LEVEL</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div>
                <label className="input-label flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-power-400" />
                  Stress Level (1-10)
                </label>
                <select
                  name="stress_level"
                  value={formData.stress_level}
                  onChange={handleChange}
                  className="input-field"
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={saving}
            className="w-full btn-primary py-4 text-lg mb-6"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                SAVING...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                SAVE DAILY LOG
              </>
            )}
          </Button>
        </form>

        {/* Missed Days Section */}
        <Card className="mb-6 card-hover bg-dark-100 border-dark-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <CalendarOff className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-white tracking-wide">MISSED DAYS</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMissedDayModal(true)}
                className="text-gold-400 hover:text-gold-300 hover:bg-dark-300"
              >
                <Plus className="w-5 h-5 mr-1" />
                Add Missed Day
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {missedDays.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CalendarOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No missed days recorded</p>
                <p className="text-sm mt-1">Add days when you couldn't track your nutrition</p>
              </div>
            ) : (
              <div className="space-y-3">
                {missedDays.map((missedDay) => (
                  <div 
                    key={missedDay.id} 
                    className="flex items-center justify-between p-4 bg-dark-200 rounded-xl border border-dark-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center">
                        <CalendarOff className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {new Date(missedDay.missed_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-gray-400">
                          {getReasonLabel(missedDay.reason)}
                          {missedDay.estimated_calories && (
                            <span className="ml-2 text-gold-400">
                              • Est. {missedDay.estimated_calories} cal
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMissedDay(missedDay.id)}
                      className="text-gray-400 hover:text-red-400 hover:bg-dark-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Missed Day Modal */}
      {showMissedDayModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-100 rounded-2xl border border-dark-200 w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white tracking-wide">Add Missed Day</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMissedDayModal(false)}
                className="text-gray-400 hover:text-white hover:bg-dark-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleAddMissedDay}>
              <div className="space-y-4">
                <div>
                  <label className="input-label">Date</label>
                  <Input
                    type="date"
                    name="missed_date"
                    value={missedDayForm.missed_date}
                    onChange={handleMissedDayChange}
                    required
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">Reason</label>
                  <select
                    name="reason"
                    value={missedDayForm.reason}
                    onChange={handleMissedDayChange}
                    className="input-field"
                  >
                    <option value="forgot">Forgot to log</option>
                    <option value="sick">Sick/Illness</option>
                    <option value="travel">Travel</option>
                    <option value="busy">Too Busy</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="input-label">
                    Estimated Calories <span className="text-gray-500 text-xs ml-1">OPTIONAL</span>
                  </label>
                  <Input
                    type="number"
                    name="estimated_calories"
                    value={missedDayForm.estimated_calories}
                    onChange={handleMissedDayChange}
                    placeholder="e.g., 2000"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">
                    Notes <span className="text-gray-500 text-xs ml-1">OPTIONAL</span>
                  </label>
                  <textarea
                    name="notes"
                    value={missedDayForm.notes}
                    onChange={handleMissedDayChange}
                    placeholder="Any additional details..."
                    rows={3}
                    className="input-field resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowMissedDayModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-primary"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Missed Day'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calculator Modal */}
      {showCalculator && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-100 rounded-2xl border border-dark-200 w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white tracking-wide">Calorie Calculator</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCalculator(false)}
                className="text-gray-400 hover:text-white hover:bg-dark-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="bg-dark-200 rounded-xl p-4 mb-4">
              <div className="text-right text-3xl font-bold text-white font-mono">
                {calcDisplay}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', 'C', '0', '=', '+'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => {
                    if (btn === 'C') {
                      setCalcDisplay('0');
                      setCalcExpression('');
                    } else if (btn === '=') {
                      try {
                        const result = eval(calcExpression);
                        setCalcDisplay(result.toString());
                        setCalcExpression(result.toString());
                      } catch {
                        setCalcDisplay('Error');
                      }
                    } else {
                      setCalcExpression(prev => prev + btn);
                      setCalcDisplay(calcExpression + btn);
                    }
                  }}
                  className="p-3 rounded-xl text-lg font-bold bg-dark-200 text-white hover:bg-dark-300 transition-colors"
                >
                  {btn}
                </button>
              ))}
            </div>

            <Button
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  extra_calories: calcDisplay
                }));
                setShowCalculator(false);
              }}
              className="w-full mt-4 btn-primary"
            >
              Use Result as Extra Calories
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
