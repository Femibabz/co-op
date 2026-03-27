-- SQL Migration to support manual loan document uploads

-- Add document_url column to loan_applications table if it doesn't exist
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Refresh the schema cache (standard Supabase procedure)
-- In the Supabase SQL Editor, after running the above, you might need to
-- wait a moment for the schema cache to update automatically.
