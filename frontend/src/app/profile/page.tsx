'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { UserSettings } from '@/types';
import { 
  ArrowLeft,
  User,
  Mail,
  Target,
  Flame,
  Activity,
  Scale,
  Save,
  Loader2,
  LogOut
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; created_at: string } | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [formData, setFormData] = useState({
    baseline_weight: '',
    current_weight: '',
    target_weight: '',
    initial_target_calories: '',
    activity_level: 'moderate',
    goal: 'maintain',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userData, settingsData] = await Promise.all([
        api.getCurrentUser(),
        api.getSettings(),
      ]);
      setUser(userData);
      setSettings(settingsData);
      
      if (settingsData) {
        setFormData({
          baseline_weight: settingsData.baseline_weight?.toString() || '',
          current_weight: settingsData.current_weight?.toString() || '',
          target_weight: settingsData.target_weight?.toString() || '',
          initial_target_calories: settingsData.initial_target_calories?.toString() || '',
          activity_level: settingsData.activity_level || 'moderate',
          goal: settingsData.goal || 'maintain',
        });
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
      await api.updateSettings({
        baseline_weight: formData.baseline_weight ? parseFloat(formData.baseline_weight) : undefined,
        current_weight: formData.current_weight ? parseFloat(formData.current_weight) : undefined,
        target_weight: formData.target_weight ? parseFloat(formData.target_weight) : undefined,
        initial_target_calories: formData.initial_target_calories ? parseInt(formData.initial_target_calories) : undefined,
        activity_level: formData.activity_level,
        goal: formData.goal,
      });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleLogout = async () => {
    await api.logout();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-500 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-gold-900 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
            <User className="w-8 h-8 text-gold-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-6 text-gold-400 font-bold tracking-wider uppercase">Loading profile...</p>
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
                  <User className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold gradient-text tracking-tight">
                  PROFILE
                </h1>
              </div>
            </div>
            {success && (
              <div className="flex items-center gap-2 text-gold-400 bg-gold-900/30 px-4 py-2 rounded-xl border border-gold-700">
                <Save className="w-5 h-5" />
                <span className="font-bold">SAVED!</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info Card */}
        <Card className="mb-6 card-hover bg-dark-100 border-dark-200">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-lg font-bold text-white tracking-wide">ACCOUNT INFO</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-dark-200 rounded-xl">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-600 to-gold-700 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{user?.email}</p>
                <p className="text-sm text-gray-400">
                  Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          {/* Body Metrics Card */}
          <Card className="mb-6 card-hover bg-dark-100 border-dark-200">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center">
                  <Scale className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-white tracking-wide">BODY METRICS</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="input-label">
                    Baseline Weight (kg)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    name="baseline_weight"
                    value={formData.baseline_weight}
                    onChange={handleChange}
                    placeholder="e.g., 80.5"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">
                    Current Weight (kg)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    name="current_weight"
                    value={formData.current_weight}
                    onChange={handleChange}
                    placeholder="e.g., 80.0"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">
                    Target Weight (kg)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    name="target_weight"
                    value={formData.target_weight}
                    onChange={handleChange}
                    placeholder="e.g., 75.0"
                    className="input-field"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calories & Goals Card */}
          <Card className="mb-6 card-hover bg-dark-100 border-dark-200">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-power-500 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-white tracking-wide">CALORIES & GOALS</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label flex items-center gap-2">
                    <Target className="w-4 h-4 text-gold-400" />
                    Daily Target Calories
                  </label>
                  <Input
                    type="number"
                    name="initial_target_calories"
                    value={formData.initial_target_calories}
                    onChange={handleChange}
                    placeholder="e.g., 2200"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label flex items-center gap-2">
                    <Activity className="w-4 h-4 text-steel-400" />
                    Activity Level
                  </label>
                  <select
                    name="activity_level"
                    value={formData.activity_level}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="sedentary">Sedentary (little or no exercise)</option>
                    <option value="light">Light (1-3 days/week)</option>
                    <option value="moderate">Moderate (3-5 days/week)</option>
                    <option value="active">Active (6-7 days/week)</option>
                    <option value="very_active">Very Active (intense daily)</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="input-label flex items-center gap-2">
                  <Target className="w-4 h-4 text-gold-400" />
                  Goal
                </label>
                <select
                  name="goal"
                  value={formData.goal}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="cut">Cut (Lose Weight)</option>
                  <option value="maintain">Maintain</option>
                  <option value="bulk">Bulk (Gain Muscle)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 btn-primary py-4 text-lg"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  SAVING...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  SAVE PROFILE
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="border-red-700 text-red-400 hover:bg-red-900/30 py-4"
            >
              <LogOut className="w-5 h-5 mr-2" />
              LOGOUT
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
