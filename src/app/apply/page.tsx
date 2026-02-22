'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Book, Users, DollarSign, Scale, Eye, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { db } from '@/lib/mock-data';
import { ByLaw } from '@/types';

export default function ApplyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [byLaws, setByLaws] = useState<ByLaw[]>([]);
  const [selectedByLaw, setSelectedByLaw] = useState<ByLaw | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [showByLaws, setShowByLaws] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    guarantor1MemberId: '',
    guarantor2MemberId: '',
  });

  useEffect(() => {
    // Load active by-laws and members for prospective members
    const loadData = async () => {
      const activeByLaws = await db.getActiveByLaws();
      setByLaws(activeByLaws);

      // Load all active members for guarantor selection
      const allMembers = await db.getMembers();
      const activeMembers = allMembers.filter(m => m.status === 'active');
      setMembers(activeMembers);
    };
    loadData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'guarantor1MemberId', 'guarantor2MemberId'];
      const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);

      if (missingFields.length > 0) {
        setError('Please fill in all required fields including both guarantors');
        return;
      }

      // Validate guarantors are different
      if (formData.guarantor1MemberId === formData.guarantor2MemberId) {
        setError('Please select two different guarantors');
        return;
      }

      // Get guarantor details
      const guarantor1 = members.find(m => m.id === formData.guarantor1MemberId);
      const guarantor2 = members.find(m => m.id === formData.guarantor2MemberId);

      if (!guarantor1 || !guarantor2) {
        setError('Invalid guarantor selection');
        return;
      }

      // Create application with guarantor details
      const application = await db.createApplication({
        societyId: 'soc1',
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        guarantor1MemberId: guarantor1.id,
        guarantor1Name: `${guarantor1.firstName} ${guarantor1.lastName}`,
        guarantor1MemberNumber: guarantor1.memberNumber,
        guarantor2MemberId: guarantor2.id,
        guarantor2Name: `${guarantor2.firstName} ${guarantor2.lastName}`,
        guarantor2MemberNumber: guarantor2.memberNumber,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (err) {
      setError('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'membership':
        return <Users className="h-4 w-4" />;
      case 'financial':
        return <DollarSign className="h-4 w-4" />;
      case 'governance':
        return <Scale className="h-4 w-4" />;
      case 'general':
        return <Book className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'membership':
        return 'bg-blue-100 text-blue-800';
      case 'financial':
        return 'bg-green-100 text-green-800';
      case 'governance':
        return 'bg-purple-100 text-purple-800';
      case 'general':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const openViewModal = (bylaw: ByLaw) => {
    setSelectedByLaw(bylaw);
    setIsViewModalOpen(true);
  };

  const formatContent = (content: string) => {
    return content.split('\n').map((line, index) => (
      <p key={index} className={line.trim() === '' ? 'mb-4' : 'mb-2'}>
        {line}
      </p>
    ));
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Success background decoration */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_50%)]"></div>

        <Card className="max-w-md w-full premium-card relative z-10 animate-fadeIn overflow-hidden border-emerald-100 shadow-2xl shadow-emerald-200/50">
          <div className="h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600"></div>
          <CardHeader className="pt-10">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-emerald-50/50">
              <FileText className="w-10 h-10 text-emerald-600 animate-pulse" />
            </div>
            <CardTitle className="text-center text-3xl font-black text-slate-900 tracking-tight">Application Sent!</CardTitle>
            <CardDescription className="text-center text-slate-500 font-medium px-4 pt-2">
              Your membership application has been securely transmitted to the society governance board.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-10 pt-4 px-10">
            <div className="space-y-6 text-center">
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 italic">
                <p className="text-sm text-emerald-800 font-bold">
                  "The journey of a thousand miles begins with a single step."
                </p>
              </div>
              <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                Verification protocols are now in progress. You will receive an official notification via <span className="text-emerald-600 underline font-bold">{formData?.email || 'your email'}</span> once authorized.
              </p>
              <div className="pt-4 flex flex-col items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce"></div>
                </div>
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Redirecting to society portal</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 sm:py-20 px-4 sm:px-6 lg:px-8 relative">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
      <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
      <div className="fixed bottom-0 left-0 -z-10 w-[500px] h-[500px] bg-teal-100/30 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2"></div>

      <div className="max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-4 animate-fadeIn">
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-4 py-1 text-xs font-black uppercase tracking-widest rounded-full mb-2">
            Membership Onboarding
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter">
            Join the <span className="text-emerald-600">OsuOlale</span> Legacy
          </h1>
          <p className="max-w-xl mx-auto text-lg text-slate-500 font-medium leading-relaxed">
            Take your seat at the table of collective prosperity. Complete your application to access institutional growth.
          </p>
        </div>

        {/* Global Constitution / By-Laws Section */}
        {byLaws.length > 0 && (
          <div className="premium-card overflow-hidden border-slate-200/60 shadow-xl shadow-slate-200/40 animate-fadeIn [animation-delay:100ms]">
            <div className="px-8 py-8 border-b border-slate-100 bg-slate-50/50 sm:flex sm:items-center sm:justify-between gap-6">
              <div className="flex-1 space-y-1">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Book className="w-5 h-5 text-emerald-600" />
                  Digital Constitution
                </h2>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Principles of governance & conduct</p>
              </div>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowByLaws(!showByLaws)}
                className="mt-4 sm:mt-0 h-11 px-6 rounded-xl font-bold border-2 hover:bg-slate-100 transition-all active:scale-95">
                {showByLaws ? (
                  <><span className="mr-2">Minimize Registry</span> <ChevronUp className="h-4 w-4" /></>
                ) : (
                  <><span className="mr-2">Explore Bylaws</span> <ChevronDown className="h-4 w-4" /></>
                )}
              </Button>
            </div>

            {showByLaws && (
              <CardContent className="p-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  {byLaws.map((bylaw) => (
                    <div
                      key={bylaw.id}
                      className="group p-5 border-2 border-slate-100 rounded-2xl hover:border-emerald-200 hover:bg-emerald-50/30 transition-all duration-300">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                            {getCategoryIcon(bylaw.category)}
                          </div>
                          <Badge className={`${getCategoryBadgeColor(bylaw.category)} border-none shadow-sm font-black uppercase text-[9px] tracking-widest px-2.5 py-1 rounded-lg`}>
                            {bylaw.category}
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight">{bylaw.title}</h4>
                          <p className="text-xs font-medium text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                            {bylaw.content.substring(0, 100)}...
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewModal(bylaw)}
                          className="w-full justify-between h-10 px-4 rounded-xl font-bold text-emerald-700 hover:bg-emerald-100 group/btn transition-all">
                          Review Protocol
                          <Eye className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 transition-all translate-x-2 group-hover/btn:translate-x-0" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-5 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl text-white shadow-lg shadow-emerald-700/20">
                  <p className="text-sm font-bold flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Scale className="w-4 h-4" />
                    </div>
                    By proceeding with your application, you acknowledge and agree to adhere to these foundational statutes.
                  </p>
                </div>
              </CardContent>
            )}
          </div>
        )}

        <div className="premium-card bg-white shadow-2xl shadow-slate-200/60 border-none overflow-hidden animate-fadeIn [animation-delay:200ms]">
          <div className="px-8 py-10 border-b border-slate-100 bg-slate-50/30">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Application Dossier</h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Please provide authentic identity and guarantor credentials</p>
          </div>
          <CardContent className="p-8 sm:p-12">
            <form onSubmit={handleSubmit} className="space-y-12">
              {/* Personal Details */}
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="px-3 py-1 bg-emerald-600 text-white text-xs font-black rounded-lg">SEGMENT I</div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Personal Identity</h3>
                  <div className="flex-1 h-[2px] bg-slate-100"></div>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="firstName" className="text-xs font-black text-slate-600 uppercase tracking-widest">First Legal Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="e.g. Samuel"
                      className="h-14 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 transition-all font-semibold"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="lastName" className="text-xs font-black text-slate-600 uppercase tracking-widest">Family Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="e.g. Adeniji"
                      className="h-14 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 transition-all font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-xs font-black text-slate-600 uppercase tracking-widest">Email Endpoint</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="samuel@clarusly.com"
                      className="h-14 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 transition-all font-semibold"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-xs font-black text-slate-600 uppercase tracking-widest">Telecommunications</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+234 800 000 0000"
                      className="h-14 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 transition-all font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="address" className="text-xs font-black text-slate-600 uppercase tracking-widest">Residence / Physical Location</Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Provide your accurate primary residence address..."
                    className="min-h-[140px] p-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 transition-all font-semibold resize-none"
                    required
                  />
                </div>
              </div>

              {/* Guarantor Information */}
              <div className="space-y-10">
                <div className="flex items-center gap-4">
                  <div className="px-3 py-1 bg-teal-600 text-white text-xs font-black rounded-lg">SEGMENT II</div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Endorsement Section</h3>
                  <div className="flex-1 h-[2px] bg-slate-100"></div>
                </div>

                <div className="p-8 rounded-3xl bg-slate-50/50 border-2 border-slate-100 border-dashed text-center">
                  <p className="text-sm font-bold text-slate-500 max-w-md mx-auto">
                    Admission requires endorsement from <span className="text-slate-900">two established society members</span> in good standing.
                  </p>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                  {/* Primary Guarantor */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">01</div>
                      <Label htmlFor="guarantor1" className="text-xs font-black text-slate-900 uppercase tracking-widest">Primary Guarantor</Label>
                    </div>
                    <Select
                      value={formData.guarantor1MemberId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, guarantor1MemberId: value }))}
                    >
                      <SelectTrigger id="guarantor1" className="h-14 px-6 rounded-2xl bg-white border-2 border-slate-100 focus:border-emerald-500 transition-all font-bold text-slate-700">
                        <SelectValue placeholder="Identify member" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-xl">
                        {members.map((member) => (
                          <SelectItem
                            key={member.id}
                            value={member.id}
                            disabled={member.id === formData.guarantor2MemberId}
                            className="h-12 px-4 font-bold rounded-xl focus:bg-emerald-50 focus:text-emerald-700"
                          >
                            {member.memberNumber} • {member.firstName} {member.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Secondary Guarantor */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-black">02</div>
                      <Label htmlFor="guarantor2" className="text-xs font-black text-slate-900 uppercase tracking-widest">Secondary Guarantor</Label>
                    </div>
                    <Select
                      value={formData.guarantor2MemberId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, guarantor2MemberId: value }))}
                    >
                      <SelectTrigger id="guarantor2" className="h-14 px-6 rounded-2xl bg-white border-2 border-slate-100 focus:border-teal-500 transition-all font-bold text-slate-700">
                        <SelectValue placeholder="Identify member" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-xl">
                        {members.map((member) => (
                          <SelectItem
                            key={member.id}
                            value={member.id}
                            disabled={member.id === formData.guarantor1MemberId}
                            className="h-12 px-4 font-bold rounded-xl focus:bg-teal-50 focus:text-teal-700"
                          >
                            {member.memberNumber} • {member.firstName} {member.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="rounded-2xl border-2 animate-fadeIn bg-rose-50 text-rose-700 border-rose-100">
                  <AlertDescription className="font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  type="submit"
                  className="btn-premium h-16 sm:flex-1 rounded-2xl font-black text-lg bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-700/20 active:scale-95 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Verifying Dossier...</span>
                    </div>
                  ) : (
                    'Transmit Application'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="h-16 px-8 rounded-2xl font-bold border-2 text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Dismiss
                </Button>
              </div>
            </form>
          </CardContent>
        </div>

        {/* Support Section */}
        <div className="text-center pb-20">
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Official Cooperative Liaison</p>
          <div className="inline-flex items-center gap-4 px-6 py-3 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-100">
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div key={i} className={`w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-500`}>A{i}</div>
              ))}
            </div>
            <p className="text-xs font-bold text-slate-500">Need assistance? <span className="text-emerald-600 cursor-pointer hover:underline underline-offset-4 font-black">Contact Help Desk</span></p>
          </div>
        </div>
      </div>

      {/* Constitution View Overlay */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="p-10 space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <DialogHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    {selectedByLaw && getCategoryIcon(selectedByLaw.category)}
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
                      {selectedByLaw?.title}
                    </DialogTitle>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Article Section Registry</p>
                  </div>
                </div>
                <Badge className={`${getCategoryBadgeColor(selectedByLaw?.category || '')} border-none font-black uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-xl`}>
                  {selectedByLaw?.category}
                </Badge>
              </div>
              <div className="w-full h-[1px] bg-slate-100"></div>
              <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Official protocol published {selectedByLaw?.createdAt instanceof Date ? selectedByLaw.createdAt.toLocaleDateString() : '---'}
                {selectedByLaw?.updatedAt instanceof Date && selectedByLaw.createdAt instanceof Date && selectedByLaw.createdAt.getTime() !== selectedByLaw.updatedAt.getTime() &&
                  ` • Amended ${selectedByLaw.updatedAt.toLocaleDateString()}`
                }
              </DialogDescription>
            </DialogHeader>

            <div className="bg-slate-50/50 p-8 rounded-[2rem] border-2 border-slate-50">
              <div className="text-slate-700 leading-relaxed font-semibold text-lg">
                {selectedByLaw && formatContent(selectedByLaw.content)}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsViewModalOpen(false)}
                className="h-12 px-8 rounded-xl font-bold border-2 hover:bg-slate-100 transition-all"
              >
                Finished Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
