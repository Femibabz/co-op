'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/mock-data';
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ChangePasswordPage() {
    const { user, logout, updateUser } = useAuth();
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const validatePassword = (pass: string) => {
        if (pass.length < 8) return 'Password must be at least 8 characters long.';
        if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter.';
        if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter.';
        if (!/[0-9]/.test(pass)) return 'Password must contain at least one number.';
        return null;
    };

    const getPasswordStrength = (pass: string) => {
        if (!pass) return { strength: '', color: 'bg-slate-200', width: '0%' };
        let score = 0;
        if (pass.length >= 8) score++;
        if (pass.length >= 12) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[a-z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;

        if (score <= 2) return { strength: 'Weak', color: 'bg-rose-500', width: '33%' };
        if (score <= 4) return { strength: 'Medium', color: 'bg-amber-500', width: '66%' };
        return { strength: 'Strong', color: 'bg-emerald-500', width: '100%' };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (currentPassword !== user?.password) {
            setError('Current password is incorrect.');
            return;
        }

        const vErr = validatePassword(newPassword);
        if (vErr) { setError(vErr); return; }

        if (newPassword === currentPassword) {
            setError('New password must be different from current password.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            if (!user) throw new Error('No user logged in.');
            await db.updateUserPassword(user.id, newPassword);
            updateUser({ isFirstLogin: false, password: newPassword });
            setSuccess('Security credentials updated successfully! Synchronizing system...');
            setTimeout(() => { router.push('/admin'); }, 1500);
        } catch (err: any) {
            setError(err.message || 'Failed to update password.');
        } finally {
            setLoading(false);
        }
    };

    const strength = getPasswordStrength(newPassword);

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-4">
            <Card className="w-full max-w-lg border-emerald-100 shadow-2xl shadow-emerald-500/10 rounded-[2.5rem] overflow-hidden">
                <CardHeader className="space-y-2 pb-8">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center mb-4 mx-auto shadow-inner">
                        <ShieldCheck className="w-8 h-8 text-emerald-600" />
                    </div>
                    <CardTitle className="text-3xl font-black text-center text-slate-900 tracking-tight">
                        Security Update
                    </CardTitle>
                    <CardDescription className="text-center font-bold text-slate-500 px-8 leading-relaxed">
                        For security reasons, you must change your default password before accessing the administrator portal.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-10 pb-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <Alert variant="destructive" className="rounded-2xl border-2 animate-shake">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="font-bold">{error}</AlertDescription>
                            </Alert>
                        )}
                        {success && (
                            <Alert className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 text-emerald-900 animate-in fade-in zoom-in">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <AlertDescription className="font-bold">{success}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Current Password *</Label>
                            <div className="relative group">
                                <Input
                                    type={showCurrent ? 'text' : 'password'}
                                    required
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="pl-12 h-14 border-slate-200 focus:border-emerald-500 rounded-2xl transition-all font-medium"
                                    placeholder="Enter existing password"
                                />
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">New Password *</Label>
                            <div className="relative group">
                                <Input
                                    type={showNew ? 'text' : 'password'}
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="pl-12 h-14 border-slate-200 focus:border-emerald-500 rounded-2xl transition-all font-medium"
                                    placeholder="Select strong password"
                                />
                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {newPassword && (
                                <div className="px-1 pt-1 space-y-1.5">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400">Password Strength:</span>
                                        <span className={strength.strength === 'Strong' ? 'text-emerald-600' : strength.strength === 'Medium' ? 'text-amber-600' : 'text-rose-600'}>
                                            {strength.strength}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full transition-all duration-500 ${strength.color}`} style={{ width: strength.width }} />
                                    </div>
                                </div>
                            )}

                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 mt-2 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Password must contain:</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    {[
                                        { l: 'At least 8 characters', v: newPassword.length >= 8 },
                                        { l: 'One uppercase letter', v: /[A-Z]/.test(newPassword) },
                                        { l: 'One lowercase letter', v: /[a-z]/.test(newPassword) },
                                        { l: 'One number', v: /[0-9]/.test(newPassword) },
                                    ].map((rule, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${rule.v ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                                {rule.v && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                            </div>
                                            <span className={`text-[11px] font-bold ${rule.v ? 'text-emerald-700' : 'text-slate-400'}`}>{rule.l}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Confirm New Password *</Label>
                            <div className="relative group">
                                <Input
                                    type={showConfirm ? 'text' : 'password'}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="pl-12 h-14 border-slate-200 focus:border-emerald-500 rounded-2xl transition-all font-medium"
                                    placeholder="Repeat new password"
                                />
                                <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {confirmPassword && (
                                <p className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${newPassword === confirmPassword ? 'text-emerald-600' : 'text-rose-500'}`}>
                                    {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={loading || !newPassword || newPassword !== confirmPassword}
                            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        >
                            {loading ? 'Initializing Protocol...' : 'Secure Account & Proceed'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="bg-slate-50/50 flex justify-center py-6 border-t border-slate-100">
                    <button onClick={() => { logout(); router.push('/'); }} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors">
                        Cancel Protocol & Sign Out
                    </button>
                </CardFooter>
            </Card>
        </div>
    );
}
