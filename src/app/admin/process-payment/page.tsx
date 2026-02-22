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
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/mock-data';
import { processLoanPayment, getLoanSummary, formatNaira, getCurrentInterestRate } from '@/lib/loan-utils';
import { Member } from '@/types';
import { AlertCircle, CheckCircle2, DollarSign, TrendingDown } from 'lucide-react';

export default function ProcessPaymentPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [paymentPreview, setPaymentPreview] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    const allMembers = await db.getMembers();
    // Only show members with active loans or outstanding interest
    const membersWithLoanOrInterest = allMembers.filter(
      m => (m.loanBalance || 0) > 0 || (m.interestBalance || 0) > 0
    );
    setMembers(membersWithLoanOrInterest);
  };

  const handleMemberSelect = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member) {
      setSelectedMember(member);
      setPaymentAmount('');
      setPaymentNote('');
      setPaymentPreview(null);
      setError('');
      setSuccess('');
    }
  };

  const calculatePaymentSplit = () => {
    if (!selectedMember || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    const preview = processLoanPayment(selectedMember, amount);
    setPaymentPreview(preview);
    setIsConfirmDialogOpen(true);
    setError('');
  };

  const confirmPayment = async () => {
    if (!selectedMember || !paymentPreview) return;

    setIsSubmitting(true);
    try {
      const amount = parseFloat(paymentAmount);

      // Update member balances
      await db.updateMember(selectedMember.id, {
        interestBalance: paymentPreview.newInterestBalance,
        loanBalance: paymentPreview.newLoanBalance,
      });

      // Create transaction for interest payment
      if (paymentPreview.interestPaid > 0) {
        await db.createTransaction({
          memberId: selectedMember.id,
          type: 'interest_payment',
          amount: paymentPreview.interestPaid,
          description: `Interest payment${paymentNote ? `: ${paymentNote}` : ''}`,
          date: new Date(),
          balanceAfter: paymentPreview.newInterestBalance,
          referenceNumber: `IP${Date.now()}`,
          processedBy: 'admin',
        });
      }

      // Create transaction for loan payment
      if (paymentPreview.principalPaid > 0) {
        await db.createTransaction({
          memberId: selectedMember.id,
          type: 'loan_payment',
          amount: paymentPreview.principalPaid,
          description: `Loan payment${paymentNote ? `: ${paymentNote}` : ''}`,
          date: new Date(),
          balanceAfter: paymentPreview.newLoanBalance,
          referenceNumber: `LP${Date.now()}`,
          processedBy: 'admin',
        });
      }

      setSuccess(
        `Payment processed successfully! Interest paid: ${formatNaira(paymentPreview.interestPaid)}, Principal paid: ${formatNaira(paymentPreview.principalPaid)}`
      );
      setIsConfirmDialogOpen(false);
      setPaymentAmount('');
      setPaymentNote('');
      setPaymentPreview(null);

      // Reload members to show updated balances
      loadMembers();

      // Refresh selected member
      const updatedMember = await db.getMemberById(selectedMember.id);
      if (updatedMember) {
        setSelectedMember(updatedMember);
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('Failed to process payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loanInfo = selectedMember ? getLoanSummary(selectedMember) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Process Loan Payment</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Record member loan payments with automatic interest and principal split
        </p>
      </div>

      {(error || success) && (
        <Alert variant={error ? 'destructive' : 'default'}>
          {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <AlertDescription>{error || success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Member Selection & Payment Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Member</CardTitle>
              <CardDescription>Choose a member with an active loan or outstanding interest</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="member-select">Member</Label>
                <Select onValueChange={handleMemberSelect}>
                  <SelectTrigger id="member-select">
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.memberNumber} - {member.firstName} {member.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {selectedMember && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>Enter the payment amount received</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">Payment Amount (₦)</Label>
                  <Input
                    id="payment-amount"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={paymentAmount ? new Intl.NumberFormat('en-NG').format(parseFloat(paymentAmount.replace(/,/g, '')) || 0) : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, '');
                      if (/^\d*\.?\d*$/.test(raw)) setPaymentAmount(raw);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-note">Note (Optional)</Label>
                  <Textarea
                    id="payment-note"
                    placeholder="Add any notes about this payment..."
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={calculatePaymentSplit}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="w-full"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Calculate Payment Split
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Member Loan Information */}
        {selectedMember && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Balances</CardTitle>
                <CardDescription>
                  {selectedMember.firstName} {selectedMember.lastName} ({selectedMember.memberNumber})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-3 border rounded-lg bg-orange-50 border-orange-200">
                    <Label className="text-xs font-medium text-orange-700">LOAN BALANCE</Label>
                    <p className="text-lg font-bold text-orange-900">{formatNaira(selectedMember.loanBalance)}</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-red-50 border-red-200">
                    <Label className="text-xs font-medium text-red-700">INTEREST DUE</Label>
                    <p className="text-lg font-bold text-red-900">{formatNaira(selectedMember.interestBalance || 0)}</p>
                  </div>
                </div>

                <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                  <Label className="text-xs font-medium text-blue-700">TOTAL OWED</Label>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatNaira(selectedMember.loanBalance + (selectedMember.interestBalance || 0))}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Principal + Interest</p>
                </div>
              </CardContent>
            </Card>

            {loanInfo && (
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="text-purple-900">Loan Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-700">Current Interest Rate:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-purple-900">{loanInfo.currentMonthlyRate}%</span>
                      {loanInfo.isPenaltyRate && (
                        <Badge variant="destructive" className="text-xs">Penalty Rate</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Next Month Interest:</span>
                    <span className="font-semibold text-purple-900">{formatNaira(loanInfo.nextMonthInterest)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Months Since Disbursement:</span>
                    <span className="font-semibold text-purple-900">{loanInfo.monthsSinceDisbursement}</span>
                  </div>
                  {loanInfo.isOverdue && (
                    <div className="flex justify-between">
                      <span className="text-purple-700">Months Overdue:</span>
                      <Badge variant="destructive">{loanInfo.monthsOverdue} months</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="text-yellow-900 text-sm">Payment Priority</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-yellow-800 space-y-1">
                <p>1. Interest is paid first</p>
                <p>2. Remaining amount goes to principal</p>
                <p>3. Reducing principal reduces next month's interest</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Payment Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Review the payment split before processing
            </DialogDescription>
          </DialogHeader>
          {paymentPreview && selectedMember && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Payment Amount:</span>
                  <span className="text-lg font-bold">{formatNaira(parseFloat(paymentAmount))}</span>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Interest Payment:</span>
                    <span className="font-semibold text-red-600">
                      {formatNaira(paymentPreview.interestPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Principal Payment:</span>
                    <span className="font-semibold text-blue-600">
                      {formatNaira(paymentPreview.principalPaid)}
                    </span>
                  </div>
                  {paymentPreview.remainingPayment > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Excess (Refund):</span>
                      <span className="font-semibold text-green-600">
                        {formatNaira(paymentPreview.remainingPayment)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 space-y-2 bg-white p-3 rounded">
                  <p className="text-xs font-medium text-gray-700">New Balances:</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Interest Balance:</span>
                    <div className="text-right">
                      <span className="text-sm line-through text-gray-400">
                        {formatNaira(selectedMember.interestBalance || 0)}
                      </span>
                      <span className="ml-2 font-semibold text-red-600">
                        → {formatNaira(paymentPreview.newInterestBalance)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Loan Balance:</span>
                    <div className="text-right">
                      <span className="text-sm line-through text-gray-400">
                        {formatNaira(selectedMember.loanBalance)}
                      </span>
                      <span className="ml-2 font-semibold text-orange-600">
                        → {formatNaira(paymentPreview.newLoanBalance)}
                      </span>
                    </div>
                  </div>
                </div>

                {paymentPreview.newLoanBalance > 0 && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-xs font-medium text-blue-900">Next Month's Interest:</p>
                    <p className="text-sm text-blue-700 mt-1">
                      {formatNaira(paymentPreview.newLoanBalance)} × {getCurrentInterestRate(selectedMember)}% = {formatNaira((paymentPreview.newLoanBalance * getCurrentInterestRate(selectedMember)) / 100)}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={confirmPayment} disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
