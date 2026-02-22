'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/mock-data';
import { DashboardStats } from '@/types';
import {
  Users,
  PiggyBank,
  Coins,
  Building2,
  TrendingUp,
  FileClock,
  Clock,
  ArrowRight
} from 'lucide-react';

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

  useEffect(() => {
    // Calculate statistics
    const loadStats = async () => {
      const membersData = await db.getMembers();
      const applications = await db.getApplications();
      const loanApplications = await db.getLoanApplications();

      const totalSavings = membersData.reduce((sum, member) => sum + member.savingsBalance, 0);
      const totalLoans = membersData.reduce((sum, member) => sum + member.loanBalance, 0);
      const totalShares = membersData.reduce((sum, member) => sum + member.sharesBalance, 0);
      const totalWithOrganization = totalSavings + totalShares;

      setStats({
        totalMembers: membersData.length,
        pendingApplications: applications.filter(app => app.status === 'pending').length,
        pendingLoans: loanApplications.filter(loan => loan.status === 'pending').length,
        totalSavings,
        totalLoans,
        totalShares,
        totalWithOrganization,
      });

      setMembers(membersData);

      // Set recent applications and loans
      setRecentApplications(applications.filter(app => app.status === 'pending').slice(0, 3));
      setRecentLoans(loanApplications.filter(loan => loan.status === 'pending').slice(0, 3));
    };
    loadStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Executive Overview</p>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Society Dashboard</h2>
        </div>
        <div className="flex items-center gap-3">
          <Button className="btn-premium" asChild>
            <Link href="/admin/process-payment">
              <Coins className="w-4 h-4 mr-2" />
              Process Payment
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="premium-card p-6 flex items-center justify-between group cursor-default">
          <div className="space-y-1">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Total Members</p>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.totalMembers}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="premium-card p-6 flex items-center justify-between group cursor-default">
          <div className="space-y-1">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Total Savings</p>
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{formatCurrency(stats.totalSavings)}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
            <PiggyBank className="w-6 h-6" />
          </div>
        </div>

        <div className="premium-card p-6 flex items-center justify-between group cursor-default shadow-emerald-100/50">
          <div className="space-y-1">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Total Shares</p>
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{formatCurrency(stats.totalShares)}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="premium-card p-6 flex items-center justify-between group cursor-default bg-emerald-600 text-white border-transparent shadow-xl shadow-emerald-200/50">
          <div className="space-y-1">
            <p className="text-emerald-100 font-bold text-[10px] uppercase tracking-widest">Total Assets</p>
            <p className="text-2xl font-extrabold tracking-tight">{formatCurrency(stats.totalWithOrganization)}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-2xl">
            <Building2 className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="premium-card p-6 flex items-center justify-between group cursor-default">
          <div className="space-y-1">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Outstanding Loans</p>
            <p className="text-2xl font-extrabold text-rose-600 tracking-tight">{formatCurrency(stats.totalLoans)}</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="premium-card p-6 flex items-center justify-between group cursor-default">
          <div className="space-y-1">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Pending Apps</p>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.pendingApplications}</p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
            <FileClock className="w-6 h-6" />
          </div>
        </div>

        <div className="premium-card p-6 flex items-center justify-between group cursor-default">
          <div className="space-y-1">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Pending Loans</p>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.pendingLoans}</p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Membership Applications */}
        <div className="premium-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Recent Applications</h3>
              <p className="text-slate-500 font-medium">New member requests awaiting review</p>
            </div>
          </div>
          <div className="space-y-4">
            {recentApplications.length > 0 ? (
              recentApplications.map((application) => (
                <div key={application.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <Users className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-none mb-1">{application.firstName} {application.lastName}</p>
                      <p className="text-xs text-slate-500 font-medium">{application.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="rounded-lg uppercase text-[10px] font-extrabold tracking-widest">Pending</Badge>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 italic text-sm">
                No pending applications
              </div>
            )}
            <Button variant="outline" className="w-full rounded-xl font-bold mt-4" asChild>
              <Link href="/admin/applications">
                View All Applications
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Recent Loan Applications */}
        <div className="premium-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Recent Loan Requests</h3>
              <p className="text-slate-500 font-medium">Financial assistance requests awaiting approval</p>
            </div>
          </div>
          <div className="space-y-4">
            {recentLoans.length > 0 ? (
              recentLoans.map((loan) => {
                const member = members.find(m => m.id === loan.memberId);
                return (
                  <div key={loan.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-xl shadow-sm">
                        <Coins className="w-5 h-5 text-rose-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-none mb-1">{member ? `${member.firstName} ${member.lastName}` : 'Guest'}</p>
                        <p className="text-xs text-slate-500 font-extrabold">{formatCurrency(loan.amount)}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-lg uppercase text-[10px] font-extrabold tracking-widest">Pending</Badge>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 italic text-sm">
                No pending loan applications
              </div>
            )}
            <Button variant="outline" className="w-full rounded-xl font-bold mt-4" asChild>
              <Link href="/admin/loans">
                View All Loans
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
