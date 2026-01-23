-- Add debt term tracking fields for liabilities
ALTER TABLE liabilities
ADD COLUMN IF NOT EXISTS term_months INTEGER,
    ADD COLUMN IF NOT EXISTS months_remaining INTEGER;
-- Keep due_date as the anchor date; term fields are optional
-- Existing rows remain unchanged and will have NULL values