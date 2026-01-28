-- Add purchase NAV column to mutual_funds for tracking buy price
ALTER TABLE mutual_funds
ADD COLUMN IF NOT EXISTS purchase_nav DECIMAL(10, 2) DEFAULT 0;