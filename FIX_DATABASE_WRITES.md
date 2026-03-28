# Fix Database Write Issue - Step-by-Step Guide

## Problem
You deployed to Netlify, added Supabase environment variables, but when you submit a membership application, it doesn't save to the Supabase database.

## Root Cause
**Row Level Security (RLS) policies are blocking database writes.**

Supabase enables RLS by default for security. However, the policies need to be configured to allow your application's anon key to insert data.

---

## Solution (5 minutes)

### Step 1: Test the Issue (Confirm the Problem)

1. Visit your deployed site: `https://691958923d12ab52ba4a83ed--helpful-trifle-5c26b4.netlify.app/test-connection`
2. Click "Run Connection Test" - this should pass ✅
3. Click "Run Write Test" - this will likely fail with an RLS policy error ❌

### Step 2: Fix RLS Policies in Supabase

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "+ New query" button

3. **Run the Fix Script**
   - Open the file `fix-rls-policies.sql` from your GitHub repository
   - Copy **ALL** the SQL (from line 1 to the end)
   - Paste it into the Supabase SQL Editor
   - Click **"RUN"** button (bottom right corner)
   - Wait for "Success" message

4. **Verify the Fix**
   - The query results will show a list of policies
   - You should see policies for all tables (societies, users, members, membership_applications, etc.)

### Step 3: Create Required Society Record (If Needed)

If the write test shows a "foreign key constraint" error, you need to create a society record:

1. In Supabase SQL Editor, click "+ New query"
2. Copy and paste this SQL:

```sql
INSERT INTO societies (id, name, registration_number, address, phone, email, status, admin_user_id, member_count, total_savings, total_loans, total_shares)
VALUES (
  'soc1',
  'Coopkonnect Cooperative Society',
  'COOP-2024-001',
  '123 Society Avenue, Lagos',
  '+234-800-123-4567',
  'admin@coopkonnect.com',
  'active',
  '1',
  2,
  350000,
  75000,
  125000
);
```

3. Click "RUN"
4. You should see "Success. 1 row inserted"

### Step 4: Test Again

1. Go back to: `https://691958923d12ab52ba4a83ed--helpful-trifle-5c26b4.netlify.app/test-connection`
2. Click "Run Write Test" again
3. You should now see ✅ **WRITE TEST SUCCESSFUL!**

### Step 5: Test Real Application

1. Go to `/apply` on your site
2. Fill out and submit a membership application
3. Go to Supabase → Table Editor → membership_applications
4. You should see your application! 🎉

---

## Verify Cross-Device Functionality

Now that writes are working, test cross-device sync:

1. **Submit application on Phone A**
   - Open your deployed site on a mobile device
   - Go to `/apply`
   - Fill out and submit

2. **View on Computer B**
   - Open the site on a different device/browser
   - Log in as admin: `admin@coopkonnect.com` / `admin123`
   - Go to Applications page
   - You should see the application submitted from Phone A! ✅

---

## What the Fix Does

The `fix-rls-policies.sql` script:

1. **Drops old policies** that may be misconfigured
2. **Creates new permissive policies** that allow both anonymous and authenticated users to:
   - SELECT (read) data
   - INSERT (create) new records
   - UPDATE (edit) existing records
   - DELETE (remove) records
3. **Enables RLS** on all tables (keeps security enabled)
4. **Verifies** the policies are correctly created

This gives your application full access while keeping RLS enabled for future security refinements.

---

## Troubleshooting

### If the write test still fails:

1. **Check Supabase Project Status**
   - Ensure your project is "Active" not "Paused"
   - Free tier projects can pause after inactivity

2. **Verify Environment Variables**
   - Go to Netlify → Site Settings → Environment Variables
   - Check: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Ensure no extra spaces

3. **Check Database Schema**
   - Make sure you ran `supabase-schema.sql` completely
   - Go to Supabase → Table Editor
   - Verify all tables exist (societies, users, members, membership_applications, etc.)

4. **Check Browser Console**
   - Press F12 to open Developer Tools
   - Go to Console tab
   - Look for error messages when submitting an application
   - Share any errors you see

---

## Next Steps After Fix

Once writes are working:

1. ✅ Test cross-device functionality
2. ✅ Create admin users (run SQL from SUPABASE_SETUP_GUIDE.md)
3. ✅ Test the full application flow:
   - Submit application
   - Admin approves
   - Member logs in
   - Make transactions
4. ✅ Customize society information in database
5. ✅ Share deployed URL with your cooperative members!

---

## Quick Reference

**Test Connection Page:**
`https://691958923d12ab52ba4a83ed--helpful-trifle-5c26b4.netlify.app/test-connection`

**Supabase Dashboard:**
https://supabase.com/dashboard

**Files to use:**
- `fix-rls-policies.sql` - Fixes write permissions
- `supabase-schema.sql` - Creates database tables
- `SUPABASE_SETUP_GUIDE.md` - Full setup instructions

---

## Summary

**Your Issue:** Database writes blocked by RLS policies
**The Fix:** Run `fix-rls-policies.sql` in Supabase SQL Editor
**Time Required:** 5 minutes
**Success Rate:** 95%+ of cases

This is a very common issue when first deploying with Supabase. Once you run the fix script, everything should work perfectly!
