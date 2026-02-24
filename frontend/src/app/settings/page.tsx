'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { UserSettings } from '@/types';
import { ArrowLeft, Save, User, Sparkles, Settings, Target, Scale, Trophy } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [formData, setFormData] = useState({
    baseline_weight: '',
    initial_target_calories: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setFormData({
        baseline_weight: data.baseline_weight?.toString() || '',
        initial_target_calories: data.initial_target_calories?.toString() || '',
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings({
        baseline_weight: formData.baseline_weight ? parseFloat(formData.baseline_weight) : null,
        initial_target_calories: formData.initial_target_calories ? parseInt(formData.initial_target_calories) : null,
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-500 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gold-900 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
            <Trophy className="w-6 h-6 text-gold-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-gold-400 font-bold uppercase tracking-wider">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-500">
      <header className="bg-dark-200/90 backdrop-blur-lg border-b border-dark-300 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.back()}
                className="text-gray-400 hover:text-gray-200 hover:bg-dark-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-600 to-gold-700 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-xl font-bold gradient-text tracking-tight">
                  SETTINGS
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-gold-700 via-gold-600 to-gold-800 text-white shadow-2xl border border-gold-500/30">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6" />
            <p className="font-bold tracking-wide">SET YOUR GOALS AND DOMINATE! 💪</p>
          </div>
        </div>

        <Card className="shadow-xl bg-dark-100 border-dark-200">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-600 to-gold-700 flex items-center justify-center shadow-lg glow-gold">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white tracking-wide">YOUR PROFILE</CardTitle>
                <CardDescription className="text-gray-400">
                  Set your baseline weight and target calories
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-gold-400" />
                    <label className="text-sm font-bold text-gray-300 uppercase tracking-wide">Baseline Weight</label>
                  </div>
                  <Input
                    id="baseline_weight"
                    name="baseline_weight"
                    type="number"
                    step="0.1"
                    placeholder="70.0"
                    value={formData.baseline_weight}
                    onChange={handleChange}
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500">Your target maintenance weight in kg</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gold-400" />
                    <label className="text-sm font-bold text-gray-300 uppercase tracking-wide">Target Calories</label>
                  </div>
                  <Input
                    id="initial_target_calories"
                    name="initial_target_calories"
                    type="number"
                    placeholder="2000"
                    value={formData.initial_target_calories}
                    onChange={handleChange}
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500">Your daily calorie target</p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="btn-primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'SAVING...' : 'SAVE SETTINGS'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6 shadow-lg bg-dark-100 border-gold-800/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-600 to-gold-700 flex items-center justify-center shadow-lg glow-gold flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gold-400 mb-1 tracking-wide uppercase">💪 Pro Tips</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Start with a realistic baseline weight you can maintain</li>
                  <li>• Your target calories should match your activity level</li>
                  <li>• You can always adjust these settings later!</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
