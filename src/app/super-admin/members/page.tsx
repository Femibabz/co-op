'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/mock-data';
import { Member } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, Users, ShieldCheck } from 'lucide-react';

export default function SuperAdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const allMembers = await db.getMembers();
      setMembers(allMembers);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLoanEligibilityOverride = async (memberId: string, currentValue: boolean) => {
    try {
      const updated = await db.updateMember(memberId, {
        loanEligibilityOverride: !currentValue
      });

      if (updated) {
        setMembers(members.map(m => m.id === memberId ? updated : m));
        setMessage({
          type: 'success',
          text: `Loan eligibility override ${!currentValue ? 'enabled' : 'disabled'} for member`
        });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to update member'
      });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const getMembershipDuration = (dateJoined: Date) => {
    const months = Math.floor((new Date().getTime() - new Date(dateJoined).getTime()) / (1000 * 60 * 60 * 24 * 30));
    return months;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

      <div className="space-y-1">
        <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Platform Governance</p>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">System Member Registry</h1>
        <p className="text-slate-500 font-medium">Global member management and eligibility overrides</p>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="rounded-2xl border-2 shadow-sm animate-fadeIn">
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600" />
          )}
          <AlertDescription className="font-bold">{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="premium-card overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Loan Eligibility Overrides</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Bypass standard 6-month cooling period</p>
          </div>
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 uppercase text-[10px] font-black tracking-widest px-3 py-1">Critical Access</Badge>
        </div>
        <div className="p-0">
          <div className="divide-y divide-slate-100">
            {members.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 italic">
                <Users className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-medium text-sm">No member identities registered</p>
              </div>
            ) : (
              members.map((member) => {
                const monthsAsMember = getMembershipDuration(member.dateJoined);
                const meetsRequirement = monthsAsMember >= 6;
                const hasOverride = member.loanEligibilityOverride === true;

                return (
                  <div
                    key={member.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-8 gap-6 hover:bg-slate-50/50 transition-colors group"
                  >
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-sm shadow-lg group-hover:scale-110 transition-transform duration-300">
                          {member.firstName[0]}{member.lastName[0]}
                        </div>
                        <div>
                          <p className="text-lg font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider tabular-nums">{member.memberNumber} • {member.email}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-4">
                            <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border-2">
                              {member.status}
                            </Badge>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-lg border border-slate-200">
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest tabular-nums italic">Joined: {monthsAsMember} months ago</span>
                            </div>
                            {meetsRequirement ? (
                              <Badge className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 border-emerald-200">
                                ✓ Qualified
                              </Badge>
                            ) : (
                              <Badge className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 border-amber-200">
                                Pending {6 - monthsAsMember}mo
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm min-w-[240px]">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {hasOverride && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>}
                          <p className={`text-[10px] font-black uppercase tracking-widest ${hasOverride ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {hasOverride ? 'Override Locked' : 'Standard Rules'}
                          </p>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 leading-tight">Bypasses membership age requirement</p>
                      </div>
                      <div className="flex items-center">
                        <Switch
                          id={`override-${member.id}`}
                          checked={hasOverride}
                          onCheckedChange={() => toggleLoanEligibilityOverride(member.id, hasOverride)}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="premium-card p-8 bg-indigo-900 text-white border-transparent relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <ShieldCheck className="w-40 h-40" />
        </div>
        <div className="relative z-10 space-y-4 max-w-2xl">
          <h3 className="text-xl font-extrabold tracking-tight">Protocol Documentation</h3>
          <div className="grid gap-4 text-xs font-bold uppercase tracking-widest text-indigo-200">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
              <p><span className="text-white">Standard Requirement:</span> Minimum 6 months of active membership required for loan issuance.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
              <p><span className="text-white">Override Effect:</span> Grants immediate eligibility, bypassing historical age verification.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
              <p><span className="text-white">Authority Note:</span> Overrides are recorded in the security audit log for compliance tracking.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
