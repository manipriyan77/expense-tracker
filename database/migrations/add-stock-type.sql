-- Add stock type classification
ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS stock_type TEXT DEFAULT 'other';