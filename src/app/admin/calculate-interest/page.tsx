'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/mock-data';
import { calculateAccumulatedInterest, formatNaira, getCurrentInterestRate } from '@/lib/loan-utils';
import { Member } from '@/types';
import { AlertCircle, CheckCircle2, Calculator } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function CalculateInterestPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [interestPreview, setInterestPreview] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (user?.societyId) {
      loadMembers();
    }
  }, [user]);

  const loadMembers = async () => {
    try {
      const allMembers = await db.getMembers(user?.societyId);
      const membersWithLoans = allMembers.filter(m => (m.loanBalance || 0) > 0);
      setMembers(membersWithLoans);

      // Calculate preview for all members
      const preview = new Map();
      membersWithLoans.forEach(member => {
        const calculation = calculateAccumulatedInterest(member);
        preview.set(member.id, calculation);
      });
      setInterestPreview(preview);
    } catch (error) {
      console.error('Error loading members:', error);
      setMessage({ type: 'error', text: 'Failed to load members' });
    } finally {
      setLoading(false);
    }
  };

  const calculateInterestForAll = async () => {
    setCalculating(true);
    setMessage(null);

    try {
      let totalInterestAdded = 0;
      let membersProcessed = 0;

      for (const member of members) {
        const calculation = calculateAccumulatedInterest(member);

        if (calculation.monthsToCalculate > 0 && calculation.totalInterest > 0) {
          // Update member with new interest balance and last calculation date
          await db.updateMember(member.id, {
            interestBalance: calculation.newInterestBalance,
            lastInterestCalculationDate: new Date()
          });

          // Create transaction for interest charge
          await db.createTransaction({
            memberId: member.id,
            societyId: member.societyId,
            type: 'interest_charge',
            amount: calculation.totalInterest,
            description: `Monthly interest charge - ${calculation.monthsToCalculate} month(s) at ${getCurrentInterestRate(member)}% per month`,
            date: new Date(),
            balanceAfter: calculation.newInterestBalance,
            referenceNumber: `INT${Date.now()}-${member.id}`,
            processedBy: 'admin'
          });

          totalInterestAdded += calculation.totalInterest;
          membersProcessed++;
        }
      }

      setMessage({
        type: 'success',
        text: `Successfully calculated interest for ${membersProcessed} member(s). Total interest added: ${formatNaira(totalInterestAdded)}`
      });

      // Reload members to show updated balances
      loadMembers();
    } catch (error) {
      console.error('Error calculating interest:', error);
      setMessage({
        type: 'error',
        text: 'Failed to calculate interest. Please try again.'
      });
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading members...</p>
      </div>
    );
  }

  const totalPendingInterest = Array.from(interestPreview.values())
    .reduce((sum, calc) => sum + (calc.totalInterest || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Monthly Interest Calculation</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Calculate and apply monthly interest charges for all active loans
        </p>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members with Active Loans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending Interest</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNaira(totalPendingInterest)}</div>
            <p className="text-xs text-muted-foreground">
              To be added to member balances
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Action Required</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={calculateInterestForAll}
              disabled={calculating || members.length === 0 || totalPendingInterest === 0}
              className="w-full"
            >
              <Calculator className="mr-2 h-4 w-4" />
              {calculating ? 'Calculating...' : 'Calculate Interest for All'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-900">How Interest Calculation Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-800 space-y-2">
          <p>• <strong>Base Rate:</strong> 1.0% per month on outstanding loan <strong>principal</strong> balance</p>
          <p>• <strong>After 12 Months:</strong> Rate doubles to 2.0% per month if loan is not fully repaid</p>
          <p>• <strong>Interest Accumulation:</strong> Interest is charged on the 1st of each month, starting from the 1st of the month after the loan was issued</p>
          <p>• <strong>Payment Priority:</strong> Payments are applied to interest first, then principal</p>
          <p>• <strong>Reduced Balance:</strong> When principal is paid down, next month's interest is calculated on the new lower balance</p>
          <p className="mt-4 font-semibold">⚠️ Run this process at the beginning of each month to charge interest for the new month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interest Calculation Preview</CardTitle>
          <CardDescription>
            Review interest to be charged before applying
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No members with active loans</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Member</TableHead>
                    <TableHead className="whitespace-nowrap">Member ID</TableHead>
                    <TableHead className="whitespace-nowrap">Loan Balance</TableHead>
                    <TableHead className="whitespace-nowrap">Current Interest</TableHead>
                    <TableHead className="whitespace-nowrap">Rate</TableHead>
                    <TableHead className="whitespace-nowrap">Months to Charge</TableHead>
                    <TableHead className="whitespace-nowrap">Interest to Add</TableHead>
                    <TableHead className="whitespace-nowrap">New Interest Balance</TableHead>
                    <TableHead className="whitespace-nowrap">Last Calculation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const calculation = interestPreview.get(member.id);
                    const currentRate = getCurrentInterestRate(member);

                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {member.firstName} {member.lastName}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{member.memberNumber}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatNaira(member.loanBalance)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatNaira(member.interestBalance || 0)}</TableCell>
                        <TableCell>
                          <Badge variant={currentRate > 1.5 ? "destructive" : "default"}>
                            {currentRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {calculation?.monthsToCalculate || 0}
                        </TableCell>
                        <TableCell className="font-semibold whitespace-nowrap">
                          {formatNaira(calculation?.totalInterest || 0)}
                        </TableCell>
                        <TableCell className="font-semibold whitespace-nowrap">
                          {formatNaira(calculation?.newInterestBalance || member.interestBalance || 0)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {member.lastInterestCalculationDate
                            ? new Date(member.lastInterestCalculationDate).toLocaleDateString()
                            : 'Never'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {members.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">Interest Calculation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.slice(0, 3).map((member) => {
                const calculation = interestPreview.get(member.id);
                if (!calculation || calculation.monthsToCalculate === 0) return null;

                return (
                  <div key={member.id} className="border-b pb-4 last:border-b-0">
                    <p className="font-semibold text-orange-900">
                      {member.firstName} {member.lastName} ({member.memberNumber})
                    </p>
                    <div className="mt-2 space-y-1 text-sm text-orange-800">
                      {calculation.breakdown?.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span>{item.month}: {formatNaira(item.balance)} × {item.rate}%</span>
                          <span className="font-medium">= {formatNaira(item.interest)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-semibold pt-2 border-t border-orange-300">
                        <span>Total Interest:</span>
                        <span>{formatNaira(calculation.totalInterest)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
