'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { Flame, TrendingUp, Activity, Zap, Target, Award, Sparkles, Trophy } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await api.login(email, password);
      } else {
        await api.register(email, password);
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const { url } = await api.googleSignIn();
      // Redirect to Google OAuth URL
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Google sign-in');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-500">
      <header className="bg-dark-200/90 backdrop-blur-lg border-b border-dark-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-600 to-gold-700 flex items-center justify-center shadow-lg glow-gold">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold gradient-text tracking-tight">
                MYTRACKER
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-900/30 text-gold-400 text-sm font-bold uppercase tracking-widest mb-4 border border-gold-700">
              <Sparkles className="w-4 h-4" />
              <span>Adaptive Calorie Engine</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              DOMINATE YOUR{' '}
              <span className="gradient-text">
                FITNESS GOALS
              </span>
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Track your fitness with intelligent calorie management. Get real-time insights, 
              weekly adjustments, and performance correlations that actually work! 💪
            </p>
            <div className="space-y-4">
              {[
                { icon: Target, text: 'Daily log tracking with auto-calculations', color: 'text-gold-400' },
                { icon: TrendingUp, text: 'Weekly adaptive calorie adjustments', color: 'text-gold-400' },
                { icon: Activity, text: 'Performance & fatigue risk monitoring', color: 'text-gold-400' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-600 to-gold-700 flex items-center justify-center shadow-lg glow-gold">
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="text-gray-300 font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Card className="max-w-md mx-auto shadow-2xl bg-dark-100 border-dark-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-600 to-gold-700 flex items-center justify-center shadow-lg glow-gold">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                </div>
                <CardTitle className="text-center text-2xl font-bold text-white tracking-wide">
                  {isLogin ? 'WELCOME BACK! 👊' : 'START DOMINATING! 💪'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-power-900/30 border border-power-700 rounded-lg text-power-400 text-sm">
                      {error}
                    </div>
                  )}
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    required
                  />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    required
                  />
                  <Button 
                    type="submit" 
                    className="w-full btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'LOADING...' : isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
                  </Button>
                </form>
                
                {/* Google Sign In Button */}
                <div className="mt-4">
                  <Button 
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full bg-white text-gray-700 hover:bg-gray-100 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    disabled={loading}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {loading ? 'LOADING...' : 'Continue with Google'}
                  </Button>
                </div>
                
                <div className="mt-6 text-center text-sm text-gray-400">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-gold-400 font-bold uppercase tracking-wide hover:text-gold-300"
                  >
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-24">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-3">
              EVERYTHING YOU NEED TO{' '}
              <span className="gradient-text">
                DOMINATE
              </span>
            </h3>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Powerful features designed to help you reach your fitness goals
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="stat-card stat-card-gold">
              <CardContent className="pt-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold-600 to-gold-700 flex items-center justify-center shadow-lg glow-gold mb-4">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-white mb-2 tracking-wide">SMART TRACKING</CardTitle>
                <p className="text-gray-400 text-sm">
                  Log daily metrics including weight, calories, macros, sleep, 
                  recovery, and performance. Auto-calculated net calories.
                </p>
              </CardContent>
            </Card>
            <Card className="stat-card stat-card-gold">
              <CardContent className="pt-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold-600 to-gold-700 flex items-center justify-center shadow-lg glow-gold mb-4">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-white mb-2 tracking-wide">ADAPTIVE ENGINE</CardTitle>
                <p className="text-gray-400 text-sm">
                  Weekly automatic recalibration based on your weight change.
                  Calorie adjustments of ±100kcal to stay on track.
                </p>
              </CardContent>
            </Card>
            <Card className="stat-card stat-card-steel">
              <CardContent className="pt-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-steel-600 to-steel-700 flex items-center justify-center shadow-lg mb-4">
                  <Award className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-white mb-2 tracking-wide">ADVANCED ANALYTICS</CardTitle>
                <p className="text-gray-400 text-sm">
                  Performance correlation, fatigue risk index, weight volatility,
                  and recovery consistency scoring.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t border-dark-300 mt-16 py-8 bg-dark-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-gold-500" />
            <span className="font-bold text-gold-400 tracking-wide uppercase">MyTracker</span>
          </div>
          <p className="text-gray-500">© 2024 BUILT FOR ATHLETES WHO WANT RESULTS! 🏆</p>
        </div>
      </footer>
    </div>
  );
}
