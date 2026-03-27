'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { mockUsers, mockSocieties } from '@/lib/mock-data';
import { CheckCircle2, AlertCircle, Database, Upload, Users } from 'lucide-react';

export default function SeedUsersPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [results, setResults] = useState<{ success: boolean; message: string; userCount?: number; societyCount?: number } | null>(null);

  const seedData = async () => {
    if (!isSupabaseConfigured()) {
      setResults({ success: false, message: 'Supabase is not configured. Please check your environment variables.' });
      return;
    }

    setIsSeeding(true);
    setResults(null);

    try {
      // 1. Seed Societies
      console.log('Seeding societies...');
      const societiesToInsert = mockSocieties.map(s => ({
        id: s.id,
        name: s.name,
        registration_number: s.registrationNumber,
        address: s.address,
        phone: s.phone,
        email: s.email,
        created_at: s.createdAt.toISOString(),
        status: s.status,
        admin_user_id: s.adminUserId
      }));

      const { data: sData, error: sError } = await supabase
        .from('societies')
        .upsert(societiesToInsert)
        .select();

      if (sError) throw new Error(`Failed to seed societies: ${sError.message}`);

      // 2. Seed Users
      console.log('Seeding users...');
      const usersToInsert = mockUsers.map(u => ({
        id: u.id,
        email: u.email,
        password: u.password,
        role: u.role,
        society_id: u.societyId || null,
        created_at: u.createdAt.toISOString(),
        is_active: u.isActive
      }));

      const { data: uData, error: uError } = await supabase
        .from('users')
        .upsert(usersToInsert)
        .select();

      if (uError) throw new Error(`Failed to seed users: ${uError.message}`);

      // 3. Seed Members
      console.log('Seeding members...');
      const { mockMembers, mockTransactions, mockLoanApplications } = await import('@/lib/mock-data');
      
      const membersToInsert = mockMembers.map(m => ({
        id: m.id,
        user_id: m.userId,
        society_id: m.societyId,
        member_number: m.memberNumber,
        first_name: m.firstName,
        last_name: m.lastName,
        email: m.email,
        phone: m.phone,
        address: m.address,
        date_joined: m.dateJoined.toISOString(),
        status: m.status,
        shares_balance: m.sharesBalance,
        savings_balance: m.savingsBalance,
        loan_balance: m.loanBalance,
        interest_balance: m.interestBalance,
        society_dues: m.societyDues,
        loan_start_date: m.loanStartDate?.toISOString(),
        loan_duration_months: m.loanDurationMonths,
        loan_interest_rate: m.loanInterestRate,
        monthly_loan_payment: m.monthlyLoanPayment
      }));

      const { data: mData, error: mError } = await supabase
        .from('members')
        .upsert(membersToInsert)
        .select();

      if (mError) throw new Error(`Failed to seed members: ${mError.message}`);

      // 4. Seed Transactions
      console.log('Seeding transactions...');
      const transactionsToInsert = mockTransactions.map(t => ({
        id: t.id,
        member_id: t.memberId,
        type: t.type,
        amount: t.amount,
        description: t.description,
        date: t.date.toISOString(),
        balance_after: t.balanceAfter,
        reference_number: t.referenceNumber,
        processed_by: t.processedBy,
        society_id: t.societyId
      }));

      const { error: tError } = await supabase
        .from('transactions')
        .upsert(transactionsToInsert);

      if (tError) throw new Error(`Failed to seed transactions: ${tError.message}`);

      setResults({
        success: true,
        message: 'Successfully seeded full system data to Supabase!',
        userCount: uData?.length,
        societyCount: sData?.length
      });

    } catch (err: any) {
      console.error('Seeding error:', err);
      setResults({
        success: false,
        message: `Seeding failed: ${err.message}`
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
           <CardTitle className="flex items-center">
              <Users className="h-6 w-6 mr-2 text-primary" />
              Seed Full System Data
            </CardTitle>
            <CardDescription>
              Populate Supabase with mock users, societies, members, and transactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 border rounded-lg bg-white">
              <h3 className="font-semibold mb-2">Supabase Status</h3>
              <div className="flex items-center">
                {isSupabaseConfigured() ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-green-700 font-medium">Connected</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-red-700 font-medium">Not Configured</span>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-blue-50">
                <p className="text-sm text-blue-600 font-medium">Users</p>
                <p className="text-xl font-bold text-blue-900">{mockUsers.length}</p>
              </div>
              <div className="p-4 border rounded-lg bg-purple-50">
                <p className="text-sm text-purple-600 font-medium">Societies</p>
                <p className="text-xl font-bold text-purple-900">{mockSocieties.length}</p>
              </div>
              <div className="p-4 border rounded-lg bg-green-50">
                <p className="text-sm text-green-600 font-medium">Members</p>
                <p className="text-xl font-bold text-green-900">3</p>
              </div>
              <div className="p-4 border rounded-lg bg-orange-50">
                <p className="text-sm text-orange-600 font-medium">Transactions</p>
                <p className="text-xl font-bold text-orange-900">12</p>
              </div>
            </div>

            <Button 
              onClick={seedData} 
              disabled={isSeeding || !isSupabaseConfigured()}
              className="w-full h-12 text-lg"
            >
              {isSeeding ? (
                <>
                  <Upload className="h-5 w-5 mr-2 animate-bounce" />
                  Seeding Data...
                </>
              ) : (
                <>
                  <Database className="h-5 w-5 mr-2" />
                  Seed Supabase Now
                </>
              )}
            </Button>

            {results && (
              <Alert variant={results.success ? "default" : "destructive"}>
                <div className="flex items-start">
                  {results.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 mr-2" />
                  )}
                  <div>
                    <AlertDescription className="font-medium">{results.message}</AlertDescription>
                    {results.success && (
                      <p className="text-sm opacity-90 mt-1">
                        Users: {results.userCount} | Societies: {results.societyCount}
                      </p>
                    )}
                  </div>
                </div>
              </Alert>
            )}

            <div className="text-center">
              <Button variant="link" onClick={() => window.location.href = '/'}>
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
