-- Add sub_sector to stocks for detailed sector classification
ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS sub_sector TEXT DEFAULT 'other';
