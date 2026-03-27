'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/lib/mock-data';
import { Transaction, LoginSession, Member, User } from '@/types';
import {
  Users,
  Building2,
  TrendingUp,
  Coins,
  ShieldCheck,
  History,
  ArrowRight,
  PieChart,
  Wallet,
  Activity,
  FileClock
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    activeSocieties: 0,
    totalSocieties: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalMembers: 0,
    activeMembers: 0,
    totalSavings: 0,
    totalLoans: 0,
    totalShares: 0,
    totalWithPlatform: 0,
    pendingApplications: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [recentSessions, setRecentSessions] = useState<LoginSession[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const loadData = async () => {
      // Get platform statistics
      const platformStats = await db.getPlatformStatistics();
      setStats(platformStats);

      // Get recent transactions (last 10)
      const allTransactions = await db.getTransactions();
      setRecentTransactions(allTransactions.slice(0, 10));

      // Get recent login sessions (last 15)
      const allSessions = await db.getLoginSessions();
      setRecentSessions(allSessions.slice(0, 15));

      // Get all members and users
      const allMembers = await db.getAllMembers();
      const allUsers = await db.getAllUsers();
      setMembers(allMembers);
      setUsers(allUsers);
    };

    loadData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (date: Date) => {
    return new Date(date).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate financial metrics
  const totalRevenue = stats.totalSavings + stats.totalShares;
  const outstandingLoans = stats.totalLoans;
  const interestEarned = members.reduce((sum, m) => sum + (m.interestBalance || 0), 0);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Platform Intelligence</p>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Executive Dashboard</h2>
        </div>
        <div className="flex items-center gap-3">
          <Button className="btn-premium bg-indigo-600 hover:bg-indigo-700" asChild>
            <Link href="/super-admin/database-setup">
              <ShieldCheck className="w-4 h-4 mr-2" />
              System Audit
            </Link>
          </Button>
        </div>
      </div>

      {/* Financial Hub */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="premium-card p-8 bg-emerald-600 text-white border-transparent shadow-xl shadow-emerald-200/50 group">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <p className="text-emerald-100 font-bold text-[10px] uppercase tracking-widest">Total Savings</p>
          </div>
          <p className="text-3xl font-extrabold tracking-tight group-hover:scale-105 transition-transform duration-300">
            {formatCurrency(stats.totalSavings)}
          </p>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></div>
            <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider tabular-nums">Liquidity: Stable</span>
          </div>
        </div>

        <div className="premium-card p-8 bg-blue-600 text-white border-transparent shadow-xl shadow-blue-200/50 group">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-white/20 rounded-2xl">
              <PieChart className="w-6 h-6 text-white" />
            </div>
            <p className="text-blue-100 font-bold text-[10px] uppercase tracking-widest">Share Capital</p>
          </div>
          <p className="text-3xl font-extrabold tracking-tight group-hover:scale-105 transition-transform duration-300">
            {formatCurrency(stats.totalShares)}
          </p>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-300"></div>
            <span className="text-[10px] text-blue-100 font-bold uppercase tracking-wider">Equity Allocation</span>
          </div>
        </div>

        <div className="premium-card p-8 bg-rose-600 text-white border-transparent shadow-xl shadow-rose-200/50 group">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <p className="text-rose-100 font-bold text-[10px] uppercase tracking-widest">Active Credit</p>
          </div>
          <p className="text-3xl font-extrabold tracking-tight group-hover:scale-105 transition-transform duration-300">
            {formatCurrency(outstandingLoans)}
          </p>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-300"></div>
            <span className="text-[10px] text-rose-100 font-bold uppercase tracking-wider">Lending Exposure</span>
          </div>
        </div>

        <div className="premium-card p-8 bg-indigo-600 text-white border-transparent shadow-xl shadow-indigo-200/50 group">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-white/20 rounded-2xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <p className="text-indigo-100 font-bold text-[10px] uppercase tracking-widest">Growth Index</p>
          </div>
          <p className="text-3xl font-extrabold tracking-tight group-hover:scale-105 transition-transform duration-300">
            {formatCurrency(interestEarned)}
          </p>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-300"></div>
            <span className="text-[10px] text-indigo-100 font-bold uppercase tracking-wider">Interest Earnings</span>
          </div>
        </div>
      </div>

      {/* Society Health Metrics */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="premium-card p-6 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Total Membership</p>
            <Users className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-4xl font-extrabold text-slate-900 tracking-tight">{stats.totalMembers}</p>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{stats.activeMembers} ACTIVE USERS</p>
          </div>
        </div>

        <div className="premium-card p-6 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Platform Access</p>
            <Activity className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-4xl font-extrabold text-slate-900 tracking-tight">{stats.totalUsers}</p>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{stats.activeUsers} SESSIONS</p>
          </div>
        </div>

        <div className="premium-card p-6 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Managed Societies</p>
            <Building2 className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-4xl font-extrabold text-slate-900 tracking-tight">{stats.totalSocieties}</p>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{stats.activeSocieties} ACTIVE SOCIETIES</p>
          </div>
        </div>

        <div className="premium-card p-6 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Pending Requests</p>
            <FileClock className="w-4 h-4 text-slate-300 group-hover:text-rose-500 transition-colors" />
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-4xl font-extrabold text-rose-600 tracking-tight">{stats.pendingApplications}</p>
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">AWAITING REVIEW</p>
          </div>
        </div>

        <div className="premium-card p-6 bg-slate-50 border-slate-200/60 transition-all hover:bg-slate-100/50 flex flex-col justify-center gap-4">
          <Button variant="outline" className="rounded-xl font-bold border-2 bg-white h-12 hover:scale-[1.02] transition-transform" asChild>
            <Link href="/seed-bylaws">
              <ShieldCheck className="w-4 h-4 mr-2 text-indigo-600" />
              Configure By-Laws
            </Link>
          </Button>
          <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-widest tabular-nums leading-none">Initialization System v1.4.2</p>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid gap-8">
        {/* Recent Transactions */}
        <div className="premium-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Financial Transaction Flow</h3>
              <p className="text-slate-500 font-medium">Monitoring real-time liquidity movements</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="font-extrabold uppercase text-[10px] tracking-widest py-4">Timeline</TableHead>
                  <TableHead className="font-extrabold uppercase text-[10px] tracking-widest py-4">Entity</TableHead>
                  <TableHead className="font-extrabold uppercase text-[10px] tracking-widest py-4">Classification</TableHead>
                  <TableHead className="font-extrabold uppercase text-[10px] tracking-widest py-4 text-right">Volume (NGN)</TableHead>
                  <TableHead className="font-extrabold uppercase text-[10px] tracking-widest py-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-medium italic">
                      Zero transaction volume detected
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTransactions.map((transaction) => {
                    const member = members.find(m => m.id === transaction.memberId);
                    return (
                      <TableRow key={transaction.id} className="group border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-xs font-bold text-slate-500 tabular-nums py-5">{formatDateShort(transaction.date)}</TableCell>
                        <TableCell className="font-extrabold text-slate-900 py-5">
                          {member ? `${member.firstName} ${member.lastName}` : 'System'}
                        </TableCell>
                        <TableCell className="py-5">
                          <Badge className={`rounded-lg uppercase text-[9px] font-extrabold tracking-widest px-2 py-1 ${transaction.type.includes('deposit') || transaction.type.includes('payment') ? 'bg-emerald-100 text-emerald-700' :
                            transaction.type.includes('withdrawal') || transaction.type.includes('disbursement') ? 'bg-rose-100 text-rose-700' :
                              'bg-indigo-100 text-indigo-700'
                            }`}>
                            {transaction.type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-900 tabular-nums py-5">
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Finalized</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* User Session Monitoring */}
        <div className="premium-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Access Control & Sessions</h3>
              <p className="text-slate-500 font-medium">Real-time security auditing and device tracking</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="font-extrabold uppercase text-[10px] tracking-widest py-4">Auth Identity</TableHead>
                  <TableHead className="font-extrabold uppercase text-[10px] tracking-widest py-4">Privilege</TableHead>
                  <TableHead className="font-extrabold uppercase text-[10px] tracking-widest py-4">Observation Time</TableHead>
                  <TableHead className="font-extrabold uppercase text-[10px] tracking-widest py-4">Origin Hub</TableHead>
                  <TableHead className="font-extrabold uppercase text-[10px] tracking-widest py-4">Environment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSessions.map((session) => (
                  <TableRow key={session.id} className="group border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-extrabold text-slate-900 py-5">{session.userEmail}</TableCell>
                    <TableCell className="py-5">
                      <Badge className={`rounded-lg uppercase text-[9px] font-extrabold tracking-widest px-2 py-1 ${session.userRole === 'super_admin' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                        session.userRole === 'admin' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                        {session.userRole}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-500 tabular-nums py-5">{formatDate(session.loginTime)}</TableCell>
                    <TableCell className="text-xs font-bold text-slate-600 py-5">
                      {session.locationInfo?.city || 'HQ'}, {session.locationInfo?.country || 'INTERNAL'}
                    </TableCell>
                    <TableCell className="py-5">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${session.sessionActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Activity className="w-4 h-4" />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${session.sessionActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {session.sessionActive ? 'Live Connect' : 'Disconnected'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
