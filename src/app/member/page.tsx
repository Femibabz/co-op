'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { db } from '@/lib/mock-data';
import { getLoanSummary, formatNaira, getNextMonthInterestPreview } from '@/lib/loan-utils';
import { Member, LoanApplication, GuarantorRequest, BroadcastMessage } from '@/types';
import {
  TrendingUp,
  Wallet,
  CircleDollarSign,
  AlertCircle,
  ArrowUpRight,
  PlusCircle,
  History,
  Info,
  Coins,
  ShieldCheck,
  ShieldX,
  Shield,
  CheckCheck,
  Megaphone,
  Bell
} from 'lucide-react';

export default function MemberDashboard() {
  const { user } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [loanApplications, setLoanApplications] = useState<LoanApplication[]>([]);
  const [guarantorRequests, setGuarantorRequests] = useState<GuarantorRequest[]>([]);
  const [activeGuarantees, setActiveGuarantees] = useState<GuarantorRequest[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadDashboard = async () => {
    if (user?.role === 'member') {
      try {
        const memberData = await db.getMemberByUserId(user.id);
        if (memberData) {
          setMember(memberData);
          const loans = await db.getLoanApplicationsByMember(memberData.id);
          setLoanApplications(loans);
          // Guarantor requests pending this member's response
          const allReqs = await db.getGuarantorRequestsForMember(memberData.id);
          setGuarantorRequests(allReqs.filter(r => r.status === 'pending'));
          setActiveGuarantees(allReqs.filter(r => r.status === 'approved'));
          // Unread broadcasts
          if (user.societyId) {
            const msgs = await db.getBroadcastMessages(user.societyId);
            console.log('MemberDashboard: All broadcasts for society:', msgs);
            const unread = msgs.filter(m => !m.readBy.includes(memberData.id));
            console.log('MemberDashboard: Unread broadcasts:', unread);
            setBroadcasts(unread);
          }
        }
        setIsLoaded(true);
      } catch (error) {
        console.error('Error loading member data:', error);
        setIsLoaded(true);
      }
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getStatusColor = (status: string): BadgeProps['variant'] => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Dashboard</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <div className="p-4 bg-rose-50 rounded-full">
          <AlertCircle className="w-12 h-12 text-rose-500" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-slate-900">Member profile not found</h3>
          <p className="text-slate-500">We couldn't retrieve your data. Please try again or contact support.</p>
        </div>
        <Button onClick={() => window.location.reload()} className="btn-premium">
          Retry Sync
        </Button>
      </div>
    );
  }

  const loanInfo = getLoanSummary(member);
  const nextInterestPreview = getNextMonthInterestPreview(member);

  return (
    <div className="space-y-8">
      {/* ── Priority Action Banners (Prominent Pop-ups) ──────────────── */}
      {guarantorRequests.length > 0 && (
        <div className="animate-in slide-in-from-top duration-500">
          <Card className="border-2 border-violet-200 bg-violet-50/50 shadow-xl shadow-violet-100/50 overflow-hidden rounded-[2rem]">
            <div className="flex flex-col md:flex-row items-center gap-6 p-8">
              <div className="w-16 h-16 rounded-2xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-violet-600/20">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="flex-1 text-center md:text-left space-y-1">
                <h3 className="text-xl font-black text-violet-900 tracking-tight flex items-center justify-center md:justify-start gap-2">
                  Action Required: Endorsement Request
                  <Badge className="bg-violet-600 text-white border-none py-0.5">{guarantorRequests.length}</Badge>
                </h3>
                <p className="text-violet-700 font-bold">
                  Members have requested your official endorsement for their applications. Your response is required to proceed.
                </p>
              </div>
              <div className="shrink-0">
                <Button
                  onClick={() => document.getElementById('guarantor-requests-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="rounded-xl px-8 h-12 bg-violet-600 hover:bg-violet-700 text-white font-black shadow-lg shadow-violet-600/20 active:scale-95 transition-all"
                >
                  Review Requests
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-bold text-primary uppercase tracking-widest">Account Overview</p>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Hi, {member.firstName} 👋
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl font-bold border-2" asChild>
            <Link href="/member/transactions">
              <History className="w-4 h-4 mr-2" />
              History
            </Link>
          </Button>
          <Button className="btn-premium" asChild>
            <Link href="/member/apply-loan">
              <PlusCircle className="w-4 h-4 mr-2" />
              New Loan
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Broadcast Messages ─────────────────────────────────── */}
      {broadcasts.length > 0 && (
        <div className="space-y-3">
          {broadcasts
            .filter(msg => {
              const fiveDaysAgo = new Date();
              fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
              return new Date(msg.sentAt) >= fiveDaysAgo;
            })
            .map(msg => (
              <div key={msg.id} className="flex items-start gap-4 p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900">
                <div className="mt-0.5 shrink-0">
                  <Megaphone className="w-5 h-5 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold uppercase tracking-tight">{msg.subject}</p>
                  <p className="text-xs font-medium opacity-80 mt-1 whitespace-pre-line">{msg.body}</p>
                  <p className="text-[10px] mt-2 text-sky-600 font-bold">{new Date(msg.sentAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={async () => {
                    if (!member) {
                      console.warn('MemberDashboard: Cannot dismiss, member data missing');
                      return;
                    }
                    console.log(`MemberDashboard: Dismiss clicking! msgId: ${msg.id}, memberId: ${member.id}`);
                    try {
                      await db.markBroadcastRead(msg.id, member.id);
                      console.log('MemberDashboard: db.markBroadcastRead completed');
                      setBroadcasts(prev => {
                        const next = prev.filter(m => m.id !== msg.id);
                        console.log(`MemberDashboard: Updating UI state. Remaining broadcasts: ${next.length}`);
                        return next;
                      });
                    } catch (err) {
                      console.error('MemberDashboard: Error during dismissal:', err);
                    }
                  }}
                  className="shrink-0 text-sky-400 hover:text-sky-700 transition-colors"
                  title="Dismiss"
                >
                  <CheckCheck className="w-5 h-5" />
                </button>
              </div>
            ))}
        </div>
      )}

      {/* ── Pending Guarantor Requests ─────────────────────────── */}
      {guarantorRequests.length > 0 && (
        <div id="guarantor-requests-section" className="premium-card p-6 space-y-4 border-violet-200 bg-violet-50/40 scroll-mt-8">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-violet-600" />
            <h3 className="font-extrabold text-violet-900 uppercase tracking-tight text-sm">Official Requests</h3>
            <span className="ml-auto bg-violet-600 text-white text-xs font-bold rounded-full px-2 py-0.5">{guarantorRequests.length}</span>
          </div>
          <p className="text-xs text-violet-700 font-medium">These members have selected you as a guarantor for their application. Please review and respond.</p>
          <div className="space-y-3">
            {guarantorRequests.map(req => (
              <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-violet-100">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-slate-800">{req.applicantName}</p>
                  <p className="text-xs text-slate-500">{req.type === 'loan' ? 'Loan Application' : 'Membership Application'} · Requested {new Date(req.requestedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={async () => {
                      await db.updateGuarantorRequest(req.id, 'declined');
                      setGuarantorRequests(prev => prev.filter(r => r.id !== req.id));
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    onClick={async () => {
                      await db.updateGuarantorRequest(req.id, 'approved');
                      setGuarantorRequests(prev => prev.filter(r => r.id !== req.id));
                      loadDashboard();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Financial Hub */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Total Assets Card - Prominent */}
        <div className="lg:col-span-2 relative overflow-hidden p-8 rounded-3xl bg-slate-900 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-emerald-400 font-bold uppercase tracking-wider text-xs">Total Balance with Society</p>
                <h3 className="text-5xl font-extrabold tracking-tight">
                  {formatCurrency(member.sharesBalance + member.savingsBalance)}
                </h3>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <Wallet className="w-8 h-8 text-emerald-300" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
              <div className="space-y-1 hover:translate-x-1 transition-transform cursor-default">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Shares Capital</p>
                <p className="text-xl font-bold">{formatCurrency(member.sharesBalance)}</p>
              </div>
              <div className="space-y-1 hover:translate-x-1 transition-transform cursor-default">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Personal Savings</p>
                <p className="text-xl font-bold">{formatCurrency(member.savingsBalance)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-4">
          <div className="premium-card p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Outstanding Loan</p>
              <p className={`text-2xl font-extrabold ${member.loanBalance > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {formatCurrency(member.loanBalance)}
              </p>
            </div>
            <div className={`p-2 rounded-xl ${member.loanBalance > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="premium-card p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Society Dues</p>
              <div className="flex items-center gap-3">
                <p className={`text-2xl font-extrabold ${member.societyDues > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {formatCurrency(member.societyDues)}
                </p>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-black uppercase tracking-tighter bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-200/50" asChild>
                  <Link href="/member/levies">View Breakdown</Link>
                </Button>
              </div>
            </div>
            <div className={`p-2 rounded-xl ${member.societyDues > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
              <CircleDollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Loan Intelligence Center */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        {/* Active Loan Details */}
        {loanInfo ? (
          <div className={`premium-card p-8 relative overflow-hidden border-2 shadow-xl ${loanInfo.isOverdue ? 'border-rose-200 bg-rose-50/30' : 'border-emerald-100 bg-white'}`}>
            <div className="flex items-start justify-between mb-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Active Loan Status</h3>
                  {loanInfo.isPenaltyRate && <Badge variant="destructive" className="animate-pulse">Penalty Applied</Badge>}
                </div>
                <p className="text-slate-500 font-medium">Monitoring your repayment health</p>
              </div>
              <div className={`p-3 rounded-2xl ${loanInfo.isOverdue ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
              <div className="space-y-1">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Balance</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(loanInfo.loanBalance)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Rate (mo.)</p>
                <p className="text-lg font-bold text-slate-900">{loanInfo.currentMonthlyRate}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Duration</p>
                <p className="text-lg font-bold text-slate-900">{loanInfo.monthsSinceDisbursement}mo</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Interest Due</p>
                <p className={`text-lg font-bold ${loanInfo.interestBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {formatCurrency(loanInfo.interestBalance)}
                </p>
              </div>
            </div>

            {/* Next Month Interest Preview */}
            {nextInterestPreview && !loanInfo.isOverdue && (
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between group cursor-default">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-indigo-900">Projected Interest Next Month (Locked-in)</p>
                    <p className="text-sm text-indigo-700">
                      {nextInterestPreview.isFirstInterest ? 'First interest' : 'Next interest'} of {formatCurrency(nextInterestPreview.amount)} will be charged on {nextInterestPreview.date.toLocaleDateString()} (Next month) — based on balance at start of period.
                    </p>
                  </div>
                </div>
                <p className="text-xl font-extrabold text-indigo-900">{formatCurrency(nextInterestPreview.amount)}</p>
              </div>
            )}

            {loanInfo.isOverdue && (
              <div className="p-4 rounded-2xl bg-rose-500 text-white flex items-center gap-4 animate-pulse">
                <AlertCircle className="w-6 h-6" />
                <div className="flex-1">
                  <p className="font-bold">URGENT: Loan Overdue</p>
                  <p className="text-xs text-rose-50 font-medium">Overdue by {loanInfo.monthsOverdue} month(s). Please settle outstanding amount immediately.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="premium-card p-12 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-2 border-slate-200">
            <div className="p-4 bg-slate-50 rounded-full">
              <Coins className="w-8 h-8 text-slate-300" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900">No Active Loans</h3>
              <p className="text-slate-500 text-sm max-w-xs">You currently don't have any running loans. You can apply for a new one anytime.</p>
            </div>
            <Button variant="outline" className="rounded-xl font-bold border-2" asChild>
              <Link href="/member/apply-loan">Apply Now</Link>
            </Button>
          </div>
        )}

        {/* Loan Applications Feed */}
        <div className="premium-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Recent Applications</h3>
              <p className="text-slate-500 font-medium">Tracking your request history</p>
            </div>
            <Button variant="ghost" size="sm" className="font-bold text-primary" asChild>
              <Link href="/member/apply-loan">View All</Link>
            </Button>
          </div>

          <div className="space-y-4">
            {loanApplications.length > 0 ? (
              loanApplications.slice(0, 3).map((loan) => (
                <div key={loan.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                      <CircleDollarSign className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-none mb-1">{formatCurrency(loan.amount)}</p>
                      <p className="text-xs text-slate-500 font-medium">{loan.appliedAt.toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge className={`rounded-lg uppercase text-[10px] font-extrabold tracking-widest px-2.5 py-1 ${loan.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    loan.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                    {loan.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 italic text-sm">
                No recent applications found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Discovery / Help */}
      <div className="premium-card bg-primary-gradient p-1 relative overflow-hidden rounded-3xl group">
        <div className="bg-white rounded-[20px] p-8 relative z-10 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-emerald-50 rounded-2xl">
                <Info className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-slate-900">Need Assistance?</h3>
                <p className="text-slate-500 font-medium">Understand how loan interests and penalty rates work in our by-laws.</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-xl font-bold border-2 px-8 h-12 hover:bg-slate-50 transition-all" asChild>
              <Link href="/member/bylaws">
                Read Society By-Laws
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
