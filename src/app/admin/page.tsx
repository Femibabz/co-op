'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/mock-data';
import { DashboardStats } from '@/types';
import {
  Users, PiggyBank, Coins, Building2, TrendingUp,
  FileClock, Clock, ArrowRight, CreditCard, Calculator,
  Activity, ChevronRight, AlertCircle, CheckCircle2,
  Building
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Society } from '@/types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    pendingApplications: 0,
    pendingLoans: 0,
    totalSavings: 0,
    totalLoans: 0,
    totalShares: 0,
    totalWithOrganization: 0,
  });
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [recentLoans, setRecentLoans] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const { user } = useAuth();
  const [society, setSociety] = useState<Society | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!user?.societyId) {
        setLoading(false);
        return;
      }

      // Fetch society name
      const socData = await db.getSocietyById(user.societyId);
      setSociety(socData || null);

      const membersData = await db.getMembers(user.societyId);
      const applications = await db.getApplications(user.societyId);
      const loanApplications = await db.getLoanApplications(user.societyId);

      const totalSavings = membersData.reduce((s, m) => s + m.savingsBalance, 0);
      const totalLoans = membersData.reduce((s, m) => s + m.loanBalance, 0);
      const totalShares = membersData.reduce((s, m) => s + m.sharesBalance, 0);

      setStats({
        totalMembers: membersData.length,
        pendingApplications: applications.filter(a => a.status === 'pending').length,
        pendingLoans: loanApplications.filter(l => l.status === 'pending').length,
        totalSavings, totalLoans, totalShares,
        totalWithOrganization: totalSavings + totalShares,
      });

      setMembers(membersData);
      setRecentApplications(applications.filter(a => a.status === 'pending').slice(0, 5));
      setRecentLoans(loanApplications.filter(l => l.status === 'pending').slice(0, 5));
      setLoading(false);
    };
    if (user) loadStats();
  }, [user]);

  const fmt = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest mb-1">{greeting} 👋</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Society Dashboard</h1>
          <p className="text-slate-500 mt-1 font-medium">Here's what's happening with {society?.name || 'your cooperative'} today.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/process-payment"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all duration-200 hover:-translate-y-0.5"
          >
            <CreditCard className="w-4 h-4" />
            Process Payment
          </Link>
          <Link
            href="/admin/calculate-interest"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm transition-all duration-200"
          >
            <Calculator className="w-4 h-4" />
            Interest
          </Link>
        </div>
      </div>

      {/* Alert if pending items */}
      {(stats.pendingApplications > 0 || stats.pendingLoans > 0) && (
        <div className="flex items-start gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-amber-800 font-bold text-sm">Action required</p>
            <p className="text-amber-700 text-sm mt-0.5">
              {stats.pendingApplications > 0 && `${stats.pendingApplications} membership application${stats.pendingApplications > 1 ? 's' : ''} `}
              {stats.pendingApplications > 0 && stats.pendingLoans > 0 && 'and '}
              {stats.pendingLoans > 0 && `${stats.pendingLoans} loan request${stats.pendingLoans > 1 ? 's' : ''} `}
              awaiting your review.
            </p>
          </div>
          <Link href="/admin/applications" className="text-amber-600 hover:text-amber-800 text-xs font-bold shrink-0 hover:underline">Review →</Link>
        </div>
      )}

      {/* Primary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Members', value: String(stats.totalMembers),
            icon: Users, color: 'emerald',
            bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600',
            trend: 'Active cooperative members',
          },
          {
            label: 'Total Savings', value: fmt(stats.totalSavings),
            icon: PiggyBank, color: 'blue',
            bg: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
            trend: 'Member savings deposits',
          },
          {
            label: 'Total Shares', value: fmt(stats.totalShares),
            icon: TrendingUp, color: 'violet',
            bg: 'bg-violet-50', iconBg: 'bg-violet-100', iconColor: 'text-violet-600',
            trend: 'Share capital invested',
          },
          {
            label: 'Total Assets', value: fmt(stats.totalWithOrganization),
            icon: Building2, color: 'emerald', special: true,
            bg: 'bg-emerald-600', iconBg: 'bg-white/20', iconColor: 'text-white',
            trend: 'Savings + Shares combined',
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`${card.special ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-xl shadow-emerald-200' : 'bg-white border border-slate-100 shadow-sm hover:shadow-md'} rounded-2xl p-5 sm:p-6 flex flex-col gap-4 transition-all duration-300 group`}
          >
            <div className="flex items-start justify-between">
              <p className={`text-xs font-bold uppercase tracking-widest ${card.special ? 'text-emerald-100' : 'text-slate-400'}`}>
                {card.label}
              </p>
              <div className={`${card.iconBg} p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-200`}>
                <card.icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>
            <div>
              <p className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${card.special ? 'text-white' : 'text-slate-900'}`}>
                {card.value}
              </p>
              <p className={`text-xs mt-1 font-medium ${card.special ? 'text-emerald-200' : 'text-slate-400'}`}>
                {card.trend}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary stat strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-rose-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="p-3 bg-rose-50 rounded-xl group-hover:scale-110 transition-transform duration-200">
            <Coins className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Outstanding Loans</p>
            <p className="text-xl font-extrabold text-rose-600 tracking-tight">{fmt(stats.totalLoans)}</p>
          </div>
        </div>
        <Link
          href="/admin/applications"
          className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 group"
        >
          <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform duration-200">
            <FileClock className="w-5 h-5 text-slate-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Applications</p>
            <p className="text-xl font-extrabold text-slate-900 tracking-tight">{stats.pendingApplications}</p>
          </div>
          {stats.pendingApplications > 0 && (
            <span className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse shrink-0" />
          )}
        </Link>
        <Link
          href="/admin/loans"
          className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 group"
        >
          <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform duration-200">
            <Clock className="w-5 h-5 text-slate-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Loans</p>
            <p className="text-xl font-extrabold text-slate-900 tracking-tight">{stats.pendingLoans}</p>
          </div>
          {stats.pendingLoans > 0 && (
            <span className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse shrink-0" />
          )}
        </Link>
      </div>

      {/* Activity feeds */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Membership applications */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 tracking-tight">Recent Applications</h3>
              <p className="text-slate-400 text-xs font-medium mt-0.5">Pending membership requests</p>
            </div>
            <Link
              href="/admin/applications"
              className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentApplications.length > 0 ? recentApplications.map((app) => (
              <div key={app.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-100 flex items-center justify-center shrink-0 font-bold text-slate-500 text-sm group-hover:border-emerald-200 transition-colors">
                  {app.firstName?.[0]}{app.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{app.firstName} {app.lastName}</p>
                  <p className="text-slate-400 text-xs truncate">{app.email}</p>
                </div>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-amber-100 shrink-0">
                  Pending
                </span>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-300" />
                <p className="text-slate-400 text-sm font-medium">All caught up!</p>
                <p className="text-slate-300 text-xs">No pending applications</p>
              </div>
            )}
          </div>
          {recentApplications.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-50">
              <Link
                href="/admin/applications"
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all duration-200"
              >
                View All Applications <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Loan applications */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 tracking-tight">Loan Requests</h3>
              <p className="text-slate-400 text-xs font-medium mt-0.5">Pending financial assistance</p>
            </div>
            <Link
              href="/admin/loans"
              className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentLoans.length > 0 ? recentLoans.map((loan) => {
              const member = members.find(m => m.id === loan.memberId);
              return (
                <div key={loan.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-100 flex items-center justify-center shrink-0 group-hover:border-rose-200 transition-colors">
                    <Coins className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">
                      {member ? `${member.firstName} ${member.lastName}` : 'Unknown Member'}
                    </p>
                    <p className="text-rose-500 text-xs font-bold">
                      {fmt(loan.amount)}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-amber-100 shrink-0">
                    Pending
                  </span>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-300" />
                <p className="text-slate-400 text-sm font-medium">All caught up!</p>
                <p className="text-slate-300 text-xs">No pending loan requests</p>
              </div>
            )}
          </div>
          {recentLoans.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-50">
              <Link
                href="/admin/loans"
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all duration-200"
              >
                View All Loans <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions grid */}
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 mb-4 tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { href: '/admin/members', label: 'Manage Members', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100 hover:border-emerald-200' },
            { href: '/admin/applications', label: 'Review Applications', icon: FileClock, color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-100 hover:border-amber-200' },
            { href: '/admin/loans', label: 'Manage Loans', icon: Coins, color: 'text-rose-600', bg: 'bg-rose-50 hover:bg-rose-100 border-rose-100 hover:border-rose-200' },
            { href: '/admin/process-payment', label: 'Process Payment', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100 border-blue-100 hover:border-blue-200' },
            { href: '/admin/financial-updates', label: 'Financial Updates', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50 hover:bg-violet-100 border-violet-100 hover:border-violet-200' },
            { href: '/admin/calculate-interest', label: 'Calculate Interest', icon: Calculator, color: 'text-teal-600', bg: 'bg-teal-50 hover:bg-teal-100 border-teal-100 hover:border-teal-200' },
            { href: '/admin/bylaws', label: 'By-Laws', icon: Activity, color: 'text-slate-600', bg: 'bg-slate-50 hover:bg-slate-100 border-slate-100 hover:border-slate-200' },
            { href: '/admin/access-logs', label: 'Access Logs', icon: Activity, color: 'text-slate-500', bg: 'bg-slate-50 hover:bg-slate-100 border-slate-100 hover:border-slate-200' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-3 p-4 sm:p-5 rounded-2xl border ${item.bg} transition-all duration-200 group`}
            >
              <div className={`p-2.5 rounded-xl bg-white shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <span className="text-xs font-bold text-slate-700 text-center leading-tight">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
