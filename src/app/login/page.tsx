'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, LayoutDashboard, ShieldCheck, UserCircle2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (user.role === 'super_admin') {
        router.push('/super-admin');
      } else if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/member');
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 overflow-hidden bg-white">
      {/* Left Side - Visual/Marketing */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[#064e3b] relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-teal-400/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Coopkonnect</span>
          </div>

          <div className="space-y-8 max-w-lg">
            <h1 className="text-7xl font-extrabold text-white leading-[1.05] tracking-tight">
              Elevate Your <br />
              <span className="text-emerald-400">Cooperative</span> <br />
              Experience.
            </h1>
            <p className="text-xl text-white/80 font-medium leading-relaxed max-w-md">
              Modern, secure, and transparent management for the next generation of cooperative societies.
            </p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-6 pb-4">
          <div className="p-6 rounded-2xl bg-black/10 backdrop-blur-sm border border-white/5 transition-all duration-300">
            <LayoutDashboard className="w-6 h-6 text-emerald-400 mb-4" />
            <h3 className="font-bold text-white mb-1">Intuitive Dashboard</h3>
            <p className="text-sm text-white/50">Real-time tracking of all operations.</p>
          </div>
          <div className="p-6 rounded-2xl bg-black/10 backdrop-blur-sm border border-white/5 transition-all duration-300">
            <ShieldCheck className="w-6 h-6 text-emerald-400 mb-4" />
            <h3 className="font-bold text-white mb-1">Secure Core</h3>
            <p className="text-sm text-white/50">Enterprise-grade security for your data.</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-8 lg:p-12 bg-white relative">
        <div className="max-w-md w-full space-y-8 animate-fadeIn">
          <div className="lg:hidden text-center mb-12">
            <div className="p-3 bg-primary/10 rounded-2xl w-fit mx-auto mb-4">
              <ShieldCheck className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">Coopkonnect</h2>
          </div>

          <div className="space-y-2">
            <h2 className="text-5xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-slate-500 font-medium text-lg">Please enter your credentials to access your portal</p>
          </div>

          <div className="space-y-8 pt-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-bold text-slate-700">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-14 px-5 text-base border-slate-200 focus:border-emerald-600 focus:ring-emerald-600/10"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-base font-bold text-slate-700">Password</Label>
                  <button type="button" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">Forgot password?</button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-14 px-5 pr-12 text-base border-slate-200 focus:border-emerald-600 focus:ring-emerald-600/10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="rounded-xl border-rose-100 bg-rose-50 text-rose-900">
                  <AlertDescription className="font-semibold">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-14 bg-[#064e3b] hover:bg-[#065f46] text-white rounded-xl text-xl font-bold transition-all duration-300 shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-2 group"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                    Authenticating...
                  </span>
                ) : (
                  <>
                    Sign In <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-400 font-bold tracking-wider">Become a member of one of the societies</span></div>
              </div>

              <Button variant="outline" className="w-full h-14 rounded-xl border-slate-200 hover:bg-slate-50 font-bold text-slate-700 text-lg transition-colors" asChild>
                <a href="/apply">Apply for Membership</a>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div >

  );
}
