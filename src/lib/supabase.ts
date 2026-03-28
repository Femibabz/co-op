import { createClient } from '@supabase/supabase-js';

// Check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && key && url.length > 0 && key.length > 0);
};

// Get Supabase URL and Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create Supabase client (will be a dummy client if not configured)
// On some environments, missing headers can cause 406 Not Acceptable errors.
// We'll ensure standard headers are initialized correctly.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: typeof window !== 'undefined', // Only persist in browser
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      headers: { 'x-application-name': 'coopkonnect' }
    }
  }
);
