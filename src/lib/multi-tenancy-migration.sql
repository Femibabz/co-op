-- Multi-Tenancy Migration Script (Idempotent)

-- 1. Add society_id column to existing tables if missing
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS society_id TEXT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS society_id TEXT;
ALTER TABLE guarantor_requests ADD COLUMN IF NOT EXISTS society_id TEXT;
ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS society_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS society_id TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS society_id TEXT;

-- 2. Create broadcast_messages table
CREATE TABLE IF NOT EXISTS broadcast_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    sent_by TEXT,
    read_by TEXT[] DEFAULT '{}',
    -- Recurrence fields
    is_recurrent BOOLEAN DEFAULT false,
    frequency TEXT DEFAULT 'once', -- 'once', 'weekly', 'monthly', 'custom'
    custom_days INTEGER,
    next_scheduled_at TIMESTAMPTZ
);

-- Enable RLS for broadcast_messages
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation for broadcast_messages
DROP POLICY IF EXISTS "Members can view broadcasts for their society" ON broadcast_messages;
CREATE POLICY "Members can view broadcasts for their society" ON broadcast_messages
    FOR SELECT USING (
        -- Allow if JWT matches OR if no JWT claim exists (app handles filtering)
        (auth.jwt() ->> 'society_id' = society_id) OR 
        (auth.jwt() ->> 'society_id' IS NULL)
    );

DROP POLICY IF EXISTS "Admins can manage broadcasts for their society" ON broadcast_messages;
CREATE POLICY "Admins can manage broadcasts for their society" ON broadcast_messages
    FOR ALL USING (
        (auth.jwt() ->> 'society_id' = society_id) OR
        (auth.jwt() ->> 'society_id' IS NULL)
    );

-- 3. Create login_sessions table
CREATE TABLE IF NOT EXISTS login_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_role TEXT NOT NULL,
    society_id TEXT NOT NULL,
    login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_time TIMESTAMPTZ,
    device_info JSONB,
    location_info JSONB,
    session_active BOOLEAN DEFAULT true,
    is_suspicious BOOLEAN DEFAULT false,
    suspicious_reasons TEXT[]
);

-- Enable RLS for login_sessions
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation for login_sessions
DROP POLICY IF EXISTS "Users can view their own login sessions" ON login_sessions;
CREATE POLICY "Users can view their own login sessions" ON login_sessions
    FOR SELECT USING (
        auth.uid()::text = user_id
    );

DROP POLICY IF EXISTS "Admins can view all sessions for their society" ON login_sessions;
CREATE POLICY "Admins can view all sessions for their society" ON login_sessions
    FOR SELECT USING (
        (auth.jwt() ->> 'society_id' = society_id) OR
        (auth.jwt() ->> 'society_id' IS NULL)
    );

DROP POLICY IF EXISTS "Allow authenticated to insert sessions" ON login_sessions;
CREATE POLICY "Allow authenticated to insert sessions" ON login_sessions
    FOR INSERT WITH CHECK (
        true
    );
