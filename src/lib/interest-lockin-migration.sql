-- SQL Migration to support Interest Lock-in mechanism
-- Please run this in your Supabase SQL Editor

-- 1. Add next_scheduled_interest column
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS next_scheduled_interest NUMERIC DEFAULT 0;

-- 2. Add last_interest_calculation_date column
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS last_interest_calculation_date TIMESTAMPTZ;

-- 3. Add comment explaining next_scheduled_interest
COMMENT ON COLUMN members.next_scheduled_interest IS 'Pre-calculated interest to be charged on the 1st of the following month. Part of the Lock-in mechanism.';

-- 4. Initial sync: For existing loans, set next_scheduled_interest (optional but recommended)
-- Update the interest rate calculation as per your current society rules (e.g., 1.5% = 0.015)
-- Here we use a generic placeholder; logic will be updated correctly upon next auto-calculate trigger.
UPDATE members 
SET next_scheduled_interest = ROUND(loan_balance * (COALESCE(loan_interest_rate, 1.5) / 100))
WHERE loan_balance > 0 AND next_scheduled_interest = 0;
