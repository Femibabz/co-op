'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Copy, Database, ShieldAlert } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function DatabaseSetupPage() {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [columnExists, setColumnExists] = useState<boolean | null>(null);

  const migrationSQL = `-- 🚨 URGENT FIX: Type Mismatch Resolution 🚨
-- The application uses custom string IDs (e.g., 'soc123', 'u123'). 
-- If you used UUID types previously, please execute this fix to convert them to TEXT.

-- 1. Correct Users Table
ALTER TABLE public.users 
ALTER COLUMN society_id TYPE TEXT;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Correct Members Table
ALTER TABLE public.members 
ALTER COLUMN user_id TYPE TEXT,
ALTER COLUMN society_id TYPE TEXT;

ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. Open up RLS for new tables
ALTER TABLE public.societies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public societies access" ON public.societies;
CREATE POLICY "Public societies access" ON public.societies FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public users access" ON public.users;
CREATE POLICY "Public users access" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- 4. Legacy Support (Bypass 6-month check)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS loan_eligibility_override BOOLEAN DEFAULT FALSE;`;

  const checkColumn = async () => {
    setChecking(true);
    setMessage(null);

    try {
      // Try to query a member and check if the column exists
      const { data, error } = await supabase
        .from('members')
        .select('id, loan_eligibility_override')
        .limit(1);

      if (error) {
        if (error.message.includes('loan_eligibility_override')) {
          setColumnExists(false);
          setMessage({
            type: 'error',
            text: 'Column loan_eligibility_override does NOT exist. Please run the migration SQL below.'
          });
        } else {
          setMessage({
            type: 'error',
            text: `Error: ${error.message}`
          });
        }
      } else {
        setColumnExists(true);
        setMessage({
          type: 'success',
          text: 'Column loan_eligibility_override EXISTS! ✓ Your database is ready.'
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `Error checking column: ${error.message}`
      });
    } finally {
      setChecking(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(migrationSQL);
    setMessage({
      type: 'success',
      text: 'SQL copied to clipboard!'
    });
    setTimeout(() => setMessage(null), 3000);
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Supabase is not configured. Please add your Supabase credentials to environment variables.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Database Setup</h1>
        <p className="text-gray-600 mt-2">Add missing columns to your Supabase database</p>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Loan Eligibility Override Column
          </CardTitle>
          <CardDescription>
            Check if the loan_eligibility_override column exists in your members table
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkColumn} disabled={checking}>
            {checking ? 'Checking...' : 'Check Column Status'}
          </Button>

          {columnExists !== null && (
            <div className={`p-4 rounded-lg border ${columnExists
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
              }`}>
              <p className={`font-medium ${columnExists ? 'text-green-900' : 'text-yellow-900'
                }`}>
                {columnExists
                  ? '✅ Column exists - your database is ready!'
                  : '⚠️ Column missing - please run the migration below'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {columnExists === false && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-900">Migration Required</CardTitle>
            <CardDescription>
              Follow these steps to add the missing column to your Supabase database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Step 1: Copy the SQL</h3>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  {migrationSQL}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy SQL
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Step 2: Run in Supabase SQL Editor</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Go to your Supabase project dashboard</li>
                <li>Click on <strong>SQL Editor</strong> in the left sidebar</li>
                <li>Click <strong>New query</strong></li>
                <li>Paste the SQL code from above</li>
                <li>Click <strong>Run</strong> to execute the migration</li>
                <li>Come back here and click <strong>"Check Column Status"</strong> again</li>
              </ol>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> This SQL uses "IF NOT EXISTS" so it's safe to run multiple times.
                It won't create duplicate columns.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      <Card className="border-rose-200 bg-rose-50/50">
        <CardHeader>
          <CardTitle className="text-rose-900 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Local Data Management
          </CardTitle>
          <CardDescription>
            Clear "stuck" local records that failed to sync with Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-rose-800">
            If you see data in the portal that isn't in your Supabase dashboard, it means the sync failed (likely due to the ID type mismatch).
            After running the Fix Script, click below to clear your local cache and start fresh.
          </p>
          <Button
            variant="destructive"
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
          >
            Clear Local Cache & Reload
          </Button>
        </CardContent>
      </Card>
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">What This Column Does</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>• <strong>Column Name:</strong> loan_eligibility_override</p>
          <p>• <strong>Type:</strong> Boolean (true/false)</p>
          <p>• <strong>Default:</strong> false</p>
          <p>• <strong>Purpose:</strong> Allows super admin to bypass the 6-month membership requirement for loan applications</p>
          <p>• <strong>Use Case:</strong> Testing loan workflows without waiting 6 months, or special member privileges</p>
        </CardContent>
      </Card>
    </div>
  );
}
