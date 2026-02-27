'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { db } from '@/lib/mock-data';
import { getLoanSummary, formatNaira, processLoanPayment } from '@/lib/loan-utils';
import { Member } from '@/types';
import { ArrowRight, TrendingUp, TrendingDown, PiggyBank, Landmark, CreditCard, BadgeDollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function FinancialUpdatesPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delta form — user enters the AMOUNT to add or deduct, not the new total
  const [deltaForm, setDeltaForm] = useState({
    sharesAdd: '',      // amount to ADD to shares
    savingsAdd: '',     // amount to ADD to savings
    loanDeduct: '',     // amount to DEDUCT from loan (payment)
    interestDeduct: '', // amount to DEDUCT from interest (payment)
    duesDeduct: '',     // amount to DEDUCT from dues (payment)
    updateReason: '',
  });

  // Formatted display strings (with commas)
  const [displayForm, setDisplayForm] = useState({
    sharesAdd: '',
    savingsAdd: '',
    loanDeduct: '',
    interestDeduct: '',
    duesDeduct: '',
  });

  const [pendingUpdate, setPendingUpdate] = useState<{
    shares: { old: number; delta: number; new: number };
    savings: { old: number; delta: number; new: number };
    loan: { old: number; delta: number; new: number };
    interest: { old: number; delta: number; new: number };
    dues: { old: number; delta: number; new: number };
  } | null>(null);

  useEffect(() => {
    if (user?.societyId) {
      loadMembers();
    }
  }, [user]);

  const loadMembers = async () => {
    if (!user?.societyId) return;
    const allMembers = await db.getMembers(user.societyId);
    setMembers(allMembers);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  const formatDisplayNumber = (val: string) => {
    const raw = val.replace(/,/g, '').replace(/[^0-9.]/g, '');
    if (!raw) return '';
    const parts = raw.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
  };

  const handleMemberSelect = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member) {
      setSelectedMember(member);
      setDeltaForm({ sharesAdd: '', savingsAdd: '', loanDeduct: '', interestDeduct: '', duesDeduct: '', updateReason: '' });
      setDisplayForm({ sharesAdd: '', savingsAdd: '', loanDeduct: '', interestDeduct: '', duesDeduct: '' });
      setError('');
      setSuccess('');
    }
  };

  const handleDeltaChange = (field: keyof typeof displayForm, raw: string) => {
    const numeric = raw.replace(/,/g, '').replace(/[^0-9.]/g, '');
    setDeltaForm(prev => ({ ...prev, [field]: numeric }));
    setDisplayForm(prev => ({ ...prev, [field]: formatDisplayNumber(raw) }));
  };

  const parseField = (key: keyof typeof deltaForm) =>
    parseFloat((deltaForm[key] as string).replace(/,/g, '')) || 0;

  const calculateChanges = () => {
    if (!selectedMember) return null;
    const sharesAdd = parseFloat(deltaForm.sharesAdd) || 0;
    const savingsAdd = parseFloat(deltaForm.savingsAdd) || 0;
    const loanDeduct = parseFloat(deltaForm.loanDeduct) || 0;
    const interestDeduct = parseFloat(deltaForm.interestDeduct) || 0;
    const duesDeduct = parseFloat(deltaForm.duesDeduct) || 0;

    return {
      shares: { old: selectedMember.sharesBalance, delta: sharesAdd, new: selectedMember.sharesBalance + sharesAdd },
      savings: { old: selectedMember.savingsBalance, delta: savingsAdd, new: selectedMember.savingsBalance + savingsAdd },
      loan: { old: selectedMember.loanBalance, delta: -loanDeduct, new: Math.max(0, selectedMember.loanBalance - loanDeduct) },
      interest: { old: selectedMember.interestBalance, delta: -interestDeduct, new: Math.max(0, selectedMember.interestBalance - interestDeduct) },
      dues: { old: selectedMember.societyDues, delta: -duesDeduct, new: Math.max(0, selectedMember.societyDues - duesDeduct) },
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setError('');

    const sharesAdd = parseFloat(deltaForm.sharesAdd) || 0;
    const savingsAdd = parseFloat(deltaForm.savingsAdd) || 0;
    const loanDeduct = parseFloat(deltaForm.loanDeduct) || 0;
    const interestDeduct = parseFloat(deltaForm.interestDeduct) || 0;
    const duesDeduct = parseFloat(deltaForm.duesDeduct) || 0;

    if (sharesAdd < 0 || savingsAdd < 0 || loanDeduct < 0 || interestDeduct < 0 || duesDeduct < 0) {
      setError('Amounts cannot be negative');
      return;
    }
    if (sharesAdd === 0 && savingsAdd === 0 && loanDeduct === 0 && interestDeduct === 0 && duesDeduct === 0) {
      setError('Please enter at least one amount to update');
      return;
    }
    if (loanDeduct > selectedMember.loanBalance) {
      setError(`Loan deduction (${formatCurrency(loanDeduct)}) exceeds current loan balance (${formatCurrency(selectedMember.loanBalance)})`);
      return;
    }
    if (interestDeduct > selectedMember.interestBalance) {
      setError(`Interest deduction (${formatCurrency(interestDeduct)}) exceeds current interest balance (${formatCurrency(selectedMember.interestBalance)})`);
      return;
    }
    if (duesDeduct > selectedMember.societyDues) {
      setError(`Society dues deduction (${formatCurrency(duesDeduct)}) exceeds current society dues balance (${formatCurrency(selectedMember.societyDues)})`);
      return;
    }
    if (!deltaForm.updateReason.trim()) {
      setError('Please provide a reason for this update');
      return;
    }

    const changes = calculateChanges();
    setPendingUpdate(changes);
    setIsConfirmDialogOpen(true);
  };

  const confirmUpdate = async () => {
    if (!selectedMember || !pendingUpdate) return;
    setIsSubmitting(true);
    try {
      const newShares = pendingUpdate.shares.new;
      const newSavings = pendingUpdate.savings.new;
      const newLoan = pendingUpdate.loan.new;
      const newInterest = pendingUpdate.interest.new;
      const newDues = pendingUpdate.dues.new;

      let monthlyLoanPayment: number | undefined;
      if (newLoan === 0) monthlyLoanPayment = 0;

      const updatedMember = await db.updateMember(selectedMember.id, {
        sharesBalance: newShares,
        savingsBalance: newSavings,
        loanBalance: newLoan,
        interestBalance: newInterest,
        societyDues: newDues,
        ...(monthlyLoanPayment !== undefined && { monthlyLoanPayment }),
      });

      if (updatedMember) {
        const ref = `ADJ${Date.now()}`;

        if (pendingUpdate.shares.delta !== 0) {
          await db.createTransaction({
            memberId: selectedMember.id,
            societyId: selectedMember.societyId,
            type: pendingUpdate.shares.delta > 0 ? 'shares_deposit' : 'shares_withdrawal',
            amount: Math.abs(pendingUpdate.shares.delta),
            description: `Admin adjustment: ${deltaForm.updateReason}`,
            date: new Date(),
            balanceAfter: newShares,
            referenceNumber: `${ref}-SH`,
            processedBy: 'admin',
          });
        }

        if (pendingUpdate.savings.delta !== 0) {
          await db.createTransaction({
            memberId: selectedMember.id,
            societyId: selectedMember.societyId,
            type: pendingUpdate.savings.delta > 0 ? 'savings_deposit' : 'savings_withdrawal',
            amount: Math.abs(pendingUpdate.savings.delta),
            description: `Admin adjustment: ${deltaForm.updateReason}`,
            date: new Date(),
            balanceAfter: newSavings,
            referenceNumber: `${ref}-SV`,
            processedBy: 'admin',
          });
        }

        // Loan payment
        if (pendingUpdate.loan.delta < 0) {
          await db.createTransaction({
            memberId: selectedMember.id,
            societyId: selectedMember.societyId,
            type: 'loan_payment',
            amount: Math.abs(pendingUpdate.loan.delta),
            description: `Payment: ${deltaForm.updateReason}`,
            date: new Date(),
            balanceAfter: newLoan,
            referenceNumber: `${ref}-LP`,
            processedBy: 'admin',
          });
        }

        // Interest payment
        if (pendingUpdate.interest.delta < 0) {
          await db.createTransaction({
            memberId: selectedMember.id,
            societyId: selectedMember.societyId,
            type: 'interest_payment',
            amount: Math.abs(pendingUpdate.interest.delta),
            description: `Payment: ${deltaForm.updateReason}`,
            date: new Date(),
            balanceAfter: newInterest,
            referenceNumber: `${ref}-IP`,
            processedBy: 'admin',
          });
        }

        // Society dues payment
        if (pendingUpdate.dues.delta < 0) {
          await db.createTransaction({
            memberId: selectedMember.id,
            societyId: selectedMember.societyId,
            type: 'dues_payment',
            amount: Math.abs(pendingUpdate.dues.delta),
            description: `Payment: ${deltaForm.updateReason}`,
            date: new Date(),
            balanceAfter: newDues,
            referenceNumber: `${ref}-DP`,
            processedBy: 'admin',
          });
        }

        setSuccess('Financial balances updated successfully');
        setSelectedMember(updatedMember);
        setDeltaForm({ sharesAdd: '', savingsAdd: '', loanDeduct: '', interestDeduct: '', duesDeduct: '', updateReason: '' });
        setDisplayForm({ sharesAdd: '', savingsAdd: '', loanDeduct: '', interestDeduct: '', duesDeduct: '' });
        loadMembers();
        setIsConfirmDialogOpen(false);
        setPendingUpdate(null);
      }
    } catch {
      setError('Failed to update financial balances');
    } finally {
      setIsSubmitting(false);
    }
  };

  const changes = selectedMember ? calculateChanges() : null;
  const hasAnyChange = changes
    ? changes.shares.delta !== 0 || changes.savings.delta !== 0 || changes.loan.delta !== 0 || changes.interest.delta !== 0 || changes.dues.delta !== 0
    : false;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Financial Updates</h2>
        <p className="text-muted-foreground">Enter the amounts to add or deduct — balances are calculated automatically.</p>
      </div>

      {(error || success) && (
        <Alert variant={error ? 'destructive' : 'default'}>
          <AlertDescription>{error || success}</AlertDescription>
        </Alert>
      )}

      {/* Member Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Member</CardTitle>
          <CardDescription>Choose a member to update their financial balances</CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleMemberSelect}>
            <SelectTrigger id="member-select">
              <SelectValue placeholder="Select a member to update" />
            </SelectTrigger>
            <SelectContent>
              {members.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.memberNumber} — {member.firstName} {member.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedMember && (
        <>
          {/* Current Balances */}
          <Card>
            <CardHeader>
              <CardTitle>Current Balances — {selectedMember.firstName} {selectedMember.lastName}</CardTitle>
              <CardDescription>Member {selectedMember.memberNumber}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'SHARES', value: selectedMember.sharesBalance, color: 'text-blue-600', icon: <Landmark className="w-4 h-4" /> },
                  { label: 'SAVINGS', value: selectedMember.savingsBalance, color: 'text-green-600', icon: <PiggyBank className="w-4 h-4" /> },
                  { label: 'LOAN', value: selectedMember.loanBalance, color: 'text-orange-600', icon: <CreditCard className="w-4 h-4" /> },
                  { label: 'INTEREST DUE', value: selectedMember.interestBalance, color: 'text-red-600', icon: <BadgeDollarSign className="w-4 h-4" /> },
                  { label: 'SOCIETY DUES', value: selectedMember.societyDues, color: 'text-amber-600', icon: <BadgeDollarSign className="w-4 h-4" /> },
                ].map(item => (
                  <div key={item.label} className="p-4 border rounded-lg space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {item.icon} {item.label}
                    </div>
                    <p className={`text-lg font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
                  </div>
                ))}
              </div>
              {(() => {
                const loanInfo = getLoanSummary(selectedMember);
                return loanInfo ? (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2 text-sm">Active Loan Information</h4>
                    <div className="grid gap-2 md:grid-cols-3 text-sm">
                      <div><span className="text-blue-600">Interest Rate:</span><span className="ml-2 font-medium text-blue-800">{loanInfo.currentMonthlyRate}%/mo</span></div>
                      <div><span className="text-blue-600">Months Since Disbursement:</span><span className="ml-2 font-medium text-blue-800">{loanInfo.monthsSinceDisbursement}</span></div>
                      <div><span className="text-blue-600">Total Owed:</span><span className="ml-2 font-medium text-blue-800">{formatCurrency(loanInfo.totalOwed)}</span></div>
                    </div>
                  </div>
                ) : null;
              })()}
            </CardContent>
          </Card>

          {/* Delta Update Form */}
          <Card>
            <CardHeader>
              <CardTitle>Record Payment / Adjustment</CardTitle>
              <CardDescription>
                Enter the <strong>amount to add</strong> to each positive account, or the <strong>amount paid</strong> off each debt. Leave blank to skip.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Shares — ADD */}
                  <div className="space-y-2">
                    <Label htmlFor="sharesAdd" className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      Add to Shares (NGN)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">+</span>
                      <Input
                        id="sharesAdd"
                        inputMode="numeric"
                        value={displayForm.sharesAdd}
                        onChange={e => handleDeltaChange('sharesAdd', e.target.value)}
                        placeholder="0"
                        className="pl-7"
                      />
                    </div>
                    {changes && changes.shares.delta > 0 && (
                      <p className="text-xs text-blue-600 font-medium">
                        {formatCurrency(changes.shares.old)} <ArrowRight className="inline w-3 h-3" /> {formatCurrency(changes.shares.new)}
                      </p>
                    )}
                  </div>

                  {/* Savings — ADD */}
                  <div className="space-y-2">
                    <Label htmlFor="savingsAdd" className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      Add to Savings (NGN)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">+</span>
                      <Input
                        id="savingsAdd"
                        inputMode="numeric"
                        value={displayForm.savingsAdd}
                        onChange={e => handleDeltaChange('savingsAdd', e.target.value)}
                        placeholder="0"
                        className="pl-7"
                      />
                    </div>
                    {changes && changes.savings.delta > 0 && (
                      <p className="text-xs text-green-600 font-medium">
                        {formatCurrency(changes.savings.old)} <ArrowRight className="inline w-3 h-3" /> {formatCurrency(changes.savings.new)}
                      </p>
                    )}
                  </div>

                  {/* Loan — DEDUCT */}
                  <div className="space-y-2">
                    <Label htmlFor="loanDeduct" className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-orange-500" />
                      Loan Payment / Deduction (NGN)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">−</span>
                      <Input
                        id="loanDeduct"
                        inputMode="numeric"
                        value={displayForm.loanDeduct}
                        onChange={e => handleDeltaChange('loanDeduct', e.target.value)}
                        placeholder="0"
                        className="pl-7"
                      />
                    </div>
                    {changes && changes.loan.delta < 0 && (
                      <p className="text-xs text-orange-600 font-medium">
                        {formatCurrency(changes.loan.old)} <ArrowRight className="inline w-3 h-3" /> {formatCurrency(changes.loan.new)}
                      </p>
                    )}
                  </div>

                  {/* Interest — DEDUCT */}
                  <div className="space-y-2">
                    <Label htmlFor="interestDeduct" className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      Interest Payment / Deduction (NGN)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">−</span>
                      <Input
                        id="interestDeduct"
                        inputMode="numeric"
                        value={displayForm.interestDeduct}
                        onChange={e => handleDeltaChange('interestDeduct', e.target.value)}
                        placeholder="0"
                        className="pl-7"
                      />
                    </div>
                    {changes && changes.interest.delta < 0 && (
                      <p className="text-xs text-red-600 font-medium">
                        {formatCurrency(changes.interest.old)} <ArrowRight className="inline w-3 h-3" /> {formatCurrency(changes.interest.new)}
                      </p>
                    )}
                  </div>

                  {/* Society Dues — DEDUCT */}
                  <div className="space-y-2">
                    <Label htmlFor="duesDeduct" className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-amber-500" />
                      Society Dues Payment / Deduction (NGN)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">−</span>
                      <Input
                        id="duesDeduct"
                        inputMode="numeric"
                        value={displayForm.duesDeduct}
                        onChange={e => handleDeltaChange('duesDeduct', e.target.value)}
                        placeholder="0"
                        className="pl-7"
                      />
                    </div>
                    {changes && changes.dues.delta < 0 && (
                      <p className="text-xs text-amber-600 font-medium">
                        {formatCurrency(changes.dues.old)} <ArrowRight className="inline w-3 h-3" /> {formatCurrency(changes.dues.new)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Live summary */}
                {hasAnyChange && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Summary of Changes</p>
                    {changes && changes.shares.delta !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Shares</span>
                        <span className="font-bold text-blue-600">+{formatCurrency(changes.shares.delta)} → {formatCurrency(changes.shares.new)}</span>
                      </div>
                    )}
                    {changes && changes.savings.delta !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Savings</span>
                        <span className="font-bold text-green-600">+{formatCurrency(changes.savings.delta)} → {formatCurrency(changes.savings.new)}</span>
                      </div>
                    )}
                    {changes && changes.loan.delta !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Loan</span>
                        <span className="font-bold text-orange-600">{formatCurrency(changes.loan.delta)} → {formatCurrency(changes.loan.new)}</span>
                      </div>
                    )}
                    {changes && changes.interest.delta !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Interest</span>
                        <span className="font-bold text-red-600">{formatCurrency(changes.interest.delta)} → {formatCurrency(changes.interest.new)}</span>
                      </div>
                    )}
                    {changes && changes.dues.delta !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Society Dues</span>
                        <span className="font-bold text-amber-600">{formatCurrency(changes.dues.delta)} → {formatCurrency(changes.dues.new)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Reason */}
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Update *</Label>
                  <Textarea
                    id="reason"
                    value={deltaForm.updateReason}
                    onChange={e => setDeltaForm(prev => ({ ...prev, updateReason: e.target.value }))}
                    placeholder="e.g. 'Monthly payment received', 'Correction', 'Late fee'"
                    rows={3}
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setSelectedMember(null);
                    setDeltaForm({ sharesAdd: '', savingsAdd: '', loanDeduct: '', interestDeduct: '', duesDeduct: '', updateReason: '' });
                    setDisplayForm({ sharesAdd: '', savingsAdd: '', loanDeduct: '', interestDeduct: '', duesDeduct: '' });
                  }}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting || !hasAnyChange}>
                    Review & Confirm
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Financial Update</DialogTitle>
            <DialogDescription>
              Review the changes below. These will be recorded as transactions and cannot be easily undone.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && pendingUpdate && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-700">
                Member: {selectedMember.firstName} {selectedMember.lastName} ({selectedMember.memberNumber})
              </p>

              <div className="rounded-xl border divide-y text-sm">
                {pendingUpdate.shares.delta !== 0 && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500">Shares</span>
                    <span className="font-mono">
                      {formatCurrency(pendingUpdate.shares.old)} → <span className="font-bold text-blue-600">{formatCurrency(pendingUpdate.shares.new)}</span>
                      <span className="ml-2 text-blue-500">(+{formatCurrency(Math.abs(pendingUpdate.shares.delta))})</span>
                    </span>
                  </div>
                )}
                {pendingUpdate.savings.delta !== 0 && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500">Savings</span>
                    <span className="font-mono">
                      {formatCurrency(pendingUpdate.savings.old)} → <span className="font-bold text-green-600">{formatCurrency(pendingUpdate.savings.new)}</span>
                      <span className="ml-2 text-green-500">(+{formatCurrency(Math.abs(pendingUpdate.savings.delta))})</span>
                    </span>
                  </div>
                )}
                {pendingUpdate.loan.delta !== 0 && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500">Loan</span>
                    <span className="font-mono">
                      {formatCurrency(pendingUpdate.loan.old)} → <span className="font-bold text-orange-600">{formatCurrency(pendingUpdate.loan.new)}</span>
                      <span className="ml-2 text-orange-500">({formatCurrency(pendingUpdate.loan.delta)})</span>
                    </span>
                  </div>
                )}
                {pendingUpdate.interest.delta !== 0 && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500">Interest</span>
                    <span className="font-mono">
                      {formatCurrency(pendingUpdate.interest.old)} → <span className="font-bold text-red-600">{formatCurrency(pendingUpdate.interest.new)}</span>
                      <span className="ml-2 text-red-500">({formatCurrency(pendingUpdate.interest.delta)})</span>
                    </span>
                  </div>
                )}
                {pendingUpdate.dues.delta !== 0 && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500">Society Dues</span>
                    <span className="font-mono">
                      {formatCurrency(pendingUpdate.dues.old)} → <span className="font-bold text-amber-600">{formatCurrency(pendingUpdate.dues.new)}</span>
                      <span className="ml-2 text-amber-500">({formatCurrency(pendingUpdate.dues.delta)})</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm"><strong>Reason:</strong> {deltaForm.updateReason}</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)} disabled={isSubmitting}>
                  Go Back
                </Button>
                <Button onClick={confirmUpdate} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Confirm & Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
