'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlusCircle, ShieldAlert, UserPlus, Building2, Phone, Mail, MapPin, Hash, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/mock-data';
import { Society, Member, User } from '@/types';

export default function SocietiesPage() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Modal States
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedSociety, setSelectedSociety] = useState<Society | null>(null);

  // Form States
  const [newSoc, setNewSoc] = useState({ name: '', reg: '', addr: '', phone: '', email: '', adminEmail: '' });
  const [newMem, setNewMem] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    const socs = await db.getAllSocieties();
    const allUsers = await db.getAllUsers();
    setSocieties(socs);
    setUsers(allUsers);
    setIsRefreshing(false);
  };

  const handleRegisterSociety = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.createSociety({
        name: newSoc.name,
        registrationNumber: newSoc.reg,
        address: newSoc.addr,
        phone: newSoc.phone,
        email: newSoc.email
      }, newSoc.adminEmail);

      setStatusMsg({ type: 'success', text: `Successfully registered ${newSoc.name}` });
      setIsRegisterOpen(false);
      setNewSoc({ name: '', reg: '', addr: '', phone: '', email: '', adminEmail: '' });
      refreshData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to create society.' });
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSociety) return;

    try {
      await db.createMemberWithUser({
        societyId: selectedSociety.id,
        firstName: newMem.firstName,
        lastName: newMem.lastName,
        email: newMem.email,
        phone: newMem.phone,
        address: 'N/A', // Default
        sharesBalance: 0,
        savingsBalance: 0
      });

      setStatusMsg({ type: 'success', text: `Added ${newMem.firstName} to ${selectedSociety.name}. Password set to: member123` });
      setIsAddMemberOpen(false);
      setNewMem({ firstName: '', lastName: '', email: '', phone: '' });
      refreshData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to add member.' });
    }
  };

  const toggleStatus = async (society: Society) => {
    const newStatus = society.status === 'suspended' ? 'active' : 'suspended';
    try {
      await db.updateSocietyStatus(society.id, newStatus);
      setStatusMsg({ type: 'success', text: `${society.name} is now ${newStatus}` });
      refreshData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to update status.' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Societies Management
          </h2>
          <p className="text-muted-foreground font-medium">Register, monitor, and regulate cooperative societies</p>
        </div>

        <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
          <DialogTrigger asChild>
            <Button className="btn-premium gap-2 h-11 px-6 shadow-lg shadow-primary/20">
              <PlusCircle className="w-5 h-5" />
              Register New Society
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" />
                Register Cooperative
              </DialogTitle>
              <DialogDescription className="font-medium text-slate-500">
                Setup a new society and its primary administrator account.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRegisterSociety} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-bold">Society Name</Label>
                  <Input id="name" required value={newSoc.name} onChange={e => setNewSoc({ ...newSoc, name: e.target.value })} placeholder="e.g. Coopkonnect Coop" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg" className="font-bold">Reg. Number</Label>
                  <Input id="reg" required value={newSoc.reg} onChange={e => setNewSoc({ ...newSoc, reg: e.target.value })} placeholder="COOP-2024-X" />
                </div>
              </div>
              <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-2">
                  <Label htmlFor="admin" className="font-bold text-indigo-700 flex items-center gap-1">
                    <Mail className="w-4 h-4" /> Admin Login Email <Badge variant="outline" className="text-[10px] py-0 border-indigo-200 text-indigo-600">REQUIRED</Badge>
                  </Label>
                  <Input id="admin" type="email" required value={newSoc.adminEmail} onChange={e => setNewSoc({ ...newSoc, adminEmail: e.target.value })} placeholder="admin@society.com" className="bg-white" />
                  <p className="text-[10px] text-slate-500 italic">This is the email the society admin will use to SIGN IN. Default password: admin123</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="font-bold">Official Phone</Label>
                    <Input id="phone" value={newSoc.phone} onChange={e => setNewSoc({ ...newSoc, phone: e.target.value })} placeholder="+234..." className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-bold">Official Email</Label>
                    <Input id="email" type="email" required value={newSoc.email} onChange={e => setNewSoc({ ...newSoc, email: e.target.value })} placeholder="info@society.com" className="bg-white" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 italic">The "Official Email" will be displayed in the societies table and on reports.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr" className="font-bold">Physical Address</Label>
                <Input id="addr" value={newSoc.addr} onChange={e => setNewSoc({ ...newSoc, addr: e.target.value })} placeholder="123 Street Name, City" />
              </div>
              <DialogFooter className="pt-4 border-t">
                <Button type="submit" className="w-full h-11 btn-premium">Launch Society</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {statusMsg && (
        <Alert className={`animate-in fade-in slide-in-from-top-4 border-2 ${statusMsg.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-900' : 'border-rose-100 bg-rose-50 text-rose-900'}`}>
          <div className="flex items-center gap-3">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <ShieldAlert className="w-5 h-5 text-rose-600" />}
            <AlertDescription className="font-bold">{statusMsg.text}</AlertDescription>
          </div>
        </Alert>
      )}

      <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b pb-6">
          <CardTitle className="text-xl flex items-center gap-2">
            <Hash className="w-5 h-5 text-slate-400" />
            Active Registered Societies
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="font-bold text-slate-600 pl-6">Society Detail</TableHead>
                <TableHead className="font-bold text-slate-600">Administrator</TableHead>
                <TableHead className="font-bold text-slate-600">Assets Info</TableHead>
                <TableHead className="font-bold text-slate-600">Status</TableHead>
                <TableHead className="font-bold text-slate-600 pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {societies.map((society) => {
                const adminUser = users.find(u => u.id === society.adminUserId);
                return (
                  <TableRow key={society.id} className="group transition-colors hover:bg-slate-50/80">
                    <TableCell className="pl-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900 text-base">{society.name}</span>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                            <Hash className="w-3 h-3" /> {society.registrationNumber}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {society.address}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-extrabold text-indigo-700 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {adminUser?.email || 'N/A'}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[9px] font-bold text-slate-400 border-slate-200 uppercase px-1 py-0">
                            P: admin123
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-primary/5 text-primary text-[10px] font-bold py-0 h-5">
                            {society.memberCount} Members
                          </Badge>
                        </div>
                        <span className="text-sm font-extrabold text-slate-700">
                          {formatCurrency(society.totalSavings + society.totalShares)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`h-6 px-3 rounded-full font-bold shadow-sm ${society.status === 'active'
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : 'bg-rose-500 hover:bg-rose-600'
                        }`}>
                        {society.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-4 rounded-xl font-bold gap-2 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                          onClick={() => {
                            setSelectedSociety(society);
                            setIsAddMemberOpen(true);
                          }}
                        >
                          <UserPlus className="w-4 h-4" />
                          Add Member
                        </Button>

                        <Button
                          variant={society.status === 'active' ? 'destructive' : 'default'}
                          size="sm"
                          className={`h-9 px-4 rounded-xl font-bold gap-2 shadow-sm transition-all ${society.status === 'active'
                            ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                            }`}
                          onClick={() => toggleStatus(society)}
                        >
                          {society.status === 'active' ? (
                            <>
                              <ShieldAlert className="w-4 h-4" />
                              Suspend
                            </>
                          ) : (
                            <>
                              <Building2 className="w-4 h-4" />
                              Activate
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-indigo-600" />
              Onboard Member
            </DialogTitle>
            <DialogDescription className="font-medium">
              Enroll a new member into <strong>{selectedSociety?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fname" className="font-bold">First Name</Label>
                <Input id="fname" required value={newMem.firstName} onChange={e => setNewMem({ ...newMem, firstName: e.target.value })} placeholder="John" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lname" className="font-bold">Last Name</Label>
                <Input id="lname" required value={newMem.lastName} onChange={e => setNewMem({ ...newMem, lastName: e.target.value })} placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="memail" className="font-bold">Email Address</Label>
              <Input id="memail" type="email" required value={newMem.email} onChange={e => setNewMem({ ...newMem, email: e.target.value })} placeholder="john.doe@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mphone" className="font-bold">Phone Number</Label>
              <Input id="mphone" required value={newMem.phone} onChange={e => setNewMem({ ...newMem, phone: e.target.value })} placeholder="+234..." />
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-900">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-extrabold uppercase tracking-tight">Standard Credentials</span>
              </div>
              <p className="text-xs font-semibold leading-relaxed">
                The member's login password will be automatically set to <code className="bg-amber-100 px-1.5 py-0.5 rounded font-bold text-amber-700">member123</code>. They will be prompted to change it upon first login.
              </p>
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200">
                Register Member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
