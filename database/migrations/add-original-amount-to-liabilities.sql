-- Add original_amount column to liabilities table for debt tracking
ALTER TABLE liabilities 
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(12,2);

-- Update existing records to set original_amount = balance for records without it
UPDATE liabilities 
SET original_amount = balance 
WHERE original_amount IS NULL;
