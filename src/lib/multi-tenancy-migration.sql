-- Add society_id column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS society_id TEXT;

-- Add society_id column to loan_applications table
ALTER TABLE loan_applications 
ADD COLUMN IF NOT EXISTS society_id TEXT;

-- Add society_id column to guarantor_requests table
ALTER TABLE guarantor_requests 
ADD COLUMN IF NOT EXISTS society_id TEXT;

-- Optional: If you have a societies table, you can add foreign key constraints like this instead:
-- ALTER TABLE transactions ADD COLUMN IF NOT EXISTS society_id TEXT REFERENCES societies(id);
-- ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS society_id TEXT REFERENCES societies(id);
-- ALTER TABLE guarantor_requests ADD COLUMN IF NOT EXISTS society_id TEXT REFERENCES societies(id);
