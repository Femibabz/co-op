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
import { ShieldCheck, ShieldX, Shield, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getNextMonthInterestPreview } from '@/lib/loan-utils';

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
  const [isManualLoanDialogOpen, setIsManualLoanDialogOpen] = useState(false);
  const [manualLoanError, setManualLoanError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [manualLoanData, setManualLoanData] = useState({
    memberId: '',
    amount: '',
    purpose: '',
    duration: '12',
    guarantor1Id: '',
    guarantor2Id: '',
    documentUrl: '',
  });

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

      const nextInterest = Math.round(newPrincipal * (loanInterestRate / 100));

      await db.updateMember(selectedMember.id, {
        loanBalance: newPrincipal,
        interestBalance: 0,             // Fold any existing interest into new principal
        loanStartDate: approvalDate,
        loanDurationMonths: selectedLoan.duration || 12,
        loanInterestRate,               // rate from society settings at time of disbursement
        monthlyLoanPayment: monthlyPayment,
        lastInterestCalculationDate: approvalDate,
        nextScheduledInterest: nextInterest,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setManualLoanData({ ...manualLoanData, documentUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
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

  const handleManualLoanSubmit = async () => {
    setManualLoanError('');
    const member = members.find(m => m.id === manualLoanData.memberId);
    if (!member) {
      setManualLoanError('Please select a valid member');
      return;
    }

    const loanAmount = parseFloat(manualLoanData.amount);

    if (!manualLoanData.memberId || !manualLoanData.amount || !manualLoanData.guarantor1Id || !manualLoanData.guarantor2Id) {
      setManualLoanError('Please fill in all required fields');
      return;
    }

    // 1. Check for outstanding loan
    if (member.loanBalance > 0 && !member.allowNewLoanWithBalance) {
      setManualLoanError(`Member has an outstanding loan balance of ${formatCurrency(member.loanBalance)}. Manual loans are blocked unless override is enabled in member settings.`);
      return;
    }

    // 2. Check 2x Shares + Savings limit
    const totalCollateral = (member.sharesBalance || 0) + (member.savingsBalance || 0);
    const maxLoan = totalCollateral * 2;
    if (loanAmount > maxLoan) {
      setManualLoanError(`Loan amount (${formatCurrency(loanAmount)}) exceeds 2x total shares and savings (${formatCurrency(maxLoan)}).`);
      return;
    }

    // 3. Check 6-month membership tenure
    const joinDate = new Date(member.dateJoined);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (joinDate > sixMonthsAgo && !member.loanEligibilityOverride) {
      setManualLoanError(`Member joined on ${joinDate.toLocaleDateString()}. Membership must be at least 6 months old to apply for a loan.`);
      return;
    }

    if (manualLoanData.guarantor1Id === manualLoanData.guarantor2Id) {
      setManualLoanError('Guarantors must be different members');
      return;
    }

    if (manualLoanData.guarantor1Id === manualLoanData.memberId || manualLoanData.guarantor2Id === manualLoanData.memberId) {
      setManualLoanError('Member cannot be their own guarantor');
      return;
    }

    try {
      await db.createLoanApplicationByAdmin(
        manualLoanData.memberId,
        user!.societyId!,
        parseFloat(manualLoanData.amount),
        manualLoanData.purpose || 'Manual loan entry',
        parseInt(manualLoanData.duration),
        [manualLoanData.guarantor1Id, manualLoanData.guarantor2Id],
        manualLoanData.documentUrl
      );

      setSuccess('Manual loan recorded successfully');
      setIsManualLoanDialogOpen(false);
      setManualLoanError('');
      setManualLoanData({
        memberId: '',
        amount: '',
        purpose: '',
        duration: '12',
        guarantor1Id: '',
        guarantor2Id: '',
        documentUrl: '',
      });
      loadLoanApplications();
    } catch (err) {
      setError('Failed to record manual loan');
    }
  };

  const handleOverrideGuarantor = async (requestId: string) => {
    try {
      await db.approveGuarantorOnBehalf(requestId);
      setSuccess('Guarantor approved by admin override');
      // Refresh requests for the current loan view
      if (selectedLoan) {
        const reqs = await db.getGuarantorRequestsForApplication(selectedLoan.id);
        setGuarantorRequests(reqs);
      }
    } catch (err) {
      setError('Failed to override guarantor approval');
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Loan Management</h2>
          <p className="text-muted-foreground text-sm">
            Review and approve loan applications (FIFO order)
          </p>
        </div>
        <Button 
          onClick={() => {
            setManualLoanError('');
            setIsManualLoanDialogOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 font-bold h-11 px-6 rounded-xl shadow-lg shadow-indigo-600/20 w-full sm:w-auto"
        >
          Record Manual Loan
        </Button>
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative w-full sm:max-w-sm">
          <Input
            placeholder="Search loans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 pl-10 bg-slate-50 border-transparent focus:border-indigo-500/50 focus:bg-white rounded-xl font-medium"
          />
        </div>
        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
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
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
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
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
                <div className="flex items-center justify-between text-sm py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Projected Interest (Next Month):</span>
                      <span className="font-bold text-indigo-700">
                        {formatCurrency(getNextMonthInterestPreview(selectedMember)?.amount || 0)} 
                        <span className="text-[10px] ml-1 opacity-70">(Locked-in)</span>
                      </span>
                    </div>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                  <div>
                    <Label>Purpose</Label>
                    <p className="text-sm">{selectedLoan.purpose}</p>
                  </div>
                  {selectedLoan.documentUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPreviewUrl(selectedLoan.documentUrl || null);
                        setIsPreviewOpen(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full transition-colors h-auto"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      View Original Application
                    </Button>
                  )}
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
                          <div className="flex items-center gap-2">
                            <Badge variant={req.status === 'approved' ? 'default' : req.status === 'declined' ? 'destructive' : 'secondary'}>
                              {req.status}
                            </Badge>
                            {req.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOverrideGuarantor(req.id)}
                                className="h-7 px-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              >
                                Admin Override
                              </Button>
                            )}
                          </div>
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
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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

      {/* Manual Loan Recording Modal */}
      <Dialog open={isManualLoanDialogOpen} onOpenChange={setIsManualLoanDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Manual Loan Application</DialogTitle>
            <DialogDescription>
              Enter details for members who cannot use the online portal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {manualLoanError && (
              <Alert variant="destructive">
                <AlertDescription>{manualLoanError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Select Member</Label>
                <select
                  className="w-full p-2 border rounded-md text-sm"
                  value={manualLoanData.memberId}
                  onChange={(e) => {
                    setManualLoanError('');
                    setManualLoanData({ ...manualLoanData, memberId: e.target.value });
                  }}
                >
                  <option value="">Choose a member...</option>
                  {members.map(m => {
                    const hasBalance = m.loanBalance > 0;
                    const canApplyWithBalance = m.allowNewLoanWithBalance;
                    
                    const joinDate = new Date(m.dateJoined);
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                    const isNewMember = joinDate > sixMonthsAgo;
                    const canApplyNew = m.loanEligibilityOverride;

                    const isBlocked = (hasBalance && !canApplyWithBalance) || (isNewMember && !canApplyNew);
                    const blockReason = hasBalance && !canApplyWithBalance ? '(Outstanding Balance)' : 
                                       isNewMember && !canApplyNew ? '(New Member)' : '';

                    return (
                      <option 
                        key={m.id} 
                        value={m.id}
                        disabled={isBlocked}
                        className={isBlocked ? 'text-slate-400 italic' : ''}
                      >
                        {m.firstName} {m.lastName} ({m.memberNumber}) {blockReason}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Loan Amount (₦)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 500000"
                  value={manualLoanData.amount}
                  onChange={(e) => setManualLoanData({ ...manualLoanData, amount: e.target.value })}
                />
                {manualLoanData.memberId && (() => {
                  const m = members.find(mem => mem.id === manualLoanData.memberId);
                  if (!m) return null;
                  return (
                    <div className="flex gap-4 p-2 bg-indigo-50 rounded text-[11px] font-medium text-indigo-700">
                      <div>Savings: {formatCurrency(m.savingsBalance)}</div>
                      <div>Shares: {formatCurrency(m.sharesBalance)}</div>
                      <div className="font-bold border-l pl-2 border-indigo-200">
                        Max Loan (2x): {formatCurrency(((m.savingsBalance || 0) + (m.sharesBalance || 0)) * 2)}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="space-y-2">
                <Label>Loan Duration (Months)</Label>
                <select
                  className="w-full p-2 border rounded-md text-sm"
                  value={manualLoanData.duration}
                  onChange={(e) => setManualLoanData({ ...manualLoanData, duration: e.target.value })}
                >
                  {[6, 12, 18, 24, 36, 48].map(m => (
                    <option key={m} value={m.toString()}>{m} months</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Guarantor 1</Label>
                <select
                  className="w-full p-2 border rounded-md text-sm"
                  value={manualLoanData.guarantor1Id}
                  onChange={(e) => setManualLoanData({ ...manualLoanData, guarantor1Id: e.target.value })}
                >
                  <option value="">Select First Guarantor...</option>
                  {members
                    .filter(m => m.id !== manualLoanData.memberId)
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName} ({m.memberNumber})
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Guarantor 2</Label>
                <select
                  className="w-full p-2 border rounded-md text-sm"
                  value={manualLoanData.guarantor2Id}
                  onChange={(e) => setManualLoanData({ ...manualLoanData, guarantor2Id: e.target.value })}
                >
                  <option value="">Select Second Guarantor...</option>
                  {members
                    .filter(m => m.id !== manualLoanData.memberId && m.id !== manualLoanData.guarantor1Id)
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName} ({m.memberNumber})
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Purpose of Loan</Label>
              <Input
                placeholder="e.g. Small business expansion"
                value={manualLoanData.purpose}
                onChange={(e) => setManualLoanData({ ...manualLoanData, purpose: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Original Application Document (Scan/PDF)</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {manualLoanData.documentUrl && (
                  <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-200">
                    File Ready
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Upload the scanned letter or PDF provided by the member.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-2 border-t pt-4">
            <Button variant="outline" onClick={() => setIsManualLoanDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleManualLoanSubmit}
            >
              Record Application
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-6">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Original Application Document
            </DialogTitle>
            <DialogDescription>
              Viewing the uploaded record for this loan application
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden bg-slate-50 rounded-lg border mt-4">
            {previewUrl ? (
              previewUrl.startsWith('data:application/pdf') ? (
                <iframe 
                  src={previewUrl} 
                  className="w-full h-full border-0" 
                  title="PDF Document Preview"
                />
              ) : (
                <div className="w-full h-full overflow-auto p-4 flex items-center justify-center">
                  <img 
                    src={previewUrl} 
                    alt="Application Document" 
                    className="max-w-full max-h-full object-contain shadow-sm border rounded-sm" 
                  />
                </div>
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <FileText className="h-10 w-10 opacity-20" />
                <p>No document to preview</p>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsPreviewOpen(false)}
              className="font-bold"
            >
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
