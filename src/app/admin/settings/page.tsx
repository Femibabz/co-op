'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getSocietySettings, saveSocietySettings, SocietySettings } from '@/lib/society-settings';
import { formatNaira } from '@/lib/loan-utils';
import { db } from '@/lib/mock-data';
import { Member } from '@/types';
import {
    CheckCircle2, AlertCircle, Settings, Percent, TrendingUp, Users, Calendar,
    ShieldCheck, Megaphone, Receipt, UserX, UserMinus
} from 'lucide-react';

export default function SocietySettingsPage() {
    const [settings, setSettings] = useState<SocietySettings | null>(null);
    const [members, setMembers] = useState<Member[]>([]);

    // ── Core settings form ────────────────────────────────────────────────────
    const [form, setForm] = useState({
        societyName: '',
        loanInterestRate: '',
        penaltyAfterMonths: '',
        maxLoanMultiple: '',
        minMembershipMonthsForLoan: '',
        loanGuarantorCount: '',
        membershipGuarantorCount: '',
        maxActiveGuaranteesPerMember: '',
    });
    const [coreMessage, setCoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    // ── Levy form ─────────────────────────────────────────────────────────────
    const [levyTarget, setLevyTarget] = useState<'all' | 'select'>('all');
    const [levyMemberIds, setLevyMemberIds] = useState<string[]>([]);
    const [levyAmount, setLevyAmount] = useState('');
    const [levyDesc, setLevyDesc] = useState('');
    const [levyMsg, setLevyMsg] = useState('');
    const [isImposingLevy, setIsImposingLevy] = useState(false);

    // ── Broadcast form ────────────────────────────────────────────────────────
    const [broadcastSubject, setBroadcastSubject] = useState('');
    const [broadcastBody, setBroadcastBody] = useState('');
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

    // ── Member status form ───────────────────────────────────────────────────
    const [statusMemberId, setStatusMemberId] = useState('');
    const [statusAction, setStatusAction] = useState<'suspended' | 'inactive' | null>(null);
    const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const loadData = useCallback(async () => {
        const s = getSocietySettings();
        setSettings(s);
        setForm({
            societyName: s.societyName,
            loanInterestRate: String(s.loanInterestRate),
            penaltyAfterMonths: String(s.penaltyAfterMonths),
            maxLoanMultiple: String(s.maxLoanMultiple),
            minMembershipMonthsForLoan: String(s.minMembershipMonthsForLoan),
            loanGuarantorCount: String(s.loanGuarantorCount),
            membershipGuarantorCount: String(s.membershipGuarantorCount),
            maxActiveGuaranteesPerMember: String(s.maxActiveGuaranteesPerMember),
        });
        const allMembers = await db.getMembers();
        setMembers(allMembers);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleChange = (field: keyof typeof form, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
        setCoreMessage(null);
    };

    const handleSave = () => {
        const rate = parseFloat(form.loanInterestRate);
        const penalty = parseInt(form.penaltyAfterMonths, 10);
        const multiple = parseFloat(form.maxLoanMultiple);
        const minMonths = parseInt(form.minMembershipMonthsForLoan, 10);
        const loanG = parseInt(form.loanGuarantorCount, 10);
        const memberG = parseInt(form.membershipGuarantorCount, 10);
        const maxG = parseInt(form.maxActiveGuaranteesPerMember, 10);

        if (isNaN(rate) || rate <= 0 || rate > 20) { setCoreMessage({ type: 'error', text: 'Interest rate must be between 0.1% and 20%.' }); return; }
        if (isNaN(penalty) || penalty < 1) { setCoreMessage({ type: 'error', text: 'Penalty threshold must be at least 1 month.' }); return; }
        if (isNaN(multiple) || multiple < 1 || multiple > 10) { setCoreMessage({ type: 'error', text: 'Max loan multiple must be between 1× and 10×.' }); return; }
        if (isNaN(minMonths) || minMonths < 0) { setCoreMessage({ type: 'error', text: 'Minimum membership months cannot be negative.' }); return; }
        if (isNaN(loanG) || loanG < 1) { setCoreMessage({ type: 'error', text: 'Loan guarantor count must be at least 1.' }); return; }
        if (isNaN(memberG) || memberG < 1) { setCoreMessage({ type: 'error', text: 'Membership guarantor count must be at least 1.' }); return; }
        if (isNaN(maxG) || maxG < 1) { setCoreMessage({ type: 'error', text: 'Max active guarantees must be at least 1.' }); return; }

        const saved = saveSocietySettings({
            societyName: form.societyName.trim() || 'Osuolale Cooperative Society',
            loanInterestRate: rate,
            penaltyAfterMonths: penalty,
            maxLoanMultiple: multiple,
            minMembershipMonthsForLoan: minMonths,
            loanGuarantorCount: loanG,
            membershipGuarantorCount: memberG,
            maxActiveGuaranteesPerMember: maxG,
        });
        setSettings(saved);
        setIsDirty(false);
        setCoreMessage({ type: 'success', text: 'Settings saved successfully.' });
    };

    // ── Levy ─────────────────────────────────────────────────────────────────
    const handleImposelevy = async () => {
        const amount = parseFloat(levyAmount);
        if (!levyDesc.trim()) { setLevyMsg('Please provide a description.'); return; }
        if (isNaN(amount) || amount <= 0) { setLevyMsg('Please enter a valid amount.'); return; }
        if (levyTarget === 'select' && levyMemberIds.length === 0) { setLevyMsg('Please select at least one member.'); return; }

        setIsImposingLevy(true);
        setLevyMsg('');
        try {
            const targetIds = levyTarget === 'all' ? members.map(m => m.id) : levyMemberIds;
            db.createLevy({ description: levyDesc, amount, imposedBy: 'admin', memberIds: targetIds, targetAll: levyTarget === 'all' });
            // Add to each member's societyDues
            await Promise.all(targetIds.map(id => {
                const member = members.find(m => m.id === id);
                if (member) return db.updateMember(id, { societyDues: member.societyDues + amount });
            }));
            setLevyMsg(`✓ Levy of ${formatNaira(amount)} imposed on ${targetIds.length} member(s).`);
            setLevyAmount(''); setLevyDesc(''); setLevyMemberIds([]);
            loadData();
        } catch { setLevyMsg('Failed to impose levy.'); }
        finally { setIsImposingLevy(false); }
    };

    const toggleLevyMember = (id: string) => {
        setLevyMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // ── Broadcast ────────────────────────────────────────────────────────────
    const handleSendBroadcast = async () => {
        if (!broadcastSubject.trim() || !broadcastBody.trim()) { setBroadcastMsg('Subject and message body are required.'); return; }
        setIsSendingBroadcast(true);
        setBroadcastMsg('');
        try {
            db.createBroadcastMessage({ subject: broadcastSubject, body: broadcastBody, sentBy: 'admin' });
            setBroadcastMsg(`✓ Message sent to all ${members.length} members.`);
            setBroadcastSubject(''); setBroadcastBody('');
        } catch { setBroadcastMsg('Failed to send message.'); }
        finally { setIsSendingBroadcast(false); }
    };

    // ── Member status ─────────────────────────────────────────────────────────
    const selectedMember = members.find(m => m.id === statusMemberId) || null;
    const canChangeStatus = selectedMember
        ? selectedMember.loanBalance === 0 && selectedMember.interestBalance === 0 && selectedMember.societyDues === 0
        : false;

    const handleStatusConfirm = async () => {
        if (!selectedMember || !statusAction) return;
        setIsUpdatingStatus(true);
        try {
            await db.updateMemberStatus(selectedMember.id, statusAction);
            const label = statusAction === 'suspended' ? 'suspended' : 'membership ended';
            setStatusMsg(`✓ ${selectedMember.firstName} ${selectedMember.lastName} has been ${label}.`);
            setIsStatusDialogOpen(false); setStatusMemberId(''); setStatusAction(null);
            loadData();
        } catch { setStatusMsg('Failed to update member status.'); }
        finally { setIsUpdatingStatus(false); }
    };

    if (!settings) return <p className="text-muted-foreground p-8">Loading settings...</p>;

    const exampleLoan = 200000;
    const exampleRate = parseFloat(form.loanInterestRate) || settings.loanInterestRate;
    const exampleInterest = Math.round((exampleLoan * exampleRate) / 100);

    return (
        <div className="space-y-8 max-w-3xl">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Society Settings</h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    Configure financial policies, guarantor requirements, levies, and member management.
                </p>
            </div>

            {coreMessage && (
                <Alert variant={coreMessage.type === 'error' ? 'destructive' : 'default'}>
                    {coreMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <AlertDescription>{coreMessage.text}</AlertDescription>
                </Alert>
            )}

            {/* ── Interest Rate ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5 text-emerald-600" /> Loan Interest Rate</CardTitle>
                    <CardDescription>Set the monthly interest rate applied to all <strong>new</strong> loans.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="loanInterestRate">Monthly Interest Rate (%)</Label>
                            <div className="flex items-center gap-2">
                                <Input id="loanInterestRate" type="number" min="0.1" max="20" step="0.1"
                                    value={form.loanInterestRate} onChange={e => handleChange('loanInterestRate', e.target.value)} className="flex-1" />
                                <Badge variant="secondary" className="text-base px-3 py-1 shrink-0">{form.loanInterestRate || '?'}% / mo</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">e.g. 1.5 = 1.5% per month on outstanding principal</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="penaltyAfterMonths">Penalty Rate After (months)</Label>
                            <Input id="penaltyAfterMonths" type="number" min="1" max="120" step="1"
                                value={form.penaltyAfterMonths} onChange={e => handleChange('penaltyAfterMonths', e.target.value)} />
                            <p className="text-xs text-muted-foreground">Rate doubles if loan is unpaid after this many months</p>
                        </div>
                    </div>
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                        <p className="text-sm font-semibold text-emerald-900">📊 Interest Preview</p>
                        <p className="text-sm text-emerald-800">For a {formatNaira(exampleLoan)} loan at <strong>{exampleRate}%/month</strong>:</p>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <div className="bg-white rounded-lg p-3 border border-emerald-200">
                                <p className="text-xs text-emerald-600 font-medium">Month 1 Interest</p>
                                <p className="text-lg font-bold text-emerald-900">{formatNaira(exampleInterest)}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-emerald-200">
                                <p className="text-xs text-emerald-600 font-medium">Penalty Rate</p>
                                <p className="text-lg font-bold text-emerald-900">{formatNaira(exampleInterest * 2)}<span className="text-xs font-normal text-emerald-600 ml-1">after {form.penaltyAfterMonths} mo</span></p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Loan Eligibility ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-600" /> Loan Eligibility Rules</CardTitle>
                    <CardDescription>Maximum loan amount and tenure requirements.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="maxLoanMultiple">Max Loan Multiple (×)</Label>
                            <Input id="maxLoanMultiple" type="number" min="1" max="10" step="0.5"
                                value={form.maxLoanMultiple} onChange={e => handleChange('maxLoanMultiple', e.target.value)} />
                            <p className="text-xs text-muted-foreground">Member can borrow up to <strong>{form.maxLoanMultiple}×</strong> of (shares + savings)</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="minMembershipMonthsForLoan" className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Min Membership Months</Label>
                            <Input id="minMembershipMonthsForLoan" type="number" min="0" max="60" step="1"
                                value={form.minMembershipMonthsForLoan} onChange={e => handleChange('minMembershipMonthsForLoan', e.target.value)} />
                            <p className="text-xs text-muted-foreground">Member must be active for at least this many months to be eligible</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Guarantor Requirements ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-violet-600" /> Guarantor Requirements</CardTitle>
                    <CardDescription>Configure how many guarantors are needed and how many a single member can cover simultaneously.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="loanGuarantorCount">Guarantors for Loan Application</Label>
                            <Input id="loanGuarantorCount" type="number" min="1" max="5" step="1"
                                value={form.loanGuarantorCount} onChange={e => handleChange('loanGuarantorCount', e.target.value)} />
                            <p className="text-xs text-muted-foreground">Required before admin can approve a loan</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="membershipGuarantorCount">Guarantors for Membership Application</Label>
                            <Input id="membershipGuarantorCount" type="number" min="1" max="5" step="1"
                                value={form.membershipGuarantorCount} onChange={e => handleChange('membershipGuarantorCount', e.target.value)} />
                            <p className="text-xs text-muted-foreground">Required before admin can approve a new member</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maxActiveGuaranteesPerMember">Max Active Guarantees Per Member</Label>
                            <Input id="maxActiveGuaranteesPerMember" type="number" min="1" max="10" step="1"
                                value={form.maxActiveGuaranteesPerMember} onChange={e => handleChange('maxActiveGuaranteesPerMember', e.target.value)} />
                            <p className="text-xs text-muted-foreground">A member cannot guarantee more than this many loans at once</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Society Name ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-violet-600" /> Society Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="societyName">Society Name</Label>
                        <Input id="societyName" value={form.societyName}
                            onChange={e => handleChange('societyName', e.target.value)}
                            placeholder="Osuolale Cooperative Society" />
                    </div>
                </CardContent>
            </Card>

            {/* ── Important Note ── */}
            <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-4">
                    <div className="flex gap-3 items-start">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800 space-y-1">
                            <p className="font-semibold">Important: Settings apply to new loans only</p>
                            <p>Changing the interest rate does <strong>not</strong> affect existing loans. Each loan is locked in at the rate active on disbursement day.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={!isDirty} size="lg" className="gap-2">
                    <Settings className="h-4 w-4" /> Save Settings
                </Button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: LEVY / DUES
      ══════════════════════════════════════════════════════════════════════════ */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-orange-600" /> Impose Levy / Dues</CardTitle>
                    <CardDescription>Charge a levy to all members or specific members. It will be added to their outstanding dues balance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {levyMsg && (
                        <Alert variant={levyMsg.startsWith('✓') ? 'default' : 'destructive'}>
                            <AlertDescription>{levyMsg}</AlertDescription>
                        </Alert>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Target</Label>
                            <Select value={levyTarget} onValueChange={(v) => { setLevyTarget(v as 'all' | 'select'); setLevyMemberIds([]); }}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Members ({members.filter(m => m.status === 'active').length} active)</SelectItem>
                                    <SelectItem value="select">Select Specific Members</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="levyAmount">Amount (NGN)</Label>
                            <Input id="levyAmount" type="number" min="1" placeholder="e.g. 5000"
                                value={levyAmount} onChange={e => setLevyAmount(e.target.value)} />
                        </div>
                    </div>

                    {levyTarget === 'select' && (
                        <div className="space-y-2">
                            <Label>Select Members</Label>
                            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                                {members.filter(m => m.status === 'active').map(m => (
                                    <label key={m.id} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-slate-50">
                                        <input type="checkbox" checked={levyMemberIds.includes(m.id)} onChange={() => toggleLevyMember(m.id)} className="accent-primary" />
                                        <span className="text-sm">{m.memberNumber} — {m.firstName} {m.lastName}</span>
                                        <span className="ml-auto text-xs text-slate-400">Dues: {formatNaira(m.societyDues)}</span>
                                    </label>
                                ))}
                            </div>
                            {levyMemberIds.length > 0 && <p className="text-xs text-muted-foreground">{levyMemberIds.length} member(s) selected</p>}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="levyDesc">Description *</Label>
                        <Input id="levyDesc" placeholder="e.g. Annual development levy, Emergency dues"
                            value={levyDesc} onChange={e => setLevyDesc(e.target.value)} />
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleImposelevy} disabled={isImposingLevy} variant="default" className="gap-2">
                            <Receipt className="h-4 w-4" /> {isImposingLevy ? 'Imposing...' : 'Impose Levy'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: BROADCAST MESSAGE
      ══════════════════════════════════════════════════════════════════════════ */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-sky-600" /> Broadcast Message</CardTitle>
                    <CardDescription>Send a message that all members will see on their dashboard until they dismiss it.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {broadcastMsg && (
                        <Alert variant={broadcastMsg.startsWith('✓') ? 'default' : 'destructive'}>
                            <AlertDescription>{broadcastMsg}</AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="broadcastSubject">Subject</Label>
                        <Input id="broadcastSubject" placeholder="e.g. Monthly meeting reminder"
                            value={broadcastSubject} onChange={e => setBroadcastSubject(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="broadcastBody">Message</Label>
                        <Textarea id="broadcastBody" placeholder="Write your message to all members..." rows={4}
                            value={broadcastBody} onChange={e => setBroadcastBody(e.target.value)} />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleSendBroadcast} disabled={isSendingBroadcast} className="gap-2">
                            <Megaphone className="h-4 w-4" /> {isSendingBroadcast ? 'Sending...' : `Send to All Members`}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: MEMBER STATUS MANAGEMENT
      ══════════════════════════════════════════════════════════════════════════ */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserX className="h-5 w-5 text-red-600" /> Member Status Management</CardTitle>
                    <CardDescription>
                        Suspend or terminate a member's membership. Only allowed if the member has <strong>no outstanding loan, interest, or dues</strong>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {statusMsg && (
                        <Alert variant={statusMsg.startsWith('✓') ? 'default' : 'destructive'}>
                            <AlertDescription>{statusMsg}</AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-2">
                        <Label>Select Member</Label>
                        <Select value={statusMemberId} onValueChange={v => { setStatusMemberId(v); setStatusMsg(''); }}>
                            <SelectTrigger><SelectValue placeholder="Choose a member..." /></SelectTrigger>
                            <SelectContent>
                                {members.filter(m => m.status !== 'inactive').map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.memberNumber} — {m.firstName} {m.lastName}
                                        {m.status === 'suspended' ? ' (suspended)' : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedMember && (
                        <div className="rounded-xl border p-4 space-y-3">
                            <p className="text-sm font-semibold text-slate-700">{selectedMember.firstName} {selectedMember.lastName} — {selectedMember.memberNumber}</p>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                {[
                                    { label: 'Loan Balance', value: selectedMember.loanBalance, bad: selectedMember.loanBalance > 0 },
                                    { label: 'Interest Due', value: selectedMember.interestBalance, bad: selectedMember.interestBalance > 0 },
                                    { label: 'Dues Owed', value: selectedMember.societyDues, bad: selectedMember.societyDues > 0 },
                                ].map(item => (
                                    <div key={item.label} className={`rounded-lg p-3 border ${item.bad ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                        <p className="text-xs font-medium text-slate-500">{item.label}</p>
                                        <p className={`font-bold ${item.bad ? 'text-red-700' : 'text-green-700'}`}>{formatNaira(item.value)}</p>
                                    </div>
                                ))}
                            </div>
                            {!canChangeStatus && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>Member has outstanding balances. All balances must be cleared before status can be changed.</AlertDescription>
                                </Alert>
                            )}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 mt-4">
                                <Button
                                    variant={selectedMember.allowNewLoanWithBalance ? "default" : "outline"}
                                    onClick={async () => {
                                        try {
                                            const updated = await db.updateMember(selectedMember.id, {
                                                allowNewLoanWithBalance: !selectedMember.allowNewLoanWithBalance
                                            });
                                            if (updated) {
                                                setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
                                                setStatusMsg(`✓ Loan exception ${!selectedMember.allowNewLoanWithBalance ? 'granted' : 'revoked'} for ${selectedMember.firstName}`);
                                            }
                                        } catch (err) {
                                            setStatusMsg('Failed to update loan exception status.');
                                        }
                                    }}
                                    className={`gap-2 ${selectedMember.allowNewLoanWithBalance ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'}`}
                                >
                                    <ShieldCheck className="h-4 w-4" />
                                    {selectedMember.allowNewLoanWithBalance ? 'Revoke Loan Exception' : 'Allow New Loan Application'}
                                </Button>
                                <Button
                                    variant="outline"
                                    disabled={!canChangeStatus || selectedMember.status === 'suspended'}
                                    onClick={() => { setStatusAction('suspended'); setIsStatusDialogOpen(true); }}
                                    className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                                >
                                    <UserMinus className="h-4 w-4" /> Suspend Member
                                </Button>
                                <Button
                                    variant="destructive"
                                    disabled={!canChangeStatus}
                                    onClick={() => { setStatusAction('inactive'); setIsStatusDialogOpen(true); }}
                                    className="gap-2"
                                >
                                    <UserX className="h-4 w-4" /> End Membership
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Confirmation Dialog for Status Change */}
            <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{statusAction === 'suspended' ? 'Suspend Member' : 'End Membership'}</DialogTitle>
                        <DialogDescription>
                            {statusAction === 'suspended'
                                ? 'This will temporarily suspend the member. They will not be able to log in or access society services.'
                                : 'This will permanently end the member\'s membership. This action cannot be easily undone.'}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedMember && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-slate-50 border">
                                <p className="font-semibold">{selectedMember.firstName} {selectedMember.lastName}</p>
                                <p className="text-sm text-slate-500">{selectedMember.memberNumber} · {selectedMember.email}</p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)} disabled={isUpdatingStatus}>Cancel</Button>
                                <Button
                                    variant={statusAction === 'inactive' ? 'destructive' : 'default'}
                                    onClick={handleStatusConfirm}
                                    disabled={isUpdatingStatus}
                                    className={statusAction === 'suspended' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                                >
                                    {isUpdatingStatus ? 'Updating...' : (statusAction === 'suspended' ? 'Confirm Suspension' : 'Confirm End Membership')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
