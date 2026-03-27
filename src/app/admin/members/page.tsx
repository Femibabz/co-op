'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { db } from '@/lib/mock-data';
import { getLoanSummary, formatNaira } from '@/lib/loan-utils';
import { Member, User, Transaction, Society } from '@/types';
import { Users, FileText, Activity, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function MembersPage() {
  const { user } = useAuth();
  const [society, setSociety] = useState<Society | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedMemberTransactions, setSelectedMemberTransactions] = useState<Transaction[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [nextMemberNumber, setNextMemberNumber] = useState('');

  const [newMemberForm, setNewMemberForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    memberNumber: '',
    password: 'member123', // Default password
    sharesBalance: '0',
    savingsBalance: '0',
  });

  useEffect(() => {
    if (user?.societyId) {
      loadMembers();
      db.getSocietyById(user.societyId).then(soc => setSociety(soc || null));
    }
  }, [user]);

  // Auto-generate sequential member number when add dialog opens
  useEffect(() => {
    if (!isAddingMember || !user?.societyId) return;
    const generateNextNumber = async () => {
      const allMembers = await db.getMembers(user.societyId);
      // Extract numeric suffixes from existing member numbers (e.g. "OSU001" → 1)
      const nums = allMembers
        .map(m => parseInt(m.memberNumber.replace(/\D/g, ''), 10))
        .filter(n => !isNaN(n));
      const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      const generated = `OSU${String(next).padStart(3, '0')}`;
      setNextMemberNumber(generated);
      setNewMemberForm(prev => ({ ...prev, memberNumber: generated }));
    };
    generateNextNumber();
  }, [isAddingMember, user]);

  const loadMembers = async () => {
    if (!user?.societyId) return;
    const allMembers = await db.getMembers(user.societyId);
    setMembers(allMembers);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const filteredMembers = members.filter(member =>
    member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.memberNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewMember = async (member: Member) => {
    setSelectedMember(member);
    setIsDialogOpen(true);

    // Load transactions for this member
    const transactions = await db.getTransactionsByMember(member.id, 12);
    setSelectedMemberTransactions(transactions);
  };

  // Edit functionality moved to Financial Updates page

  const handleNewMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!user?.societyId) throw new Error('Society association not found');

      const member = await db.createMemberWithUser({
        firstName: newMemberForm.firstName,
        lastName: newMemberForm.lastName,
        email: newMemberForm.email,
        phone: newMemberForm.phone,
        address: newMemberForm.address,
        societyId: user.societyId,
        sharesBalance: parseFloat(newMemberForm.sharesBalance) || 0,
        savingsBalance: parseFloat(newMemberForm.savingsBalance) || 0,
        occupation: '', // Default for now
        annualIncome: 0, // Default for now
        // Casting to any to pass password and memberNumber which createMemberWithUser supports internally
        ...({
          password: newMemberForm.password,
          memberNumber: newMemberForm.memberNumber
        } as any)
      });

      setSuccess('Member added successfully');
      setNextMemberNumber('');
      setNewMemberForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        memberNumber: '',
        password: 'member123',
        sharesBalance: '0',
        savingsBalance: '0',
      });
      setIsAddingMember(false);
      loadMembers();
    } catch (err: any) {
      console.error('Add member error:', err);
      setError(err.message || 'Failed to add member');
    }
  };

  // Edit functionality moved to Financial Updates page

  return (
    <div className="space-y-10">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Global Registry</p>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Members Management</h2>
          <p className="text-slate-500 font-medium">Coordinate and authorize society member accounts</p>
        </div>
        <Button onClick={() => setIsAddingMember(true)} className="btn-premium bg-emerald-600 hover:bg-emerald-700 h-12 px-8 rounded-xl font-bold shadow-lg shadow-emerald-200/50 transition-all hover:scale-105 active:scale-95">
          <Users className="w-5 h-5 mr-3" />
          Onboard New Member
        </Button>
      </div>

      {(error || success) && (
        <Alert variant={error ? "destructive" : "default"} className="rounded-2xl border-2 shadow-sm animate-fadeIn">
          <AlertDescription className="font-bold">{error || success}</AlertDescription>
        </Alert>
      )}

      {/* Search & Statistics Inline */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="relative w-full max-w-md">
          <Input
            placeholder="Search by name, email or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 pl-12 rounded-xl bg-white border-slate-200 focus:ring-emerald-500 border-2 font-medium transition-all"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
          <span className="text-sm font-black text-emerald-700 tabular-nums">{filteredMembers.length}</span>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Found in Registry</span>
        </div>
      </div>

      {/* Members Table */}
      <div className="premium-card overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-extrabold text-slate-900">Active Membership Directory</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Official platform records</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100 italic">
                <TableHead className="font-extrabold uppercase text-[10px] tracking-widest py-4 pl-8">Identity</TableHead>
                <TableHead className="font-extrabold uppercase text-[10px] tracking-widest py-4">Financial Status</TableHead>
                <TableHead className="font-extrabold uppercase text-[10px] tracking-widest py-4">Total Assets</TableHead>
                <TableHead className="font-extrabold uppercase text-[10px] tracking-widest py-4">Loan Position</TableHead>
                <TableHead className="font-extrabold uppercase text-[10px] tracking-widest py-4">Governance</TableHead>
                <TableHead className="font-extrabold uppercase text-[10px] tracking-widest py-4 pr-8 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => {
                const totalWithOrganization = member.sharesBalance + member.savingsBalance;
                const loanInfo = getLoanSummary(member);
                return (
                  <TableRow key={member.id} className="group border-slate-50 hover:bg-slate-50/40 transition-colors">
                    <TableCell className="py-6 pl-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center font-black text-emerald-700 text-xs shadow-inner">
                          {member.firstName[0]}{member.lastName[0]}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 leading-tight">{member.firstName} {member.lastName}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">{member.memberNumber}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center w-32">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Shares</span>
                          <span className="text-[10px] font-black text-slate-700 tabular-nums">{formatCurrency(member.sharesBalance)}</span>
                        </div>
                        <div className="flex justify-between items-center w-32">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Savings</span>
                          <span className="text-[10px] font-black text-slate-700 tabular-nums">{formatCurrency(member.savingsBalance)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <span className="text-sm font-black text-emerald-600 tabular-nums">{formatCurrency(totalWithOrganization)}</span>
                    </TableCell>
                    <TableCell className="py-6">
                      {loanInfo ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${loanInfo.isOverdue ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                            <span className="text-[10px] font-extrabold text-slate-900 tabular-nums">{formatCurrency(member.loanBalance)}</span>
                          </div>
                          <p className={`text-[9px] font-bold uppercase tracking-wider ${loanInfo.isOverdue ? 'text-rose-600' : 'text-slate-400'}`}>
                            {loanInfo.monthsRemaining} MONTHS REMAINING
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No Active Loan</span>
                      )}
                    </TableCell>
                    <TableCell className="py-6">
                      <Badge className={`rounded-lg uppercase text-[9px] font-extrabold tracking-widest px-2 py-1 ${member.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-6 pr-8 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewMember(member)}
                          className="h-10 px-4 rounded-xl font-bold border-2 hover:bg-slate-50 transition-all"
                        >
                          Focus
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-10 px-4 rounded-xl font-bold text-emerald-700 hover:bg-emerald-50 transition-all"
                        >
                          <Link href="/admin/financial-updates">Modify</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Member Modal */}
      <Dialog open={isAddingMember} onOpenChange={setIsAddingMember}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>
              Create a new member account with login credentials
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNewMemberSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={newMemberForm.firstName}
                  onChange={(e) => setNewMemberForm(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={newMemberForm.lastName}
                  onChange={(e) => setNewMemberForm(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newMemberForm.email}
                  onChange={(e) => setNewMemberForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Member Number</Label>
                <div className="flex items-center h-10 px-3 rounded-md border bg-slate-50 text-slate-700 font-bold tracking-wider">
                  {nextMemberNumber || <span className="text-slate-400 text-xs">Generating...</span>}
                </div>
                <p className="text-xs text-slate-500">Auto-assigned in sequential order</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newMemberForm.phone}
                onChange={(e) => setNewMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={newMemberForm.address}
                onChange={(e) => setNewMemberForm(prev => ({ ...prev, address: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sharesBalance">Initial Shares (NGN)</Label>
                <Input
                  id="sharesBalance"
                  type="text"
                  inputMode="numeric"
                  value={newMemberForm.sharesBalance === '0' ? '' : new Intl.NumberFormat('en-NG').format(parseFloat(newMemberForm.sharesBalance.replace(/,/g, '')) || 0)}
                  placeholder="0"
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, '');
                    if (/^\d*\.?\d*$/.test(raw)) setNewMemberForm(prev => ({ ...prev, sharesBalance: raw || '0' }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="savingsBalance">Initial Savings (NGN)</Label>
                <Input
                  id="savingsBalance"
                  type="text"
                  inputMode="numeric"
                  value={newMemberForm.savingsBalance === '0' ? '' : new Intl.NumberFormat('en-NG').format(parseFloat(newMemberForm.savingsBalance.replace(/,/g, '')) || 0)}
                  placeholder="0"
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, '');
                    if (/^\d*\.?\d*$/.test(raw)) setNewMemberForm(prev => ({ ...prev, savingsBalance: raw || '0' }));
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsAddingMember(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Member</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Member Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Member Number</Label>
                    <p className="text-sm">{selectedMember.memberNumber}</p>
                  </div>
                  <div>
                    <Label>Full Name</Label>
                    <p className="text-sm">{selectedMember.firstName} {selectedMember.lastName}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm">{selectedMember.email}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm">{selectedMember.phone}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Address</Label>
                  <p className="text-sm">{selectedMember.address}</p>
                </div>
              </div>

              {/* Financial Information */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Financial Information</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Shares Balance</Label>
                    <p className="text-sm font-medium">{formatCurrency(selectedMember.sharesBalance)}</p>
                  </div>
                  <div>
                    <Label>Savings Balance</Label>
                    <p className="text-sm font-medium">{formatCurrency(selectedMember.savingsBalance)}</p>
                  </div>
                  <div>
                    <Label>Total with Organization</Label>
                    <p className="text-sm font-medium text-blue-600">{formatCurrency(selectedMember.sharesBalance + selectedMember.savingsBalance)}</p>
                  </div>
                  <div>
                    <Label>Loan Balance</Label>
                    <p className="text-sm font-medium">{formatCurrency(selectedMember.loanBalance)}</p>
                  </div>
                  <div>
                    <Label>Interest Due</Label>
                    <p className="text-sm font-medium">{formatCurrency(selectedMember.interestBalance)}</p>
                  </div>
                  <div>
                    <Label>Society Dues</Label>
                    <p className="text-sm font-medium">{formatCurrency(selectedMember.societyDues)}</p>
                  </div>
                </div>
              </div>

              {/* Loan Information */}
              {(() => {
                const loanInfo = getLoanSummary(selectedMember);
                return loanInfo ? (
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-3">Loan Information</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>Loan Start Date</Label>
                        <p className="text-sm">{selectedMember.loanStartDate?.toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label>Loan End Date</Label>
                        <p className="text-sm">{loanInfo.loanEndDate?.toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label>Duration</Label>
                        <p className="text-sm">{selectedMember.loanDurationMonths} months</p>
                      </div>
                      <div>
                        <Label>Months Remaining</Label>
                        <p className={`text-sm font-medium ${loanInfo.isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                          {loanInfo.monthsRemaining} months
                        </p>
                      </div>
                      <div>
                        <Label>Interest Rate</Label>
                        <p className="text-sm">{selectedMember.loanInterestRate}% per annum</p>
                      </div>
                      <div>
                        <Label>Monthly Payment</Label>
                        <p className="text-sm">{formatCurrency(selectedMember.monthlyLoanPayment || 0)}</p>
                      </div>
                      <div>
                        <Label>Next Payment Due</Label>
                        <p className="text-sm">{loanInfo.nextPaymentDate?.toLocaleDateString() || 'N/A'}</p>
                      </div>
                      <div>
                        <Label>Loan Status</Label>
                        <Label>Loan Status</Label>
                        <p className="text-sm font-medium text-gray-700">Active Loan</p>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Transaction History */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Recent Transactions (Last 12 Months)</h3>
                {selectedMemberTransactions.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedMemberTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="text-sm">{transaction.date.toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {transaction.type.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-sm font-medium ${transaction.type.includes('deposit') || transaction.type.includes('disbursement')
                              ? 'text-green-600'
                              : 'text-red-600'
                              }`}>
                              {transaction.type.includes('deposit') || transaction.type.includes('disbursement') ? '+' : '-'}
                              {formatCurrency(transaction.amount)}
                            </TableCell>
                            <TableCell className="text-sm">{transaction.description}</TableCell>
                            <TableCell className="text-sm">{transaction.referenceNumber || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No transactions found</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit functionality moved to Financial Updates page */}
    </div>
  );
}
