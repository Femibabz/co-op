'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'super_admin')) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

      {/* Header - Glassmorphic */}
      <header className="sticky top-0 z-50 w-full border-b border-indigo-200/20 bg-indigo-700/80 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm border border-white/30 shadow-inner">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-extrabold text-white tracking-tight leading-none">Coopkonnect</h1>
                <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mt-0.5">Super Admin</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="hidden sm:inline-block text-xs font-bold text-white uppercase tracking-wider bg-white/10 px-3 py-1 rounded-full border border-white/20">Platform Executive</span>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="bg-white/10 text-white border-white/30 hover:bg-white/20 hover:text-white rounded-xl font-extrabold transition-all duration-300"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Navigation - Tabbed */}
      <nav className="bg-white/70 backdrop-blur-md border-b border-slate-200/60 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide py-2">
            {[
              { href: '/super-admin', label: 'Dashboard' },
              { href: '/super-admin/societies', label: 'Societies' },
              { href: '/super-admin/users', label: 'Users' },
              { href: '/super-admin/members', label: 'Members' },
              { href: '/super-admin/database-setup', label: 'Database Setup' },
              { href: '/super-admin/access-logs', label: 'Access Logs' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-xl py-2 px-4 text-xs font-bold transition-all duration-300 ${pathname === link.href
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8 animate-fadeIn">
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>
    </div>
  );
}
