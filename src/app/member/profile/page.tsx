'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Edit,
  Save,
  X,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Users,
  ShieldCheck,
  Briefcase,
  TrendingUp,
  CircleCheck,
  CreditCard,
  Building2,
  Fingerprint,
  AlertTriangle
} from 'lucide-react';
import { db } from '@/lib/mock-data';
import { Member, MembershipApplication } from '@/types';

export default function ProfilePage() {
  const { user } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [application, setApplication] = useState<MembershipApplication | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    occupation: '',
    annualIncome: '',
  });

  const [originalData, setOriginalData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    occupation: '',
    annualIncome: '',
  });

  useEffect(() => {
    const loadMember = async () => {
      if (user?.role === 'member') {
        try {
          const memberData = await db.getMemberByUserId(user.id);
          if (memberData) {
            setMember(memberData);

            const profileData = {
              firstName: memberData.firstName,
              lastName: memberData.lastName,
              email: memberData.email,
              phone: memberData.phone,
              address: memberData.address,
              occupation: (memberData as any).occupation || '',
              annualIncome: (memberData as any).annualIncome ? (memberData as any).annualIncome.toString() : '',
            };
            setFormData(profileData);
            setOriginalData(profileData);

            const applications = await db.getApplications();
            const memberApplication = applications.find(
              app => app.email === memberData.email && app.status === 'approved'
            );
            if (memberApplication) {
              setApplication(memberApplication);
            }
          }
          setIsLoaded(true);
        } catch (err) {
          console.error('Error loading profile:', err);
          setIsLoaded(true);
        }
      }
    };
    loadMember();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !user) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError('First name and last name are required');
        return;
      }
      if (!formData.email.trim() || !formData.email.includes('@')) {
        setError('Please enter a valid email address');
        return;
      }

      const updatedMember = await db.updateMember(member.id, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        ...(formData.occupation && { occupation: formData.occupation.trim() }),
        ...(formData.annualIncome && { annualIncome: parseFloat(formData.annualIncome) }),
      } as any);

      if (updatedMember) {
        setMember(updatedMember);
        const newData = {
          firstName: updatedMember.firstName,
          lastName: updatedMember.lastName,
          email: updatedMember.email,
          phone: updatedMember.phone,
          address: updatedMember.address,
          occupation: (updatedMember as any).occupation || '',
          annualIncome: (updatedMember as any).annualIncome ? (updatedMember as any).annualIncome.toString() : '',
        };
        setOriginalData(newData);
        setIsEditing(false);
        setSuccess('Profile updated effectively');
      }
    } catch (err) {
      setError('Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  const getInitials = () => {
    if (!member) return 'MB';
    return `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase();
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Accessing Profile</p>
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-bold text-primary uppercase tracking-widest">Personal Account</p>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Identity & Security</h2>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button className="btn-premium flex items-center gap-2" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl border-2 font-bold" onClick={() => { setFormData(originalData); setIsEditing(false); }}>
                Cancel
              </Button>
              <Button className="btn-premium flex items-center gap-2" onClick={handleSave} disabled={isSubmitting || !hasChanges}>
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {(error || success) && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-fadeIn ${error ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
          {error ? <AlertTriangle className="w-5 h-5" /> : <CircleCheck className="w-5 h-5" />}
          <p className="text-sm font-bold">{error || success}</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column - Card */}
        <div className="space-y-6">
          <div className="premium-card overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-primary to-emerald-600"></div>
            <div className="px-6 pb-8 -mt-12 text-center space-y-4">
              <div className="w-24 h-24 rounded-3xl bg-white shadow-xl flex items-center justify-center text-primary text-3xl font-extrabold mx-auto border-4 border-white relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity"></div>
                {getInitials()}
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{member.firstName} {member.lastName}</h3>
                <div className="flex items-center justify-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2 rounded-lg font-bold text-[10px] uppercase">
                    {member.status} Member
                  </Badge>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{member.memberNumber}</span>
                </div>
              </div>
              <div className="pt-4 grid grid-cols-2 gap-4 border-t border-slate-100 italic">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Member Since</p>
                  <p className="text-xs font-bold text-slate-600 mt-1">{member.dateJoined.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</p>
                  <p className="text-xs font-bold text-slate-600 mt-1">Full Member</p>
                </div>
              </div>
            </div>
          </div>

          <div className="premium-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Asset Standing
              </h4>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Shares</span>
                  <span className="text-sm font-extrabold text-slate-900">{formatCurrency(member.sharesBalance)}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Savings</span>
                  <span className="text-sm font-extrabold text-slate-900">{formatCurrency(member.savingsBalance)}</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consolidated Balance</p>
                <p className="text-xl font-extrabold tracking-tight">{formatCurrency(member.sharesBalance + member.savingsBalance)}</p>
              </div>
            </div>
          </div>

          {application && (
            <div className="premium-card p-6 space-y-6">
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  Endorsements
                </h4>
                <p className="text-xs text-slate-400 font-medium">Guarantors who vouched for your membership.</p>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">G1</div>
                  <div className="flex-1">
                    <p className="text-xs font-extrabold text-slate-900">{application.guarantor1Name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{application.guarantor1MemberNumber}</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">G2</div>
                  <div className="flex-1">
                    <p className="text-xs font-extrabold text-slate-900">{application.guarantor2Name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{application.guarantor2MemberNumber}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Form */}
        <div className="lg:col-span-2 space-y-8">
          <div className="premium-card p-8">
            <form onSubmit={handleSave} className="space-y-10">
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                  <Fingerprint className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Core Bio-data</h3>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Legal First Name</Label>
                    {isEditing ? (
                      <Input name="firstName" value={formData.firstName} onChange={handleInputChange} className="h-11 bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl font-bold" />
                    ) : (
                      <p className="h-11 flex items-center px-4 bg-slate-50/30 rounded-xl font-bold text-slate-700">{member.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Legal Last Name</Label>
                    {isEditing ? (
                      <Input name="lastName" value={formData.lastName} onChange={handleInputChange} className="h-11 bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl font-bold" />
                    ) : (
                      <p className="h-11 flex items-center px-4 bg-slate-50/30 rounded-xl font-bold text-slate-700">{member.lastName}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                  <Phone className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Contact Information</h3>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Primary Email</Label>
                    {isEditing ? (
                      <Input name="email" value={formData.email} onChange={handleInputChange} className="h-11 bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl font-bold" />
                    ) : (
                      <p className="h-11 flex items-center px-4 bg-slate-50/30 rounded-xl font-bold text-slate-700">{member.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Mobile Line</Label>
                    {isEditing ? (
                      <Input name="phone" value={formData.phone} onChange={handleInputChange} className="h-11 bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl font-bold" />
                    ) : (
                      <p className="h-11 flex items-center px-4 bg-slate-50/30 rounded-xl font-bold text-slate-700">{member.phone}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Permanent Residence</Label>
                  {isEditing ? (
                    <Textarea name="address" value={formData.address} onChange={handleInputChange} rows={3} className="bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl font-bold pt-4" />
                  ) : (
                    <p className="min-h-[88px] p-4 bg-slate-50/30 rounded-xl font-bold text-slate-700 leading-relaxed">{member.address}</p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                  <Briefcase className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Professional Standing</h3>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Occupation</Label>
                    {isEditing ? (
                      <Input name="occupation" value={formData.occupation} onChange={handleInputChange} className="h-11 bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl font-bold" />
                    ) : (
                      <p className="h-11 flex items-center px-4 bg-slate-50/30 rounded-xl font-bold text-slate-700">{(member as any).occupation || 'Not Listed'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Est. Monthly Inflow</Label>
                    {isEditing ? (
                      <Input name="annualIncome" type="number" value={formData.annualIncome} onChange={handleInputChange} className="h-11 bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl font-bold" />
                    ) : (
                      <p className="h-11 flex items-center px-4 bg-slate-50/30 rounded-xl font-bold text-slate-700">{(member as any).annualIncome ? formatCurrency((member as any).annualIncome) : 'Not Listed'}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <ShieldCheck className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Your personal data is encrypted and handled with the highest security standards. Some fields may require verification by our agents after amendment.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
