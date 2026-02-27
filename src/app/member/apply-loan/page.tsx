'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  CircleDollarSign,
  Calendar,
  Wallet,
  Calculator
} from 'lucide-react';
import { db } from '@/lib/mock-data';
import { getSocietySettings } from '@/lib/society-settings';
import { Member } from '@/types';

export default function ApplyLoanPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [guarantor1Id, setGuarantor1Id] = useState('');
  const [guarantor2Id, setGuarantor2Id] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    amount: '',
    purpose: '',
    duration: '',
  });

  useEffect(() => {
    const loadMember = async () => {
      if (user) {
        const memberData = await db.getMemberByUserId(user.id);
        setMember(memberData || null);
        const members = await db.getMembers(user.societyId);
        setAllMembers(members.filter(m => m.id !== memberData?.id && m.status === 'active'));
        const settings = getSocietySettings();
        // Fixed 2 guarantors as per requirement
        setGuarantor1Id('');
        setGuarantor2Id('');
      }
    };
    loadMember();
  }, [user]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'member')) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (!member) throw new Error('Member information not found');

      const { amount, purpose, duration } = formData;
      if (!amount || !purpose || !duration) {
        setError('Please fill in all required fields');
        return;
      }

      const loanAmount = parseFloat(amount);
      const loanDuration = parseInt(duration);

      const totalWithOrganization = member.sharesBalance + member.savingsBalance;
      const totalGrossCapacity = totalWithOrganization * 2;
      const currentDebt = member.loanBalance + member.interestBalance;
      const netCapacity = Math.max(0, totalGrossCapacity - currentDebt);

      if (loanAmount > netCapacity) {
        setError(`Requested amount exceeds your current borrowing capacity of ${formatCurrency(netCapacity)}`);
        setIsSubmitting(false);
        return;
      }

      const membershipDurationMonths = Math.floor((new Date().getTime() - new Date(member.dateJoined).getTime()) / (1000 * 60 * 60 * 24 * 30));
      const isEligibleByTenure = membershipDurationMonths >= 6 || member.loanEligibilityOverride === true;

      if (loanAmount <= 0) {
        setError('Loan amount must be greater than 0');
        return;
      }

      if (!isEligibleByTenure) {
        setError('Tenure requirement not met.');
        return;
      }

      if (member.loanBalance > 0 && !member.allowNewLoanWithBalance) {
        setError('Outstanding loan must be cleared first.');
        return;
      }

      if (member.interestBalance > 0 && !member.allowNewLoanWithBalance) {
        setError('Outstanding interest must be cleared first.');
        return;
      }

      // Guarantor validation
      if (!guarantor1Id || !guarantor2Id) {
        setError('Please select both required guarantors.');
        return;
      }
      if (guarantor1Id === guarantor2Id) {
        setError('Please select different members as guarantors.');
        return;
      }

      // Capacity check already performed above with netCapacity

      const loanApp = await db.createLoanApplication({
        memberId: member.id,
        societyId: member.societyId,
        amount: loanAmount,
        purpose,
        duration: loanDuration,
        guarantor1Id,
        guarantor2Id,
        guarantorIds: [guarantor1Id, guarantor2Id],
        guarantorCount: 2,
      });

      // Note: db.createLoanApplication now handles guarantor request creation internally
      // to ensure consistency across storage layers.

      setSuccess(true);
      setTimeout(() => router.push('/member'), 3000);
    } catch (err) {
      setError('Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (isLoading || (!member && !success)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Loan Portal</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full premium-card p-10 text-center space-y-6 animate-fadeIn">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-float">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Application Success!</h3>
            <p className="text-slate-500 font-medium">Your request is now in queue for review by our administrators.</p>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-shimmer" style={{ width: '100%' }}></div>
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Redirecting to Dashboard...</p>
        </div>
      </div>
    );
  }

  // Now we are sure success is false AND member is not null (due to the first check)
  if (!member) return null;

  const totalHoldings = member.sharesBalance + member.savingsBalance;
  const grossCapacity = totalHoldings * 2;
  const currentDebt = member.loanBalance + member.interestBalance;
  const netCapacity = Math.max(0, grossCapacity - currentDebt);
  const membershipDurationMonths = Math.floor((new Date().getTime() - new Date(member.dateJoined).getTime()) / (1000 * 60 * 60 * 24 * 30));
  const isEligibleByTenure = membershipDurationMonths >= 6 || member.loanEligibilityOverride === true;
  const isEligibleForLoan = (member.loanBalance === 0 || member.allowNewLoanWithBalance) &&
    (member.interestBalance === 0 || member.allowNewLoanWithBalance) &&
    isEligibleByTenure;

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-bold text-primary uppercase tracking-widest">Financial Assistance</p>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Apply for Loan</h2>
        </div>
        <Button variant="outline" className="rounded-xl font-bold border-2 hover:bg-slate-50" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Loan Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`premium-card p-8 space-y-8 ${!isEligibleForLoan ? 'opacity-70 grayscale-[0.5]' : ''}`}>
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Application Details</h3>
              <p className="text-slate-500 font-medium">Provide accurate details for your fund request.</p>
            </div>

            {member.allowNewLoanWithBalance && (member.loanBalance > 0 || member.interestBalance > 0) && (
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-800">
                <div className="mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-tight">Special Loan Privilege Active</p>
                  <p className="text-xs font-medium opacity-80 mt-1">
                    An administrator has granted you an exception to apply for a new loan despite having an outstanding balance of <strong>{formatCurrency(member.loanBalance + member.interestBalance)}</strong>.
                    If approved, this balance will be merged with your new loan.
                  </p>
                </div>
              </div>
            )}

            {!isEligibleForLoan && (
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-800">
                <div className="mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-tight">Submission Locked</p>
                  <p className="text-xs font-medium opacity-80 mt-1">
                    You current profile does not meet one or more eligibility criteria. Please review the checklist on the right.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Amount Requested (₦)</Label>
                <div className="relative group">
                  <div className="absolute left-4 top-3 current-text font-bold text-slate-400">₦</div>
                  <Input
                    id="amount"
                    name="amount"
                    type="text"
                    inputMode="numeric"
                    value={formData.amount ? new Intl.NumberFormat('en-NG').format(parseFloat(formData.amount.replace(/,/g, '')) || 0) : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, '');
                      if (/^\d*\.?\d*$/.test(raw)) setFormData(prev => ({ ...prev, amount: raw }));
                    }}
                    placeholder="0.00"
                    max={netCapacity}
                    disabled={!isEligibleForLoan}
                    className="pl-8 h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all rounded-xl font-bold text-lg"
                    required
                  />
                </div>
                <div className="flex items-center gap-2 px-1">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-xs text-slate-500 font-medium">
                    Maximum allowed based on your holdings: <span className="text-slate-900 font-bold">{formatCurrency(netCapacity)}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration" className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Repayment Plan</Label>
                <Select onValueChange={(value) => handleSelectChange('duration', value)} disabled={!isEligibleForLoan}>
                  <SelectTrigger className="h-12 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white font-medium">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="3">3 Months (Short term)</SelectItem>
                    <SelectItem value="6">6 Months (Recommended)</SelectItem>
                    <SelectItem value="12">12 Months (Standard)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ── Guarantor Selection ─────────────────────── */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">01</div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Primary Guarantor</Label>
                  </div>
                  <Select value={guarantor1Id} onValueChange={setGuarantor1Id} disabled={!isEligibleForLoan}>
                    <SelectTrigger className="h-12 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white font-medium">
                      <SelectValue placeholder="Identify member" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {allMembers.map(m => {
                        const settings = getSocietySettings();
                        const activeGuarantees = db.getActiveGuaranteesCount(m.id);
                        const atLimit = activeGuarantees >= settings.maxActiveGuaranteesPerMember;
                        const alreadyPicked = guarantor2Id === m.id;
                        return (
                          <SelectItem key={m.id} value={m.id} disabled={atLimit || alreadyPicked}>
                            {m.firstName} {m.lastName} ({m.memberNumber}) {atLimit ? '— at limit' : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-black">02</div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Secondary Guarantor</Label>
                  </div>
                  <Select value={guarantor2Id} onValueChange={setGuarantor2Id} disabled={!isEligibleForLoan}>
                    <SelectTrigger className="h-12 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white font-medium">
                      <SelectValue placeholder="Identify member" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {allMembers.map(m => {
                        const settings = getSocietySettings();
                        const activeGuarantees = db.getActiveGuaranteesCount(m.id);
                        const atLimit = activeGuarantees >= settings.maxActiveGuaranteesPerMember;
                        const alreadyPicked = guarantor1Id === m.id;
                        return (
                          <SelectItem key={m.id} value={m.id} disabled={atLimit || alreadyPicked}>
                            {m.firstName} {m.lastName} ({m.memberNumber}) {atLimit ? '— at limit' : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose" className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Purpose of Fund</Label>
                <Textarea
                  id="purpose"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  placeholder="Briefly explain what this loan will be used for..."
                  rows={4}
                  disabled={!isEligibleForLoan}
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all rounded-xl min-h-[120px] pt-4 font-medium"
                  required
                />
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-sm font-bold">{error}</p>
                </div>
              )}

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <Button
                  type="submit"
                  className="flex-1 h-14 btn-premium text-lg group"
                  disabled={isSubmitting || !isEligibleForLoan}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {isEligibleForLoan ? 'Submit Application' : 'Resolve Eligibility to Continue'}
                      {isEligibleForLoan && <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Status */}
        <div className="space-y-6">
          <div className="premium-card p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Your Eligibility</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Requirements Check</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <CircleDollarSign className={`w-5 h-5 ${member.loanBalance === 0 ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className="text-sm font-bold text-slate-600">Active Loan</span>
                </div>
                {member.loanBalance === 0 ? (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Cleared</Badge>
                ) : (
                  <Badge variant="destructive">₦{member.loanBalance.toLocaleString()}</Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <Calculator className={`w-5 h-5 ${member.interestBalance === 0 ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className="text-sm font-bold text-slate-600">Interest Dues</span>
                </div>
                {member.interestBalance === 0 ? (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Cleared</Badge>
                ) : (
                  <Badge variant="destructive">₦{member.interestBalance.toLocaleString()}</Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <Calendar className={`w-5 h-5 ${isEligibleByTenure ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className="text-sm font-bold text-slate-600">Membership</span>
                </div>
                {isEligibleByTenure ? (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">{membershipDurationMonths}mo ✓</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 border-none">{membershipDurationMonths}/6mo</Badge>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Holding Power</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Total Contributions</span>
                  <span className="text-sm font-extrabold text-primary">{formatCurrency(totalHoldings)}</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Borrowing Capacity (2x)</p>
                <p className="text-xl font-extrabold tracking-tight">{formatCurrency(netCapacity)}</p>
              </div>
            </div>
          </div>

          <div className="premium-card p-6 bg-indigo-50 border-indigo-100">
            <div className="flex gap-4">
              <div className="mt-1">
                <Wallet className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-indigo-900 tracking-tight">Need more?</h4>
                <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                  Your loan capacity is based on your savings and share capital. Increase your regular contributions to unlock higher loan limits.
                </p>
                <Button variant="link" className="p-0 h-auto text-indigo-600 font-extrabold text-xs" asChild>
                  <a href="/member/bylaws">Learn about contributions →</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
