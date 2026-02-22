'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Book,
  Users,
  DollarSign,
  Scale,
  Eye,
  ChevronRight,
  BookOpen,
  Shield,
  History,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { db } from '@/lib/mock-data';
import { ByLaw } from '@/types';

export default function MemberByLawsPage() {
  const { user } = useAuth();
  const [byLaws, setByLaws] = useState<ByLaw[]>([]);
  const [selectedByLaw, setSelectedByLaw] = useState<ByLaw | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadByLaws = async () => {
      try {
        const activeByLaws = await db.getActiveByLaws();
        setByLaws(activeByLaws);
        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading by-laws:', err);
        setIsLoaded(true);
      }
    };
    loadByLaws();
  }, []);

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'membership':
        return { icon: <Users className="w-5 h-5" />, color: 'indigo', label: 'Membership' };
      case 'financial':
        return { icon: <DollarSign className="w-5 h-5" />, color: 'emerald', label: 'Financial' };
      case 'governance':
        return { icon: <Scale className="w-5 h-5" />, color: 'amber', label: 'Governance' };
      case 'general':
        return { icon: <Book className="w-5 h-5" />, color: 'slate', label: 'General' };
      default:
        return { icon: <FileText className="w-5 h-5" />, color: 'slate', label: 'Official' };
    }
  };

  const categories = [
    { id: 'all', label: 'Codex', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'membership', label: 'Membership', icon: <Users className="w-4 h-4" /> },
    { id: 'financial', label: 'Financial', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'governance', label: 'Governance', icon: <Scale className="w-4 h-4" /> },
    { id: 'general', label: 'General', icon: <Book className="w-4 h-4" /> },
  ];

  const filteredByLaws = selectedCategory === 'all'
    ? byLaws
    : byLaws.filter(b => b.category === selectedCategory);

  const openViewModal = (bylaw: ByLaw) => {
    setSelectedByLaw(bylaw);
    setIsViewModalOpen(true);
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Accessing Constitution</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <p className="text-sm font-bold text-primary uppercase tracking-widest">Regulatory Framework</p>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Society By-Laws</h2>
          <p className="text-slate-500 max-w-2xl font-medium">
            The fundamental principles and operational rules governing the Osuolale Cooperative Society.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white/50 p-2 rounded-2xl border border-slate-200/60 backdrop-blur-sm">
          <div className="flex -space-x-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden">
                <Shield className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
          <p className="text-xs font-bold text-slate-600 pr-2">Certified Documentation</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="premium-card p-4 space-y-1">
            <h3 className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Library Categories</h3>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm group ${selectedCategory === cat.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                    : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <span className={`${selectedCategory === cat.id ? 'text-white' : 'text-slate-400 group-hover:text-primary'}`}>
                  {cat.icon}
                </span>
                {cat.label}
                {selectedCategory === cat.id && <ChevronRight className="ml-auto w-4 h-4 opacity-70" />}
              </button>
            ))}
          </div>

          <div className="premium-card p-6 bg-slate-900 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors"></div>
            <div className="relative z-10 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                <Book className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-bold tracking-tight">Need Assistance?</h4>
                <p className="text-xs text-slate-400 mt-1">If you have questions regarding the interpretation of these laws, please contact the secretary.</p>
              </div>
              <Button variant="link" className="p-0 h-auto text-emerald-400 font-bold text-xs hover:text-emerald-300">
                Contact Secretary <ArrowRight className="ml-2 w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {filteredByLaws.length === 0 ? (
            <div className="premium-card p-12 text-center space-y-4 max-w-lg mx-auto bg-white/40 border-dashed">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">No Articles Found</h3>
                <p className="text-sm text-slate-500 mt-1">There are no by-laws listed in this category yet. Please check the main Codex for general rules.</p>
              </div>
              <Button variant="outline" className="rounded-xl font-bold" onClick={() => setSelectedCategory('all')}>
                Return to Codex
              </Button>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredByLaws.map((bylaw) => {
                const theme = getCategoryTheme(bylaw.category);
                return (
                  <div
                    key={bylaw.id}
                    className="premium-card group hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
                    onClick={() => openViewModal(bylaw)}
                  >
                    <div className="flex">
                      <div className={`w-1.5 shrink-0 bg-${theme.color}-500 opacity-40 group-hover:opacity-100 transition-opacity`}></div>
                      <div className="p-6 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-5">
                          <div className={`w-12 h-12 rounded-2xl bg-${theme.color}-50 flex items-center justify-center text-${theme.color}-600 border border-${theme.color}-100 shrink-0`}>
                            {theme.icon}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{bylaw.title}</h3>
                              <Badge className={`bg-${theme.color}-100 text-${theme.color}-700 hover:bg-${theme.color}-100 border-none font-bold text-[10px] uppercase rounded-lg`}>
                                {theme.label}
                              </Badge>
                            </div>
                            <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">
                              {bylaw.content}
                            </p>
                            <div className="flex items-center gap-4 pt-1">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <History className="w-3 h-3" />
                                Revised {new Date(bylaw.updatedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" className="rounded-xl font-bold group-hover:bg-slate-50 group-hover:text-primary transition-all flex items-center gap-2 shrink-0">
                          View Article
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reader Dialog */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none rounded-3xl bg-slate-50/95 backdrop-blur-xl animate-scaleIn">
          <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
            {selectedByLaw && (
              <>
                <div className="relative h-48 bg-slate-900 flex items-center px-10">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-emerald-600/20 opacity-50"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50/95 to-transparent"></div>
                  <div className="relative z-10 space-y-4 w-full">
                    <Badge className="bg-white/10 text-white backdrop-blur-md border border-white/20 font-bold uppercase tracking-widest text-[10px] rounded-lg">
                      Constitution Article
                    </Badge>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight">{selectedByLaw.title}</h2>
                  </div>
                </div>

                <div className="px-10 pb-12 -mt-6 relative z-10">
                  <div className="premium-card p-10 bg-white">
                    <div className="prose prose-slate max-w-none">
                      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                        <div className="flex gap-8">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</p>
                            <p className="text-sm font-extrabold text-primary capitalize">{selectedByLaw.category}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Revised</p>
                            <p className="text-sm font-extrabold text-slate-700">{new Date(selectedByLaw.updatedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="hidden sm:block">
                          <div className="p-2 border-2 border-slate-900 rounded-lg opacity-10 grayscale hover:opacity-100 transition-all cursor-default select-none">
                            <p className="text-[8px] font-black text-slate-900 leading-none">OSUALALE</p>
                            <p className="text-[8px] font-black text-slate-900 leading-none">OFFICIAL</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-6">
                        {selectedByLaw.content.split('\n').filter(p => p.trim()).map((paragraph, idx) => (
                          <p key={idx} className="text-slate-700 leading-relaxed text-lg first-letter:text-3xl first-letter:font-bold first-letter:text-primary first-letter:mr-1 first-letter:float-left">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-3 text-slate-400">
                        <Shield className="w-5 h-5" />
                        <p className="text-xs font-medium">This document is legally binding and recognized by the Board of Directors.</p>
                      </div>
                      <Button
                        variant="outline"
                        className="rounded-xl font-bold border-2"
                        onClick={() => setIsViewModalOpen(false)}
                      >
                        Dismiss Reader
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
