'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/mock-data';
import { getSocietySettings } from '@/lib/society-settings';
import { LoanApplication, Member, GuarantorRequest } from '@/types';
import { ShieldCheck, ShieldX, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoansPage() {
  const [loanApplications, setLoanApplications] = useState<LoanApplication[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [guarantorRequests, setGuarantorRequests] = useState<GuarantorRequest[]>([]);

  const { user } = useAuth();
  useEffect(() => {
    if (user?.societyId) {
      loadLoanApplications();
    }
  }, [user]);

  const loadLoanApplications = async () => {
    if (!user?.societyId) return;
    const allLoans = await db.getLoanApplications(user.societyId);
    const allMembers = await db.getMembers(user.societyId);
    // Sort by applied date (FIFO)
    allLoans.sort((a, b) => a.appliedAt.getTime() - b.appliedAt.getTime());
    setLoanApplications(allLoans);
    setMembers(allMembers);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getMemberByLoanId = (memberId: string): Member | null => {
    return members.find(m => m.id === memberId) || null;
  };

  const filteredLoans = loanApplications.filter(loan => {
    const member = getMemberByLoanId(loan.memberId);
    if (!member) return false;

    return (
      member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.memberNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.purpose.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleViewLoan = async (loan: LoanApplication) => {
    const member = getMemberByLoanId(loan.memberId);
    setSelectedLoan(loan);
    setSelectedMember(member);
    setReviewNotes('');
    // Load guarantor requests for this loan
    const reqs = await db.getGuarantorRequestsForApplication(loan.id);
    setGuarantorRequests(reqs);
    setIsDialogOpen(true);
  };

  const handleApproveLoan = async () => {
    if (!selectedLoan || !selectedMember) return;

    try {
      const approvalDate = new Date();

      // Update loan application status
      const updatedLoan = await db.updateLoanApplication(selectedLoan.id, {
        status: 'approved',
        reviewedAt: approvalDate,
        reviewedBy: 'admin',
        reviewNotes,
        disbursedAt: approvalDate, // Set disbursement date to approval date
      });

      // Stamp the CURRENT society interest rate onto this loan record
      // so it persists for the life of the loan even if the admin changes settings later.
      const { loanInterestRate } = getSocietySettings();

      // Calculate new total principal (summing old loan + old interest + new loan)
      const oldPrincipal = selectedMember.loanBalance || 0;
      const oldInterest = selectedMember.interestBalance || 0;
      const newPrincipal = oldPrincipal + oldInterest + selectedLoan.amount;
      const monthlyPayment = newPrincipal / (selectedLoan.duration || 12);

      await db.updateMember(selectedMember.id, {
        loanBalance: newPrincipal,
        interestBalance: 0,             // Fold any existing interest into new principal
        loanStartDate: approvalDate,
        loanDurationMonths: selectedLoan.duration || 12,
        loanInterestRate,               // rate from society settings at time of disbursement
        monthlyLoanPayment: monthlyPayment,
        lastInterestCalculationDate: approvalDate,
        allowNewLoanWithBalance: false, // Reset override after it's used
      });

      // Create loan disbursement transaction
      await db.createTransaction({
        memberId: selectedMember.id,
        societyId: selectedMember.societyId,
        type: 'loan_disbursement',
        amount: selectedLoan.amount,
        description: `Loan approved and disbursed - ${selectedLoan.purpose}${oldPrincipal > 0 ? ' (Balances merged)' : ''}`,
        date: approvalDate,
        balanceAfter: newPrincipal,
        referenceNumber: `LN${Date.now()}`,
        processedBy: 'admin',
      });

      setSuccess('Loan approved and disbursed successfully');
      setIsDialogOpen(false);
      loadLoanApplications();
    } catch (err) {
      setError('Failed to approve loan');
    }
  };

  const handleRejectLoan = async () => {
    if (!selectedLoan) return;

    try {
      const updatedLoan = await db.updateLoanApplication(selectedLoan.id, {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: 'admin',
        reviewNotes,
      });

      if (updatedLoan) {
        setSuccess('Loan rejected');
        setIsDialogOpen(false);
        loadLoanApplications();
      }
    } catch (err) {
      setError('Failed to reject loan');
    }
  };

  const getStatusColor = (status: string): BadgeProps['variant'] => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'disbursed':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getFIFOPosition = (loan: LoanApplication): number => {
    const pendingLoans = loanApplications
      .filter(l => l.status === 'pending')
      .sort((a, b) => a.appliedAt.getTime() - b.appliedAt.getTime());

    return pendingLoans.findIndex(l => l.id === loan.id) + 1;
  };

  const pendingLoansCount = loanApplications.filter(loan => loan.status === 'pending').length;
  const approvedLoansCount = loanApplications.filter(loan => loan.status === 'approved').length;
  const totalLoanAmount = loanApplications
    .filter(loan => loan.status === 'approved' || loan.status === 'disbursed')
    .reduce((sum, loan) => sum + loan.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Loan Management</h2>
        <p className="text-muted-foreground">
          Review and approve loan applications (FIFO order)
        </p>
      </div>

      {(error || success) && (
        <Alert variant={error ? "destructive" : "default"}>
          <AlertDescription>{error || success}</AlertDescription>
        </Alert>
      )}

      {/* Loan Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLoansCount}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Loans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedLoansCount}</div>
            <p className="text-xs text-muted-foreground">
              Ready for disbursement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loan Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalLoanAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Approved + disbursed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search loans..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">
          {filteredLoans.length} loan(s) found
        </span>
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Applications</CardTitle>
          <CardDescription>
            All loan applications sorted by application date (FIFO)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Queue #</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Member ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Applied Date</TableHead>
                <TableHead>Approved Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLoans.map((loan) => {
                const member = getMemberByLoanId(loan.memberId);
                const fifoPosition = loan.status === 'pending' ? getFIFOPosition(loan) : null;

                return (
                  <TableRow key={loan.id}>
                    <TableCell>
                      {fifoPosition ? (
                        <Badge variant="outline">#{fifoPosition}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {member ? `${member.firstName} ${member.lastName}` : 'Unknown'}
                    </TableCell>
                    <TableCell>{member?.memberNumber || 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(loan.amount)}</TableCell>
                    <TableCell>{loan.duration} months</TableCell>
                    <TableCell>{loan.appliedAt.toLocaleDateString()}</TableCell>
                    <TableCell>
                      {loan.reviewedAt && loan.status === 'approved' ? (
                        loan.reviewedAt.toLocaleDateString()
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(loan.status)}>
                        {loan.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewLoan(loan)}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Loan Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Review Loan Application</DialogTitle>
            <DialogDescription>
              Review member eligibility and approve or reject the loan
            </DialogDescription>
          </DialogHeader>
          {selectedLoan && selectedMember && (
            <div className="space-y-6">
              {/* Member Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Member Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Member Name</Label>
                    <p className="text-sm">{selectedMember.firstName} {selectedMember.lastName}</p>
                  </div>
                  <div>
                    <Label>Member ID</Label>
                    <p className="text-sm">{selectedMember.memberNumber}</p>
                  </div>
                  <div>
                    <Label>Savings Balance</Label>
                    <p className="text-sm font-medium">{formatCurrency(selectedMember.savingsBalance)}</p>
                  </div>
                  <div>
                    <Label>Current Loan Balance</Label>
                    <p className="text-sm font-medium">{formatCurrency(selectedMember.loanBalance)}</p>
                  </div>
                  <div>
                    <Label>Shares Balance</Label>
                    <p className="text-sm font-medium">{formatCurrency(selectedMember.sharesBalance)}</p>
                  </div>
                  <div>
                    <Label>Outstanding Dues</Label>
                    <p className="text-sm font-medium">{formatCurrency(selectedMember.societyDues)}</p>
                  </div>
                </div>
              </div>

              {/* Loan Details */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Loan Application Details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Requested Amount</Label>
                    <p className="text-sm font-medium">{formatCurrency(selectedLoan.amount)}</p>
                  </div>
                  <div>
                    <Label>Loan Duration</Label>
                    <p className="text-sm">{selectedLoan.duration} months</p>
                  </div>
                  <div>
                    <Label>Applied Date</Label>
                    <p className="text-sm">{selectedLoan.appliedAt.toLocaleDateString()}</p>
                  </div>
                  {selectedLoan.status === 'pending' && (
                    <div>
                      <Label>Queue Position</Label>
                      <p className="text-sm">#{getFIFOPosition(selectedLoan)} in line</p>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Label>Purpose</Label>
                  <p className="text-sm">{selectedLoan.purpose}</p>
                </div>
              </div>

              {/* Guarantor Approvals */}
              {guarantorRequests.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-violet-600" /> Guarantor Approvals
                  </h3>
                  <div className="space-y-2">
                    {guarantorRequests.map(req => {
                      const gMember = members.find(m => m.id === req.guarantorMemberId);
                      return (
                        <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-2">
                            {req.status === 'approved' ? <ShieldCheck className="h-4 w-4 text-green-600" /> :
                              req.status === 'declined' ? <ShieldX className="h-4 w-4 text-red-600" /> :
                                <Shield className="h-4 w-4 text-slate-400" />}
                            <span className="text-sm font-medium">
                              {gMember ? `${gMember.firstName} ${gMember.lastName} (${gMember.memberNumber})` : req.guarantorMemberId}
                            </span>
                          </div>
                          <Badge variant={req.status === 'approved' ? 'default' : req.status === 'declined' ? 'destructive' : 'secondary'}>
                            {req.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                  {guarantorRequests.some(r => r.status !== 'approved') && (
                    <Alert className="mt-3">
                      <ShieldX className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Approval blocked:</strong> All guarantors must approve before this loan can be disbursed.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Eligibility Check */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Eligibility Assessment</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">No existing loan:</span>
                    <Badge variant={selectedMember.loanBalance === 0 ? "default" : "destructive"}>
                      {selectedMember.loanBalance === 0 ? "✓ Eligible" : "✗ Has existing loan"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Dues up to date:</span>
                    <Badge variant={selectedMember.societyDues === 0 ? "default" : "secondary"}>
                      {selectedMember.societyDues === 0 ? "✓ Up to date" : "⚠ Outstanding dues"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Loan amount ≤ 2x savings:</span>
                    <Badge variant={selectedLoan.amount <= selectedMember.savingsBalance * 2 ? "default" : "destructive"}>
                      {selectedLoan.amount <= selectedMember.savingsBalance * 2 ? "✓ Within limit" : "✗ Exceeds limit"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Review Notes */}
              {selectedLoan.status === 'pending' && (
                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="reviewNotes">Review Notes (Optional)</Label>
                    <Textarea
                      id="reviewNotes"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add any notes about your decision..."
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Previous Review (if any) */}
              {selectedLoan.status !== 'pending' && selectedLoan.reviewNotes && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Review Details</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Reviewed By</Label>
                      <p className="text-sm">{selectedLoan.reviewedBy}</p>
                    </div>
                    <div>
                      <Label>Reviewed Date</Label>
                      <p className="text-sm">{selectedLoan.reviewedAt?.toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label>Review Notes</Label>
                    <p className="text-sm">{selectedLoan.reviewNotes}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedLoan.status === 'pending' && (() => {
                const allGuarantorsApproved = guarantorRequests.length === 0 || guarantorRequests.every(r => r.status === 'approved');
                return (
                  <div className="flex flex-col gap-2 pt-4 border-t">
                    {!allGuarantorsApproved && (
                      <Alert variant="destructive">
                        <AlertDescription>Loan cannot be approved until all guarantors have approved their requests.</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={handleRejectLoan}>Reject Loan</Button>
                      <Button onClick={handleApproveLoan} disabled={!allGuarantorsApproved}>Approve Loan</Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
