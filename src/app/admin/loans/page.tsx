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
import { ShieldCheck, ShieldX, Shield, FileText, Coins, Search, Calculator } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);

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

  const loadLoanApplications = async () => {
    if (!user?.societyId) return;
    setIsLoading(true);
    try {
      const [allLoans, allMembers] = await Promise.all([
        db.getLoanApplications(user.societyId),
        db.getMembers(user.societyId)
      ]);

      // Sort by applied date (FIFO) safely
      allLoans.sort((a, b) => {
        const dateA = a.appliedAt instanceof Date ? a.appliedAt : new Date(a.appliedAt);
        const dateB = b.appliedAt instanceof Date ? b.appliedAt : new Date(b.appliedAt);
        return dateA.getTime() - dateB.getTime();
      });

      setLoanApplications(allLoans);
      setMembers(allMembers);
    } catch (err: any) {
      console.error('Error fetching loans:', err);
      setError(err.message || 'Failed to load loan data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.societyId) {
      loadLoanApplications();
    }
  }, [user?.societyId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMemberByLoanId = (memberId: string): Member | null => {
    return members.find(m => m.id === memberId) || null;
  };

  const filteredLoans = loanApplications.filter(loan => {
    const member = getMemberByLoanId(loan.memberId);
    if (!member) return false;

    const searchLower = searchTerm.toLowerCase();
    return (
      member.firstName.toLowerCase().includes(searchLower) ||
      member.lastName.toLowerCase().includes(searchLower) ||
      member.memberNumber.toLowerCase().includes(searchLower) ||
      loan.status.toLowerCase().includes(searchLower) ||
      loan.purpose.toLowerCase().includes(searchLower)
    );
  });

  const handleViewLoan = async (loan: LoanApplication) => {
    const member = getMemberByLoanId(loan.memberId);
    setSelectedLoan(loan);
    setSelectedMember(member);
    setReviewNotes(loan.reviewNotes || '');
    
    try {
      const reqs = await db.getGuarantorRequestsForApplication(loan.id);
      setGuarantorRequests(reqs);
      setIsDialogOpen(true);
    } catch (err) {
      setError('Failed to load guarantor details');
    }
  };

  const handleApproveLoan = async () => {
    if (!selectedLoan || !selectedMember) return;

    try {
      const approvalDate = new Date();
      const { loanInterestRate } = getSocietySettings();
      const loanAmount = selectedLoan.amount;
      const duration = selectedLoan.duration || 12;

      // Update application
      await db.updateLoanApplication(selectedLoan.id, {
        status: 'approved',
        reviewedAt: approvalDate,
        reviewedBy: 'admin',
        reviewNotes,
        disbursedAt: approvalDate,
      });

      // Update Member financial balances
      const oldPrincipal = selectedMember.loanBalance || 0;
      const oldInterest = selectedMember.interestBalance || 0;
      const newPrincipal = oldPrincipal + oldInterest + loanAmount;
      const monthlyPayment = Math.round(newPrincipal / duration);
      const nextInterest = Math.round(newPrincipal * (loanInterestRate / 100));

      await db.updateMember(selectedMember.id, {
        loanBalance: newPrincipal,
        interestBalance: 0, // fold existing interest into principal
        loanStartDate: approvalDate,
        loanDurationMonths: duration,
        loanInterestRate,
        monthlyLoanPayment: monthlyPayment,
        lastInterestCalculationDate: approvalDate,
        nextScheduledInterest: nextInterest,
        allowNewLoanWithBalance: false,
      });

      // Create transaction record
      await db.createTransaction({
        memberId: selectedMember.id,
        societyId: selectedMember.societyId,
        type: 'loan_disbursement',
        amount: loanAmount,
        description: `Loan approved and disbursed - ${selectedLoan.purpose}${oldPrincipal > 0 ? ' (Balances combined)' : ''}`,
        date: approvalDate,
        balanceAfter: newPrincipal,
        referenceNumber: `LN-DISB-${Date.now()}`,
        processedBy: 'admin',
      });

      setSuccess('Loan approved and disbursed successfully');
      setIsDialogOpen(false);
      loadLoanApplications();
    } catch (err) {
      setError('Failed to approve loan application');
    }
  };

  const handleRejectLoan = async () => {
    if (!selectedLoan) return;
    try {
      await db.updateLoanApplication(selectedLoan.id, {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: 'admin',
        reviewNotes,
      });
      setSuccess('Loan application rejected');
      setIsDialogOpen(false);
      loadLoanApplications();
    } catch (err) {
      setError('Failed to reject application');
    }
  };

  const handleOverrideGuarantor = async (requestId: string) => {
    try {
      await db.approveGuarantorOnBehalf(requestId);
      setSuccess('Guarantor approved via admin override');
      if (selectedLoan) {
        const reqs = await db.getGuarantorRequestsForApplication(selectedLoan.id);
        setGuarantorRequests(reqs);
      }
    } catch (err) {
      setError('Failed to apply override');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setManualLoanData(prev => ({ ...prev, documentUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualLoanSubmit = async () => {
    setManualLoanError('');
    if (!manualLoanData.memberId || !manualLoanData.amount || !manualLoanData.guarantor1Id || !manualLoanData.guarantor2Id) {
      setManualLoanError('Please fill in all required fields');
      return;
    }

    const member = members.find(m => m.id === manualLoanData.memberId);
    if (!member) return;

    const loanAmount = parseFloat(manualLoanData.amount);
    
    // Validations
    if (member.loanBalance > 0 && !member.allowNewLoanWithBalance) {
      setManualLoanError(`Member has an existing balance of ${formatCurrency(member.loanBalance)}.`);
      return;
    }

    const maxAllowed = ((member.savingsBalance || 0) + (member.sharesBalance || 0)) * 2;
    if (loanAmount > maxAllowed) {
      setManualLoanError(`Requested amount exceeds the 2x limit (${formatCurrency(maxAllowed)}).`);
      return;
    }

    const joinDate = new Date(member.dateJoined);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (joinDate > sixMonthsAgo && !member.loanEligibilityOverride) {
      setManualLoanError('Member tenure is less than 6 months.');
      return;
    }

    if (manualLoanData.guarantor1Id === manualLoanData.guarantor2Id) {
      setManualLoanError('Guarantors must be unique.');
      return;
    }

    try {
      await db.createLoanApplicationByAdmin(
        manualLoanData.memberId,
        user!.societyId!,
        loanAmount,
        manualLoanData.purpose || 'Manual loan recording',
        parseInt(manualLoanData.duration),
        [manualLoanData.guarantor1Id, manualLoanData.guarantor2Id],
        manualLoanData.documentUrl
      );

      setSuccess('Manual loan recorded successfully');
      setIsManualLoanDialogOpen(false);
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
      setManualLoanError('Failed to record manual loan');
    }
  };

  const getStatusColor = (status: string): BadgeProps['variant'] => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'disbursed': return 'secondary';
      default: return 'secondary';
    }
  };

  const getFIFOPosition = (loan: LoanApplication): number => {
    const list = loanApplications
      .filter(l => l.status === 'pending')
      .sort((a,b) => {
        const dA = a.appliedAt instanceof Date ? a.appliedAt : new Date(a.appliedAt);
        const dB = b.appliedAt instanceof Date ? b.appliedAt : new Date(b.appliedAt);
        return dA.getTime() - dB.getTime();
      });
    return list.findIndex(l => l.id === loan.id) + 1;
  };

  if (isLoading && !loanApplications.length) {
    return <div className="p-8 text-center text-slate-500 animate-pulse font-medium">Loading loan applications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-none">Loan Management</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Review and process member loan applications in FIFO order.</p>
        </div>
        <Button 
          onClick={() => {
            setManualLoanError('');
            setIsManualLoanDialogOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 px-6 rounded-xl shadow-lg shadow-indigo-600/20"
        >
          <Coins className="w-5 h-5 mr-2" />
          Record Manual Loan
        </Button>
      </div>

      {(error || success) && (
        <Alert variant={error ? "destructive" : "default"} className="rounded-xl border-2">
          <AlertDescription className="font-semibold text-sm">{error || success}</AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-amber-50 rounded-2xl">
          <CardHeader className="pb-2 text-amber-700 font-bold uppercase tracking-wider text-[10px]">Pending Cases</CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-amber-900">{loanApplications.filter(l => l.status === 'pending').length}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-emerald-50 rounded-2xl">
          <CardHeader className="pb-2 text-emerald-700 font-bold uppercase tracking-wider text-[10px]">Approved (Total)</CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-emerald-900">{loanApplications.filter(l => l.status === 'approved' || l.status === 'disbursed').length}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-indigo-50 rounded-2xl">
          <CardHeader className="pb-2 text-indigo-700 font-bold uppercase tracking-wider text-[10px]">Total Disbursed Value</CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-indigo-900">
              {formatCurrency(loanApplications.filter(l => l.status === 'disbursed' || l.status === 'approved').reduce((s,l) => s+l.amount, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <Input 
            placeholder="Search by name, ID, status or purpose..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 pl-10 bg-slate-50 border-transparent focus:border-indigo-500/50 focus:bg-white rounded-xl font-medium transition-all"
          />
        </div>
        <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 hidden sm:block">
           <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{filteredLoans.length} Applications</span>
        </div>
      </div>

      {/* Main Table */}
      <Card className="border-none shadow-sm overflow-hidden rounded-2xl bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[80px] font-bold text-slate-500">Queue</TableHead>
              <TableHead className="font-bold text-slate-500">Member</TableHead>
              <TableHead className="font-bold text-slate-500">Amount</TableHead>
              <TableHead className="font-bold text-slate-500">Date Applied</TableHead>
              <TableHead className="font-bold text-slate-500">Status</TableHead>
              <TableHead className="text-right font-bold text-slate-500">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLoans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center text-slate-400 italic">No applications found matching your search</TableCell>
              </TableRow>
            ) : filteredLoans.map((loan) => {
              const member = getMemberByLoanId(loan.memberId);
              const pos = loan.status === 'pending' ? getFIFOPosition(loan) : null;
              const appDate = loan.appliedAt instanceof Date ? loan.appliedAt : new Date(loan.appliedAt);

              return (
                <TableRow key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    {pos ? (
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 text-xs border border-indigo-100">
                        #{pos}
                      </div>
                    ) : <span className="text-slate-300">-</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{member ? `${member.firstName} ${member.lastName}` : 'Unknown Member'}</span>
                      <span className="text-[10px] font-medium text-slate-500 leading-none mt-1">{member?.memberNumber || loan.memberId}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-slate-800">{formatCurrency(loan.amount)}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{appDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric'})}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(loan.status)} className="rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {loan.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewLoan(loan)}
                      className="text-indigo-600 font-bold hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
                    >
                      Review Case
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* ── Review Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
          {selectedLoan && selectedMember && (
            <div className="flex flex-col h-full bg-white">
              <div className="p-6 border-b bg-slate-50/50">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-slate-900">Application Review</DialogTitle>
                  <DialogDescription className="font-medium">#{selectedLoan.id.slice(-8)} — Evaluation and Decision</DialogDescription>
                </DialogHeader>
              </div>
              
              <div className="p-6 space-y-8">
                {/* Member Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1">Member Profile</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[10px] text-slate-500 italic">Savings</Label>
                        <p className="font-bold text-sm text-slate-900">{formatCurrency(selectedMember.savingsBalance)}</p>
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500 italic">Shares</Label>
                        <p className="font-bold text-sm text-slate-900">{formatCurrency(selectedMember.sharesBalance)}</p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[10px] text-slate-500 italic">Tenure</Label>
                        <p className="font-semibold text-xs text-slate-700">Member since {new Date(selectedMember.dateJoined).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1">Application Stats</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[10px] text-slate-500 italic">Requested</Label>
                        <p className="font-black text-lg text-indigo-600">{formatCurrency(selectedLoan.amount)}</p>
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500 italic">Duration</Label>
                        <p className="font-bold text-sm uppercase text-slate-900">{selectedLoan.duration} Months</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Preview Link */}
                {selectedLoan.documentUrl && (
                  <div className="bg-indigo-50/50 p-4 rounded-2xl flex items-center justify-between border border-indigo-100/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Application Document</p>
                        <p className="text-[10px] text-slate-500 font-medium">Scanned letter/PDF attached</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setPreviewUrl(selectedLoan.documentUrl || null);
                        setIsPreviewOpen(true);
                      }}
                      className="border-indigo-200 text-indigo-700 font-bold hover:bg-indigo-100 rounded-lg text-xs"
                    >
                      Open Document
                    </Button>
                  </div>
                )}

                {/* Interest Preview */}
                <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-900/10">
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                         <Calculator className="h-4 w-4 text-emerald-400" />
                         <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Projected Monthly Interest</span>
                      </div>
                      <span className="text-xl font-black text-emerald-400">
                         {formatCurrency(getNextMonthInterestPreview(selectedMember)?.amount || 0)}
                      </span>
                   </div>
                   <p className="text-[10px] text-slate-500 mt-2 italic font-medium">Calculated based on current society rate of {getSocietySettings().loanInterestRate}%.</p>
                </div>

                {/* Guarantors */}
                {guarantorRequests.length > 0 && (
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1 flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5" /> Guarantor Status
                      </h4>
                      <div className="grid gap-3">
                        {guarantorRequests.map(req => {
                          const gMember = members.find(m => m.id === req.guarantorMemberId);
                          const isPending = req.status === 'pending';
                          return (
                            <div key={req.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/30">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${req.status === 'approved' ? 'bg-emerald-500' : req.status === 'declined' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                <span className="text-sm font-bold text-slate-700">{gMember ? `${gMember.firstName} ${gMember.lastName}` : req.guarantorMemberId}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={req.status === 'approved' ? 'default' : req.status === 'declined' ? 'destructive' : 'secondary'} className="rounded-full font-bold text-[9px] px-2">
                                  {req.status}
                                </Badge>
                                {isPending && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleOverrideGuarantor(req.id)}
                                    className="h-7 text-[9px] font-black text-indigo-600 hover:bg-indigo-50 bg-white border border-indigo-100 rounded-lg"
                                  >
                                    Force Approve
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                   </div>
                )}

                {/* Eligibility Indicators */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1">Automated Eligibility Check</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                      <span className="text-xs font-bold text-slate-600">Existing Loan</span>
                      <Badge variant={selectedMember.loanBalance === 0 ? "default" : "destructive"} className="font-bold">
                        {selectedMember.loanBalance === 0 ? "✓ CLEAR" : "✗ ACTIVE"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                      <span className="text-xs font-bold text-slate-600">2x Collateral</span>
                      <Badge variant={selectedLoan.amount <= (selectedMember.savingsBalance + selectedMember.sharesBalance) * 2 ? "default" : "destructive"}>
                        {selectedLoan.amount <= (selectedMember.savingsBalance + selectedMember.sharesBalance) * 2 ? "✓ VALID" : "✗ EXCEEDED"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Review Form */}
                {selectedLoan.status === 'pending' && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Official Review Notes</Label>
                    <Textarea 
                      placeholder="Enter the rationale for approval or rejection..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="min-h-[100px] rounded-2xl border-slate-200 focus:border-indigo-400 transition-all text-sm font-medium"
                    />
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t flex flex-col sm:flex-row gap-3 justify-end items-center mt-auto">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold order-2 sm:order-1 w-full sm:w-auto">Dismiss</Button>
                {selectedLoan.status === 'pending' && (
                  <div className="flex gap-3 w-full sm:w-auto order-1 sm:order-2">
                    <Button variant="destructive" onClick={handleRejectLoan} className="flex-1 sm:flex-none font-bold rounded-xl shadow-lg shadow-rose-500/10">Reject</Button>
                    <Button 
                      onClick={handleApproveLoan}
                      disabled={guarantorRequests.some(r => r.status === 'pending')}
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 font-black rounded-xl shadow-lg shadow-emerald-600/20"
                    >
                      Approve & Disburse
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Manual Loan Dialog ── */}
      <Dialog open={isManualLoanDialogOpen} onOpenChange={setIsManualLoanDialogOpen}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black text-slate-900">Record Internal Loan</DialogTitle>
            <DialogDescription className="font-medium text-slate-500 uppercase tracking-widest text-[10px]">Manual Entry System</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {manualLoanError && (
              <Alert variant="destructive" className="rounded-xl border-2">
                <AlertDescription className="font-bold text-sm">{manualLoanError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Member Selection</Label>
                <select 
                  className="w-full h-11 px-4 bg-slate-50 border-slate-200 rounded-xl font-medium text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                  value={manualLoanData.memberId}
                  onChange={(e) => setManualLoanData({...manualLoanData, memberId: e.target.value})}
                >
                   <option value="">Select a member...</option>
                   {members.map(m => {
                     const registrationDate = m.dateJoined instanceof Date ? m.dateJoined : new Date(m.dateJoined);
                     const monthsAsMember = (new Date().getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
                     const hasOutstandingLoan = (m.loanBalance || 0) > 0;
                     const isTenureInvalid = monthsAsMember < 6;
                     const isDisabled = hasOutstandingLoan || isTenureInvalid;
                     
                     let suffix = "";
                     if (hasOutstandingLoan) suffix = " (Outstanding Loan)";
                     else if (isTenureInvalid) suffix = ` (less than ${Math.floor(monthsAsMember)}m tenure)`;

                     return (
                       <option key={m.id} value={m.id} disabled={isDisabled} className={isDisabled ? "text-slate-400" : ""}>
                         {m.firstName} {m.lastName} ({m.memberNumber}){suffix}
                       </option>
                     );
                   })}
                </select>

                {manualLoanData.memberId && (
                  <div className="grid grid-cols-2 gap-3 mt-2 animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                       <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Total Shares</p>
                       <p className="text-sm font-bold text-emerald-700">{formatCurrency(members.find(m => m.id === manualLoanData.memberId)?.sharesBalance || 0)}</p>
                    </div>
                    <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                       <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Total Savings</p>
                       <p className="text-sm font-bold text-indigo-700">{formatCurrency(members.find(m => m.id === manualLoanData.memberId)?.savingsBalance || 0)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Principal Amount (₦)</Label>
                <Input 
                  type="number"
                  placeholder="500000"
                  value={manualLoanData.amount}
                  onChange={(e) => setManualLoanData({...manualLoanData, amount: e.target.value})}
                  className="h-11 rounded-xl font-bold bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Tenure (Months)</Label>
                <select 
                   className="w-full h-11 px-4 bg-slate-50 border-slate-200 rounded-xl font-medium text-sm outline-none"
                   value={manualLoanData.duration}
                   onChange={(e) => setManualLoanData({...manualLoanData, duration: e.target.value})}
                >
                   {[6, 12, 18, 24, 36, 48].map(m => (
                     <option key={m} value={m.toString()}>{m} Months</option>
                   ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Scan Attachment (Optional)</Label>
                <Input 
                   type="file" 
                   accept="image/*,.pdf"
                   onChange={handleFileChange}
                   className="h-11 rounded-xl file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-indigo-50 file:text-indigo-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
               <div className="space-y-2">
                  <Label className="font-bold text-slate-700">First Guarantor</Label>
                   <select 
                    className="w-full h-10 px-3 bg-slate-50 border-slate-100 rounded-xl text-xs outline-none"
                    value={manualLoanData.guarantor1Id}
                    onChange={(e) => setManualLoanData({...manualLoanData, guarantor1Id: e.target.value})}
                   >
                     <option value="">Select internal guarantor 1...</option>
                     {members.filter(m => m.id !== manualLoanData.memberId).map(m => (
                       <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                     ))}
                   </select>
               </div>
               <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Second Guarantor</Label>
                   <select 
                    className="w-full h-10 px-3 bg-slate-50 border-slate-100 rounded-xl text-xs outline-none"
                    value={manualLoanData.guarantor2Id}
                    onChange={(e) => setManualLoanData({...manualLoanData, guarantor2Id: e.target.value})}
                   >
                     <option value="">Select internal guarantor 2...</option>
                     {members.filter(m => m.id !== manualLoanData.memberId && m.id !== manualLoanData.guarantor1Id).map(m => (
                       <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                     ))}
                   </select>
               </div>
            </div>

            <div className="pt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsManualLoanDialogOpen(false)} className="font-bold">Cancel</Button>
              <Button onClick={handleManualLoanSubmit} className="bg-indigo-600 hover:bg-indigo-700 font-black rounded-xl px-8 h-12 shadow-xl shadow-indigo-600/20">Commit Record</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Document Preview Modal ── */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 border-none rounded-3xl overflow-hidden shadow-2xl bg-slate-900/40 backdrop-blur-xl">
          <div className="bg-white/95 p-6 border-b flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                   <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                   <h3 className="text-lg font-black text-slate-900 leading-none">Record Evidence</h3>
                   <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Digital Archive — Secured View</p>
                </div>
             </div>
             <Button variant="ghost" size="icon" onClick={() => setIsPreviewOpen(false)} className="rounded-full hover:bg-slate-100 italic font-medium">ESC</Button>
          </div>
          
          <div className="flex-1 bg-slate-950 p-2 sm:p-4 overflow-hidden flex items-center justify-center relative">
            {previewUrl ? (
              previewUrl.startsWith('data:application/pdf') ? (
                <iframe src={previewUrl} className="w-full h-full rounded-2xl border-none shadow-2xl" />
              ) : (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-4 custom-scrollbar">
                  <img src={previewUrl} alt="Document" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/10" />
                </div>
              )
            ) : (
              <div className="text-slate-500 flex flex-col items-center gap-4 py-20 italic">
                <Shield className="w-12 h-12 opacity-20" />
                No document found in archive for this record
              </div>
            )}
          </div>
          
          <div className="bg-white/95 p-4 flex justify-end gap-3 border-t">
             <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="font-black rounded-xl h-12 px-10 border-slate-200">Close Archive</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
