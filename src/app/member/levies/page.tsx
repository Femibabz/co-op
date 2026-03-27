'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { db } from '@/lib/mock-data';
import { Member, Levy } from '@/types';
import { 
  Receipt, 
  ArrowLeft, 
  CircleDollarSign,
  Info,
  Calendar,
  UserCheck
} from 'lucide-react';

export default function LevyHistoryPage() {
  const { user } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [levies, setLevies] = useState<Levy[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadLevies = async () => {
      if (user?.role === 'member') {
        try {
          const memberData = await db.getMemberByUserId(user.id);
          if (memberData) {
            setMember(memberData);
            const memberLevies = await db.getLeviesByMember(memberData.id);
            setLevies(memberLevies);
          }
          setIsLoaded(true);
        } catch (error) {
          console.error('Error loading levies:', error);
          setIsLoaded(true);
        }
      }
    };

    loadLevies();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Dues History</p>
      </div>
    );
  }

  const totalLevied = levies.reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <Link 
            href="/member" 
            className="group flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest hover:translate-x-[-4px] transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Levies History</h2>
          <p className="text-slate-500 font-medium">Detailed breakdown of all dues and levies imposed by the administration.</p>
        </div>
        <div className="shrink-0">
          <Button className="btn-premium" asChild>
            <Link href="/member/transactions?type=dues_charge">
              View Detailed Ledger
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="premium-card p-6 bg-slate-900 text-white border-none shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-white/10 rounded-lg">
                <Receipt className="w-5 h-5 text-emerald-400" />
              </div>
              <Badge variant="outline" className="border-emerald-400/30 text-emerald-400 text-[10px] uppercase font-black tracking-widest">
                Life-time Total
              </Badge>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Levies Imposed</p>
              <h3 className="text-3xl font-black mt-1">{formatCurrency(totalLevied)}</h3>
            </div>
          </div>
        </Card>

        <Card className="premium-card p-6 border-amber-100 bg-amber-50/30 shadow-md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-amber-100 rounded-lg">
                <CircleDollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <Badge variant="outline" className="border-amber-200 text-amber-600 text-[10px] uppercase font-black tracking-widest bg-white">
                Outstanding
              </Badge>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Current Dues Balance</p>
              <h3 className="text-3xl font-black text-amber-600 mt-1">{formatCurrency(member?.societyDues || 0)}</h3>
            </div>
          </div>
        </Card>

        <Card className="premium-card p-6 border-slate-100 bg-white shadow-md lg:hidden xl:block">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-slate-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-slate-600" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Member ID</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{member?.memberNumber}</h3>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tight">{member?.firstName} {member?.lastName}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Breakdown Table */}
      <Card className="premium-card overflow-hidden border-slate-100 shadow-xl">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            Origin of Charges
          </CardTitle>
          <CardDescription>
            This breakdown explains the composition of your dues. Payments are applied to the total outstanding balance.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {levies.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="font-black text-slate-500 uppercase tracking-widest text-[10px] py-4 pl-6">Description</TableHead>
                    <TableHead className="font-black text-slate-500 uppercase tracking-widest text-[10px]">Date Imposed</TableHead>
                    <TableHead className="font-black text-slate-500 uppercase tracking-widest text-[10px] text-right pr-6">Initial Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {levies.map((levy) => (
                    <TableRow key={levy.id} className="group hover:bg-slate-50/30 transition-all border-slate-100">
                      <TableCell className="py-5 pl-6">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-800 text-base leading-tight group-hover:text-primary transition-colors">
                            {levy.description}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] font-black tracking-tighter uppercase px-1.5 py-0 rounded-md border-slate-200 text-slate-400">
                              REF: {levy.id.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-500 mt-1">
                          <Calendar className="w-3.5 h-3.5 opacity-40 text-primary" />
                          <span className="text-xs font-bold leading-none">
                            {levy.imposedAt.toLocaleDateString(undefined, { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <span className="text-lg font-black text-slate-900 group-hover:text-primary transition-colors">
                          {formatCurrency(levy.amount)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="p-4 bg-slate-50 rounded-full">
                <Receipt className="w-10 h-10 text-slate-200" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-900">No Levies Found</p>
                <p className="text-sm text-slate-500">You don't have any specific levies or dues recorded yet.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-start gap-4">
        <Info className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm font-bold text-blue-900 uppercase tracking-tight">Understanding your balance</p>
          <p className="text-xs text-blue-700 font-medium leading-relaxed">
            The balance shown on your dashboard is the sum of all levies above minus all "Dues Payments" you have made. 
            Payments are applied to the oldest outstanding dues first. For a full record of payments, please visit the 
            <Link href="/member/transactions" className="text-primary font-bold ml-1 hover:underline">Transaction History</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
