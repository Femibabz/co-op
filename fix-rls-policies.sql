-- Fix Row Level Security (RLS) Policies for Coopkonnect Cooperative
-- Run this in your Supabase SQL Editor if data is not writing to the database

-- ===================================================================
-- STEP 1: Drop existing policies (if any)
-- ===================================================================

DROP POLICY IF EXISTS "Allow all operations" ON societies;
DROP POLICY IF EXISTS "Allow all operations" ON users;
DROP POLICY IF EXISTS "Allow all operations" ON members;
DROP POLICY IF EXISTS "Allow all operations" ON membership_applications;
DROP POLICY IF EXISTS "Allow all operations" ON loan_applications;
DROP POLICY IF EXISTS "Allow all operations" ON transactions;
DROP POLICY IF EXISTS "Allow all operations" ON bylaws;
DROP POLICY IF EXISTS "Allow all operations" ON login_sessions;

-- ===================================================================
-- STEP 2: Create new permissive policies for all operations
-- ===================================================================

-- Societies policies
CREATE POLICY "Enable all for societies"
ON societies FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Users policies
CREATE POLICY "Enable all for users"
ON users FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Members policies
CREATE POLICY "Enable all for members"
ON members FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Membership Applications policies
CREATE POLICY "Enable all for membership_applications"
ON membership_applications FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Loan Applications policies
CREATE POLICY "Enable all for loan_applications"
ON loan_applications FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Transactions policies
CREATE POLICY "Enable all for transactions"
ON transactions FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ByLaws policies
CREATE POLICY "Enable all for bylaws"
ON bylaws FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Login Sessions policies
CREATE POLICY "Enable all for login_sessions"
ON login_sessions FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ===================================================================
-- STEP 3: Verify RLS is enabled (should already be enabled)
-- ===================================================================

ALTER TABLE societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bylaws ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- VERIFICATION: Check if policies are created
-- ===================================================================

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ===================================================================
-- SUCCESS MESSAGE
-- ===================================================================
-- If you see policies listed above, RLS is now properly configured!
-- Try submitting a membership application again - it should work now.
