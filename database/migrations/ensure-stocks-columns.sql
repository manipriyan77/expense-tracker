-- Ensure stocks table has all required columns for CSV import
-- These columns are optional and can be NULL
-- Run this in your Supabase SQL Editor
-- Add sub_sector column if it doesn't exist (optional field)
ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS sub_sector TEXT DEFAULT NULL;
-- Add stock_type column if it doesn't exist (optional field)
ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS stock_type TEXT DEFAULT NULL;
-- Add sector column if it doesn't exist (optional field)
ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT NULL;
-- Verify columns exist
SELECT column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'stocks'
  AND column_name IN ('sub_sector', 'stock_type', 'sector')
ORDER BY column_name;