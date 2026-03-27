'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, Users, FileText, Coins, CreditCard,
  TrendingUp, Calculator, BookOpen, Activity, LogOut,
  Menu, X, ChevronRight, Bell, Settings, Shield
} from 'lucide-react';
import { Society } from '@/types';
import { db } from '@/lib/mock-data';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/members', label: 'Members', icon: Users },
  { href: '/admin/applications', label: 'Applications', icon: FileText },
  { href: '/admin/loans', label: 'Loans', icon: Coins },
  { href: '/admin/transactions', label: 'Transactions', icon: Activity },
  { href: '/admin/process-payment', label: 'Payments', icon: CreditCard },
  { href: '/admin/financial-updates', label: 'Financial', icon: TrendingUp },
  { href: '/admin/bylaws', label: 'By-Laws', icon: BookOpen },
  { href: '/admin/access-logs', label: 'Access Logs', icon: Activity },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [society, setSociety] = useState<Society | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (user?.societyId) {
      db.getSocietyById(user.societyId).then(soc => setSociety(soc || null));
    }
  }, [user]);

  useEffect(() => {
    if (user?.isFirstLogin && pathname !== '/admin/change-password') {
      router.push('/admin/change-password');
    }
  }, [user, pathname, router]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const handleLogout = () => { logout(); router.push('/'); };

  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Shield className="w-8 h-8 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <p className="text-emerald-300 font-semibold text-sm tracking-widest uppercase animate-pulse">
            Loading Admin Portal...
          </p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  const activeItem = navItems.find(isActive);

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* ── Sidebar ── */}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 flex flex-col
          bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950
          border-r border-white/5 shadow-2xl
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:flex
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo area */}
        <div className="flex items-center gap-3 px-6 h-20 border-b border-white/5 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-extrabold text-lg leading-none tracking-tight truncate">
              {society?.name || 'Portal'}
            </p>
            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mt-1">Admin Portal</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav section label */}
        <div className="px-6 pt-6 pb-2">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Navigation</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold
                  transition-all duration-200 group relative
                  ${active
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <item.icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 text-emerald-200" />}
              </Link>
            );
          })}
        </nav>

        {/* User card at bottom */}
        <div className="px-3 pb-4 shrink-0">
          <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <span className="text-emerald-400 font-bold text-sm">
                  {user.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{user.email?.split('@')[0]}</p>
                <p className="text-slate-500 text-xs font-medium">Administrator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-bold transition-all duration-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center gap-4 px-4 sm:px-6 shrink-0 shadow-sm">
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-400 text-sm font-medium hidden sm:block">Admin</span>
            {activeItem && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 hidden sm:block" />
                <span className="text-slate-900 text-sm font-bold truncate">{activeItem.label}</span>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <span className="text-emerald-700 font-bold text-sm">
                  {user.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <span className="text-slate-700 text-sm font-semibold max-w-[120px] truncate">
                {user.email?.split('@')[0]}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto animate-fadeIn">
          {children}
        </main>
      </div>
    </div>
  );
}
