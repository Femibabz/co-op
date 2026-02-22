'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/mock-data';
import { Member } from '@/types';
import PasswordChangeModal from '@/components/PasswordChangeModal';
import {
  LayoutDashboard,
  History,
  Coins,
  UserCircle2,
  FileText,
  LogOut,
  Menu,
  X
} from 'lucide-react';

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [member, setMember] = useState<Member | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadMember = async () => {
      if (user?.role === 'member') {
        const memberData = await db.getMemberByUserId(user.id);
        setMember(memberData || null);

        if (user.isFirstLogin) {
          setShowPasswordModal(true);
        }
      }
    };
    loadMember();
  }, [user]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'member')) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const navItems = [
    { name: 'Dashboard', href: '/member', icon: LayoutDashboard },
    { name: 'Transactions', href: '/member/transactions', icon: History },
    { name: 'Loan', href: '/member/apply-loan', icon: Coins },
    { name: 'Profile', href: '/member/profile', icon: UserCircle2 },
    { name: 'By-Laws', href: '/member/bylaws', icon: FileText },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'member') return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 glass border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex p-2 bg-primary rounded-xl shadow-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">OsuOlale</h1>
                <p className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                  Member Portal
                </p>
              </div>
            </div>

            {/* Desktop User Tools */}
            <div className="hidden sm:flex items-center gap-6">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-900">
                  {member?.firstName ? `${member.firstName} ${member.lastName}` : user.email.split('@')[0]}
                </span>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  {member?.memberNumber || 'Pending'}
                </span>
              </div>
              <div className="h-8 w-[1px] bg-slate-200"></div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-all"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>

            {/* Mobile Actions */}
            <div className="flex sm:hidden items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="rounded-xl"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-fadeIn" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="absolute top-16 left-4 right-4 bg-white rounded-2xl shadow-2xl p-4 space-y-2 border border-slate-200/60"
            onClick={e => e.stopPropagation()}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${pathname === item.href
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                    : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
            <div className="pt-4 mt-2 border-t border-slate-100 italic">
              <Button
                variant="ghost"
                className="w-full justify-start text-rose-600 hover:bg-rose-50 rounded-xl font-bold"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sub-Nav */}
      <nav className="hidden sm:block bg-white border-b border-slate-200/40 sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative py-4 px-4 text-sm font-bold transition-all group ${pathname === item.href
                    ? 'text-primary'
                    : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <item.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${pathname === item.href ? 'text-primary' : 'text-slate-400'}`} />
                  {item.name}
                </div>
                {pathname === item.href && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"></div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="animate-fadeIn">
          {children}
        </div>
      </main>

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => !user?.isFirstLogin && setShowPasswordModal(false)}
        onSuccess={() => setShowPasswordModal(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}
