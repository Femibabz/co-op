'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download,
  Search,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Calendar,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { db } from '@/lib/mock-data';
import { Member, Transaction } from '@/types';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('12');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load member and transactions data
  useEffect(() => {
    const loadTransactions = async () => {
      if (user?.role === 'member') {
        try {
          const memberData = await db.getMemberByUserId(user.id);
          if (memberData) {
            setMember(memberData);
            const memberTransactions = await db.getTransactionsByMember(memberData.id, parseInt(filterPeriod));
            setTransactions(memberTransactions);
            setFilteredTransactions(memberTransactions);
          }
          setIsLoaded(true);
        } catch (error) {
          console.error('Error loading transactions:', error);
          setIsLoaded(true);
        }
      }
    };

    loadTransactions();
  }, [user, filterPeriod]);

  // Apply filters
  useEffect(() => {
    let filtered = [...transactions];

    if (filterType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, filterType]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getTransactionLabel = (type: string) => {
    return type.replace('_', ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  };

  const getTransactionInfo = (type: string) => {
    const isCredit = type.includes('deposit') || type.includes('disbursement');
    return {
      color: isCredit ? 'text-emerald-600' : 'text-rose-600',
      bgColor: isCredit ? 'bg-emerald-50' : 'bg-rose-50',
      icon: isCredit ? ArrowDownLeft : ArrowUpRight,
      prefix: isCredit ? '+' : '-'
    };
  };

  const downloadCSV = () => {
    if (!filteredTransactions.length) return;

    const headers = ['Date', 'Type', 'Amount', 'Description', 'Reference'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(transaction => [
        transaction.date.toLocaleDateString(),
        transaction.type.replace('_', ' ').toUpperCase(),
        transaction.amount,
        `"${transaction.description}"`,
        transaction.referenceNumber || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${member?.memberNumber || 'member'}_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Transactions</p>
      </div>
    );
  }

  const totalCredits = filteredTransactions
    .filter(t => t.type.includes('deposit') || t.type.includes('disbursement'))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = filteredTransactions
    .filter(t => !t.type.includes('deposit') && !t.type.includes('disbursement'))
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-bold text-primary uppercase tracking-widest">Financial Ledger</p>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Transactions</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="btn-premium flex items-center gap-2"
            onClick={downloadCSV}
            disabled={filteredTransactions.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="premium-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Filter className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Count</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{filteredTransactions.length}</p>
            <p className="text-xs text-slate-500 font-medium">Filtered results</p>
          </div>
        </div>

        <div className="premium-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credits</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-emerald-600">{formatCurrency(totalCredits)}</p>
            <p className="text-xs text-slate-500 font-medium font-bold">Total Inflow</p>
          </div>
        </div>

        <div className="premium-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-rose-50 rounded-lg">
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Debits</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-rose-600">{formatCurrency(totalDebits)}</p>
            <p className="text-xs text-slate-500 font-medium font-bold">Total Outflow</p>
          </div>
        </div>

        <div className="premium-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Range</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-indigo-600">{filterPeriod} Months</p>
            <p className="text-xs text-slate-500 font-medium">Selected Period</p>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="premium-card p-6">
        <div className="grid gap-6 md:grid-cols-12 items-end">
          <div className="md:col-span-5 space-y-2">
            <Label htmlFor="search" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Keyword Search</Label>
            <div className="relative group">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                id="search"
                placeholder="Search description, reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white transition-all rounded-xl"
              />
            </div>
          </div>

          <div className="md:col-span-3 space-y-2">
            <Label htmlFor="type-filter" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Transaction Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="shares_deposit">Shares Deposit</SelectItem>
                <SelectItem value="savings_deposit">Savings Deposit</SelectItem>
                <SelectItem value="loan_disbursement">Loan Disbursement</SelectItem>
                <SelectItem value="loan_payment">Loan Payment</SelectItem>
                <SelectItem value="interest_charge">Interest Charge</SelectItem>
                <SelectItem value="interest_payment">Interest Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3 space-y-2">
            <Label htmlFor="period-filter" className="text-xs font-bold text-slate-500 uppercase tracking-widest">History Depth</Label>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="1">Last 30 Days</SelectItem>
                <SelectItem value="3">Last 3 Months</SelectItem>
                <SelectItem value="6">Last 6 Months</SelectItem>
                <SelectItem value="12">Last 12 Months</SelectItem>
                <SelectItem value="24">Last 2 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setSearchTerm(''); setFilterType('all'); }}
              className="h-11 w-full rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors"
              title="Clear Filters"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="premium-card overflow-hidden">
        {filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[10px] py-4">Transaction Details</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Category</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[10px] text-right">Amount</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Reference</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Processed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => {
                  const info = getTransactionInfo(transaction.type);
                  return (
                    <TableRow key={transaction.id} className="group hover:bg-slate-50/30 transition-colors border-slate-100">
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                            {transaction.description}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {transaction.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-white border-slate-200 text-[10px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded-lg text-slate-600"
                        >
                          {getTransactionLabel(transaction.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`flex items-center justify-end font-extrabold ${info.color}`}>
                          <span className="mr-1">{info.prefix}</span>
                          {formatCurrency(transaction.amount)}
                          <info.icon className="w-3.5 h-3.5 ml-2 opacity-50" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-bold font-mono text-slate-400">
                          {transaction.referenceNumber || '---'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                            {transaction.processedBy?.charAt(0) || 'S'}
                          </div>
                          <span className="text-sm font-bold text-slate-600">
                            {transaction.processedBy || 'System Auto'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
            <div className="p-6 bg-slate-50 rounded-full">
              <AlertCircle className="w-12 h-12 text-slate-300" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-extrabold text-slate-900">No Transactions Found</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                {searchTerm || filterType !== 'all'
                  ? "We couldn't find any transactions matching your specific filter criteria."
                  : "Go ahead and initiate your first deposit or loan application to see your activity here!"}
              </p>
            </div>
            {(searchTerm || filterType !== 'all') && (
              <Button
                variant="outline"
                className="rounded-xl font-bold border-2"
                onClick={() => { setSearchTerm(''); setFilterType('all'); }}
              >
                Reset All Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
