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
    <div className="min-h-screen grid lg:grid-cols-2 overflow-hidden bg-slate-50">
      {/* Left Side - Visual/Marketing */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-teal-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Coopkonnect</span>
          </div>

          <div className="space-y-6 max-w-lg">
            <h1 className="text-6xl font-extrabold text-white leading-[1.1]">
              Elevate Your <br />
              <span className="text-emerald-300">Cooperative</span> <br />
              Experience.
            </h1>
            <p className="text-xl text-emerald-50/80 font-medium leading-relaxed">
              Modern, secure, and transparent management for the next generation of cooperative societies.
            </p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-6 pb-8">
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group">
            <LayoutDashboard className="w-6 h-6 text-emerald-300 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-white mb-1">Intuitive Dashboard</h3>
            <p className="text-sm text-emerald-50/60">Real-time tracking of all operations.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group">
            <ShieldCheck className="w-6 h-6 text-emerald-300 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-white mb-1">Secure Core</h3>
            <p className="text-sm text-emerald-50/60">Enterprise-grade security for your data.</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-8 lg:p-12 relative">
        <div className="max-w-md w-full space-y-8 animate-fadeIn">
          <div className="lg:hidden text-center mb-12">
            <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold premium-gradient-text">Coopkonnect</h2>
          </div>

          <div className="space-y-2">
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-slate-500 font-medium">Please enter your credentials to access your portal</p>
          </div>

          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0 pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-sm font-bold text-slate-700 ml-1">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="h-12 px-4 text-base"
                    required
                  />
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <Label htmlFor="password" className="text-sm font-bold text-slate-700">Password</Label>
                    <button type="button" className="text-xs font-bold text-primary hover:underline">Forgot password?</button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-12 px-4 pr-12 text-base"
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
                  className="w-full h-12 btn-premium text-lg group"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign In <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-50 px-2 text-slate-500 font-bold">Become a member of one of the Societies</span></div>
                </div>

                <Button variant="outline" className="w-full h-12 rounded-xl border-2 hover:bg-slate-50 font-bold text-slate-700" asChild>
                  <a href="/apply">Apply for Membership</a>
                </Button>
              </form>


            </CardContent>
          </Card>
        </div>
      </div>
    </div >
  );
}
