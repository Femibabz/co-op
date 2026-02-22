'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { getSocietySettings, saveSocietySettings, SocietySettings } from '@/lib/society-settings';
import { formatNaira } from '@/lib/loan-utils';
import { CheckCircle2, AlertCircle, Settings, Percent, TrendingUp, Users, Calendar } from 'lucide-react';

export default function SocietySettingsPage() {
    const [settings, setSettings] = useState<SocietySettings | null>(null);
    const [form, setForm] = useState({
        societyName: '',
        loanInterestRate: '',
        penaltyAfterMonths: '',
        maxLoanMultiple: '',
        minMembershipMonthsForLoan: '',
    });
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        const s = getSocietySettings();
        setSettings(s);
        setForm({
            societyName: s.societyName,
            loanInterestRate: String(s.loanInterestRate),
            penaltyAfterMonths: String(s.penaltyAfterMonths),
            maxLoanMultiple: String(s.maxLoanMultiple),
            minMembershipMonthsForLoan: String(s.minMembershipMonthsForLoan),
        });
    }, []);

    const handleChange = (field: keyof typeof form, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
        setMessage(null);
    };

    const handleSave = () => {
        const rate = parseFloat(form.loanInterestRate);
        const penalty = parseInt(form.penaltyAfterMonths, 10);
        const multiple = parseFloat(form.maxLoanMultiple);
        const minMonths = parseInt(form.minMembershipMonthsForLoan, 10);

        if (isNaN(rate) || rate <= 0 || rate > 20) {
            setMessage({ type: 'error', text: 'Interest rate must be between 0.1% and 20%.' });
            return;
        }
        if (isNaN(penalty) || penalty < 1) {
            setMessage({ type: 'error', text: 'Penalty threshold must be at least 1 month.' });
            return;
        }
        if (isNaN(multiple) || multiple < 1 || multiple > 10) {
            setMessage({ type: 'error', text: 'Max loan multiple must be between 1× and 10×.' });
            return;
        }
        if (isNaN(minMonths) || minMonths < 0) {
            setMessage({ type: 'error', text: 'Minimum membership months cannot be negative.' });
            return;
        }

        const saved = saveSocietySettings({
            societyName: form.societyName.trim() || 'Osuolale Cooperative Society',
            loanInterestRate: rate,
            penaltyAfterMonths: penalty,
            maxLoanMultiple: multiple,
            minMembershipMonthsForLoan: minMonths,
        });

        setSettings(saved);
        setIsDirty(false);
        setMessage({
            type: 'success',
            text: `Settings saved. New loans will use ${rate}% monthly interest rate.`,
        });
    };

    if (!settings) return <p className="text-muted-foreground p-8">Loading settings...</p>;

    // Example loan to preview how interest would be charged
    const exampleLoan = 200000;
    const exampleRate = parseFloat(form.loanInterestRate) || settings.loanInterestRate;
    const exampleInterest = Math.round((exampleLoan * exampleRate) / 100);

    return (
        <div className="space-y-8 max-w-3xl">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Society Settings</h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    Configure loan interest rates and financial policies for your cooperative society.
                </p>
            </div>

            {message && (
                <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                    {message.type === 'success'
                        ? <CheckCircle2 className="h-4 w-4" />
                        : <AlertCircle className="h-4 w-4" />}
                    <AlertDescription>{message.text}</AlertDescription>
                </Alert>
            )}

            {/* ── Interest Rate Settings ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Percent className="h-5 w-5 text-emerald-600" />
                        Loan Interest Rate
                    </CardTitle>
                    <CardDescription>
                        Set the monthly interest rate applied to all <strong>new</strong> loans.
                        Existing loans keep the rate they were given at disbursement.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="loanInterestRate">Monthly Interest Rate (%)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="loanInterestRate"
                                    type="number"
                                    min="0.1"
                                    max="20"
                                    step="0.1"
                                    value={form.loanInterestRate}
                                    onChange={e => handleChange('loanInterestRate', e.target.value)}
                                    className="flex-1"
                                />
                                <Badge variant="secondary" className="text-base px-3 py-1 shrink-0">
                                    {form.loanInterestRate || '?'}% / mo
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                e.g. 1.5 = 1.5% of outstanding principal per month
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="penaltyAfterMonths">Penalty Rate After (months)</Label>
                            <Input
                                id="penaltyAfterMonths"
                                type="number"
                                min="1"
                                max="120"
                                step="1"
                                value={form.penaltyAfterMonths}
                                onChange={e => handleChange('penaltyAfterMonths', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Interest doubles if loan is not fully repaid after this many months
                            </p>
                        </div>
                    </div>

                    {/* Live interest preview */}
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                        <p className="text-sm font-semibold text-emerald-900">📊 Interest Preview</p>
                        <p className="text-sm text-emerald-800">
                            For a {formatNaira(exampleLoan)} loan at <strong>{exampleRate}%/month</strong>:
                        </p>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <div className="bg-white rounded-lg p-3 border border-emerald-200">
                                <p className="text-xs text-emerald-600 font-medium">Month 1 Interest</p>
                                <p className="text-lg font-bold text-emerald-900">{formatNaira(exampleInterest)}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-emerald-200">
                                <p className="text-xs text-emerald-600 font-medium">Penalty Rate</p>
                                <p className="text-lg font-bold text-emerald-900">
                                    {formatNaira(exampleInterest * 2)}
                                    <span className="text-xs font-normal text-emerald-600 ml-1">after {form.penaltyAfterMonths} mo</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Loan Eligibility Settings ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Loan Eligibility Rules
                    </CardTitle>
                    <CardDescription>
                        Set the maximum loan a member can borrow, based on their share + savings balance.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="maxLoanMultiple">Max Loan Multiple (×)</Label>
                            <Input
                                id="maxLoanMultiple"
                                type="number"
                                min="1"
                                max="10"
                                step="0.5"
                                value={form.maxLoanMultiple}
                                onChange={e => handleChange('maxLoanMultiple', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Member can borrow up to <strong>{form.maxLoanMultiple}×</strong> of (shares + savings)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="minMembershipMonthsForLoan" className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" /> Min Membership Months
                            </Label>
                            <Input
                                id="minMembershipMonthsForLoan"
                                type="number"
                                min="0"
                                max="60"
                                step="1"
                                value={form.minMembershipMonthsForLoan}
                                onChange={e => handleChange('minMembershipMonthsForLoan', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Member must have been active for at least this many months to be eligible
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Society Name ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-violet-600" />
                        Society Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="societyName">Society Name</Label>
                        <Input
                            id="societyName"
                            value={form.societyName}
                            onChange={e => handleChange('societyName', e.target.value)}
                            placeholder="Osuolale Cooperative Society"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ── Important Note ── */}
            <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-4">
                    <div className="flex gap-3 items-start">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800 space-y-1">
                            <p className="font-semibold">Important: Settings apply to new loans only</p>
                            <p>Changing the interest rate does <strong>not</strong> affect existing loans. Each loan is locked in at the rate that was active on the day it was approved.</p>
                            <p className="mt-2">Interest is <strong>not</strong> calculated automatically. An admin must visit the <em>Interest</em> page at the beginning of each month to charge and record the interest for all active loans.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={!isDirty}
                    size="lg"
                    className="gap-2"
                >
                    <Settings className="h-4 w-4" />
                    Save Settings
                </Button>
            </div>
        </div>
    );
}
