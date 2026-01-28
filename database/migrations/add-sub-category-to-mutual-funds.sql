-- Add sub_category to mutual_funds for detailed classification
ALTER TABLE mutual_funds
ADD COLUMN IF NOT EXISTS sub_category TEXT DEFAULT 'other';