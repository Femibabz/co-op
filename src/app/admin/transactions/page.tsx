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
  AlertCircle,
  Users,
  RefreshCw
} from 'lucide-react';
import { db } from '@/lib/mock-data';
import { Member, Transaction } from '@/types';

export default function AdminTransactionsPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<string>('12');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter Dropdown States
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const CATEGORIES = [
    { id: 'shares_deposit', label: 'Shares Deposit' },
    { id: 'savings_deposit', label: 'Savings Deposit' },
    { id: 'loan_disbursement', label: 'Loan Disbursement' },
    { id: 'loan_payment', label: 'Loan Payment' },
    { id: 'interest_charge', label: 'Interest Charge' },
    { id: 'interest_payment', label: 'Interest Payment' },
    { id: 'dues_charge', label: 'Society Levy' },
    { id: 'dues_payment', label: 'Dues Payment' },
  ];

  const loadData = async (showLoading = true) => {
    if (!user?.societyId) return;
    if (showLoading) setIsLoaded(false);
    
    try {
      const [allTransactions, allMembers] = await Promise.all([
        db.getTransactions(user.societyId),
        db.getMembers(user.societyId)
      ]);
      
      setTransactions(allTransactions);
      setFilteredTransactions(allTransactions);
      setMembers(allMembers);
      
      // Initialize filters with all options selected by default
      if (selectedMemberIds.length === 0) setSelectedMemberIds(allMembers.map(m => m.id));
      if (filterTypes.length === 0) setFilterTypes(CATEGORIES.map(c => c.id));
      
      setIsLoaded(true);
      setIsRefreshing(false);
    } catch (error) {
      console.error('Error loading admin transactions:', error);
      setIsLoaded(true);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Apply filters
  useEffect(() => {
    let filtered = [...transactions];

    // Filter by member
    if (selectedMemberIds.length > 0 && selectedMemberIds.length < members.length) {
      filtered = filtered.filter(t => selectedMemberIds.includes(t.memberId));
    } else if (selectedMemberIds.length === 0) {
      filtered = []; // None selected
    }

    // Filter by category
    if (filterTypes.length > 0 && filterTypes.length < CATEGORIES.length) {
      filtered = filtered.filter(t => filterTypes.includes(t.type));
    } else if (filterTypes.length === 0) {
      filtered = []; // None selected
    }

    // Filter by period
    if (filterPeriod === 'custom') {
      if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        filtered = filtered.filter(t => new Date(t.date) >= start);
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(t => new Date(t.date) <= end);
      }
    } else if (filterPeriod !== 'all') {
      const months = parseInt(filterPeriod);
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      filtered = filtered.filter(t => new Date(t.date) >= cutoff);
    }

    // Filter by keyword
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(t => {
        const member = members.find(m => m.id === t.memberId);
        const memberName = member ? `${member.firstName} ${member.lastName}`.toLowerCase() : '';
        const memberNum = member ? member.memberNumber.toLowerCase() : '';
        
        return (
          t.description.toLowerCase().includes(lowerSearch) ||
          (t.referenceNumber?.toLowerCase().includes(lowerSearch) || false) ||
          t.type.toLowerCase().includes(lowerSearch) ||
          memberName.includes(lowerSearch) ||
          memberNum.includes(lowerSearch)
        );
      });
    }

    setFilteredTransactions(filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, [transactions, searchTerm, filterTypes, selectedMemberIds, filterPeriod, customStartDate, customEndDate, members]);

  const toggleMemberId = (id: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const toggleCategoryId = (id: string) => {
    setFilterTypes(prev => 
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const selectAllMembers = () => setSelectedMemberIds(members.map(m => m.id));
  const deselectAllMembers = () => setSelectedMemberIds([]);
  
  const selectAllCategories = () => setFilterTypes(CATEGORIES.map(c => c.id));
  const deselectAllCategories = () => setFilterTypes([]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getTransactionLabel = (type: string) => {
    if (type === 'dues_charge') return 'Society Levy / Dues';
    if (type === 'dues_payment') return 'Dues Payment';
    return type.replace('_', ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  };

  const getTransactionInfo = (type: string) => {
    const isCredit = type.includes('deposit') || type.includes('disbursement') || type === 'dues_payment' || type === 'loan_payment' || type === 'interest_payment';
    const isDuesCharge = type === 'dues_charge' || type === 'interest_charge';
    const isMemberInflow = type.includes('deposit') || type.includes('disbursement');
    
    return {
      color: (isMemberInflow && !isDuesCharge) ? 'text-emerald-600' : 'text-rose-600',
      bgColor: (isMemberInflow && !isDuesCharge) ? 'bg-emerald-50' : 'bg-rose-50',
      icon: (isMemberInflow && !isDuesCharge) ? ArrowDownLeft : ArrowUpRight,
      prefix: (isMemberInflow && !isDuesCharge) ? '+' : '-'
    };
  };

  const downloadCSV = () => {
    if (!filteredTransactions.length) return;

    const headers = ['Date', 'Member Name', 'Member No', 'Type', 'Amount', 'Description', 'Reference', 'Processed By'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(t => {
        const m = members.find(mem => mem.id === t.memberId);
        return [
          new Date(t.date).toLocaleDateString(),
          m ? `"${m.firstName} ${m.lastName}"` : 'N/A',
          m ? m.memberNumber : 'N/A',
          t.type.replace('_', ' ').toUpperCase(),
          t.amount,
          `"${t.description}"`,
          t.referenceNumber || '',
          t.processedBy || 'System'
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `society_audit_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Audit Ledger</p>
      </div>
    );
  }

  const netInflow = filteredTransactions
    .filter(t => t.type.includes('deposit') || t.type.includes('payment'))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDisbursements = filteredTransactions
    .filter(t => t.type === 'loan_disbursement')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCharges = filteredTransactions
    .filter(t => t.type.includes('charge'))
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Financial Oversight</p>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Financial Transactions</h2>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => { setIsRefreshing(true); loadData(false); }}
            className={`rounded-xl h-11 w-11 transition-all ${isRefreshing ? 'animate-spin border-emerald-500 text-emerald-500' : ''}`}
            disabled={isRefreshing}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 h-11 px-6 rounded-xl shadow-lg shadow-emerald-600/20"
            onClick={downloadCSV}
            disabled={filteredTransactions.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download Audit Export
          </Button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="premium-card p-6 space-y-3 bg-white border-none shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Inflow</p>
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-600 leading-tight">{formatCurrency(netInflow)}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Deposits & Repayments</p>
          </div>
        </div>

        <div className="premium-card p-6 space-y-3 bg-white border-none shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-rose-50 rounded-lg">
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Outflow</p>
          </div>
          <div>
            <p className="text-2xl font-black text-rose-600 leading-tight">{formatCurrency(totalDisbursements)}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Loan Disbursements</p>
          </div>
        </div>

        <div className="premium-card p-6 space-y-3 bg-white border-none shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-amber-50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Passive Income</p>
          </div>
          <div>
            <p className="text-2xl font-black text-amber-600 leading-tight">{formatCurrency(totalCharges)}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Interests & Levies Charged</p>
          </div>
        </div>

        <div className="premium-card p-6 space-y-3 bg-white border-none shadow-sm border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Filter className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Filtered Volume</p>
          </div>
          <div>
            <p className="text-2xl font-black text-indigo-600 leading-tight">{filteredTransactions.length}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Transactions in view</p>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="premium-card p-4 md:p-6 bg-white border-none shadow-sm">
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 items-end">
          <div className="sm:col-span-2 lg:col-span-3 space-y-2">
            <Label htmlFor="search" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keyword Search</Label>
            <div className="relative group">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <Input
                id="search"
                placeholder="Search name, phone, ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 bg-slate-50 border-transparent focus:border-emerald-500/50 focus:bg-white transition-all rounded-xl font-medium"
              />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-2 relative">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Member Selection</Label>
            <div className="relative">
              <Button
                variant="outline"
                className="w-full h-12 bg-slate-50 border-transparent justify-between px-3 font-medium rounded-xl group hover:bg-white hover:border-emerald-500/30 transition-all"
                onClick={() => { setIsMemberDropdownOpen(!isMemberDropdownOpen); setIsCategoryDropdownOpen(false); }}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-slate-600">
                    {selectedMemberIds.length === members.length ? 'All Members' : 
                     selectedMemberIds.length === 0 ? 'None selected' : 
                     `${selectedMemberIds.length} Selected`}
                  </span>
                </div>
                <Users className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
              </Button>

              {isMemberDropdownOpen && (
                <div className="absolute top-14 left-0 w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-50">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Members</span>
                    <div className="flex gap-2">
                      <button onClick={selectAllMembers} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700">All</button>
                      <button onClick={deselectAllMembers} className="text-[10px] font-bold text-rose-600 hover:text-rose-700">None</button>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {members.map(m => (
                      <label key={m.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.includes(m.id)}
                          onChange={() => toggleMemberId(m.id)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{m.firstName} {m.lastName}</span>
                          <span className="text-[10px] font-medium text-slate-400">{m.memberNumber}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-full mt-3 h-8 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                    onClick={() => setIsMemberDropdownOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-2 relative">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category Filter</Label>
            <div className="relative">
              <Button
                variant="outline"
                className="w-full h-12 bg-slate-50 border-transparent justify-between px-3 font-medium rounded-xl group hover:bg-white hover:border-emerald-500/30 transition-all"
                onClick={() => { setIsCategoryDropdownOpen(!isCategoryDropdownOpen); setIsMemberDropdownOpen(false); }}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-slate-600">
                    {filterTypes.length === CATEGORIES.length ? 'All Categories' : 
                     filterTypes.length === 0 ? 'None selected' : 
                     `${filterTypes.length} Selected`}
                  </span>
                </div>
                <Filter className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
              </Button>

              {isCategoryDropdownOpen && (
                <div className="absolute top-14 left-0 w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-50">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Categories</span>
                    <div className="flex gap-2">
                      <button onClick={selectAllCategories} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700">All</button>
                      <button onClick={deselectAllCategories} className="text-[10px] font-bold text-rose-600 hover:text-rose-700">None</button>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {CATEGORIES.map(c => (
                      <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                        <input
                          type="checkbox"
                          checked={filterTypes.includes(c.id)}
                          onChange={() => toggleCategoryId(c.id)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors uppercase tracking-tight">{c.label}</span>
                      </label>
                    ))}
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-full mt-3 h-8 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                    onClick={() => setIsCategoryDropdownOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className={`space-y-2 transition-all duration-300 lg:col-span-2`}>
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">History Period</Label>
            <Select value={filterPeriod} onValueChange={(val) => { setFilterPeriod(val); setIsMemberDropdownOpen(false); setIsCategoryDropdownOpen(false); }}>
              <SelectTrigger className="h-12 bg-slate-50 border-transparent focus:border-emerald-500/50 focus:bg-white rounded-xl font-medium text-slate-900 shadow-none">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-2xl">
                <SelectItem value="1">Last 30 Days</SelectItem>
                <SelectItem value="3">Last 3 Months</SelectItem>
                <SelectItem value="6">Last 6 Months</SelectItem>
                <SelectItem value="12">Last 12 Months</SelectItem>
                <SelectItem value="24">Last 2 Years</SelectItem>
                <SelectItem value="all" className="font-bold">All Time</SelectItem>
                <SelectItem value="custom" className="font-bold text-emerald-600 border-t border-slate-50">📅 Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterPeriod === 'custom' && (
            <>
              <div className="lg:col-span-1.5 space-y-2 animate-in slide-in-from-left-2 duration-300">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From Date</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-12 bg-slate-50 border-transparent focus:border-emerald-500/50 focus:bg-white rounded-xl font-medium text-xs w-full"
                />
              </div>
              <div className="lg:col-span-1.5 space-y-2 animate-in slide-in-from-left-2 duration-300">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To Date</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-12 bg-slate-50 border-transparent focus:border-emerald-500/50 focus:bg-white rounded-xl font-medium text-xs w-full"
                />
              </div>
            </>
          )}

          <div className="lg:col-span-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { 
                setSearchTerm(''); 
                setFilterTypes(CATEGORIES.map(c => c.id)); 
                setSelectedMemberIds(members.map(m => m.id)); 
                setFilterPeriod('12');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="h-12 w-full rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-none"
              title="Clear All Filters"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="premium-card overflow-hidden bg-white border-none shadow-sm">
        {filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-5">Date & Member</TableHead>
                  <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Description</TableHead>
                  <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Category</TableHead>
                  <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">Amount</TableHead>
                  <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Reference</TableHead>
                  <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Processed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((t) => {
                  const m = members.find(mem => mem.id === t.memberId);
                  const info = getTransactionInfo(t.type);
                  return (
                    <TableRow key={t.id} className="group hover:bg-slate-50/30 transition-colors border-slate-100">
                      <TableCell className="py-5">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900 leading-none mb-1">
                            {new Date(t.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600 group-hover:text-emerald-700 transition-colors">
                            {m ? `${m.firstName} ${m.lastName}` : 'System'} ({m?.memberNumber || '---'})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-slate-700">
                          {t.description}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-white border-slate-200 text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg text-slate-500"
                        >
                          {getTransactionLabel(t.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className={`flex items-center justify-end font-black ${info.color}`}>
                          <span className="mr-1">{info.prefix}</span>
                          {formatCurrency(t.amount)}
                          <info.icon className="w-3.5 h-3.5 ml-2 opacity-40 shrink-0" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[11px] font-bold font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded">
                          {t.referenceNumber || '---'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200 shadow-sm">
                            {(t.processedBy || 'System').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-slate-600 truncate max-w-[100px]">
                            {t.processedBy || 'System Auto'}
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
            <div className="p-8 bg-slate-50 rounded-3xl ring-1 ring-slate-100 shadow-inner">
              <Users className="w-16 h-16 text-slate-300" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-2xl font-black text-slate-900">No Transactions found</h3>
              <p className="text-slate-500 font-bold text-sm leading-relaxed uppercase tracking-wider">
                We couldn't find any financial records matching your current filter set. Try broadening your search or range.
              </p>
            </div>
            {(searchTerm || filterTypes.length < CATEGORIES.length || selectedMemberIds.length < members.length || filterPeriod !== '12' || customStartDate || customEndDate) && (
              <Button
                variant="outline"
                className="h-12 px-8 rounded-xl font-black uppercase text-xs tracking-widest border-2 hover:bg-slate-50 transition-all active:scale-95"
                onClick={() => { 
                  setSearchTerm(''); 
                  setFilterTypes(CATEGORIES.map(c => c.id)); 
                  setSelectedMemberIds(members.map(m => m.id)); 
                  setFilterPeriod('12');
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
              >
                Reset All filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
