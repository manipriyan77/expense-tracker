-- Add FD (Fixed Deposit) and RD (Recurring Deposit) investment types

-- Update type check constraint
ALTER TABLE other_investments DROP CONSTRAINT IF EXISTS other_investments_type_check;
ALTER TABLE other_investments ADD CONSTRAINT other_investments_type_check
  CHECK (type IN ('ppf', 'epf', 'nps', 'postal', 'lic', 'fd', 'rd', 'other'));

-- Update premium_frequency constraint to include 'cumulative' (for FD cumulative interest)
ALTER TABLE other_investments DROP CONSTRAINT IF EXISTS other_investments_premium_frequency_check;
ALTER TABLE other_investments ADD CONSTRAINT other_investments_premium_frequency_check
  CHECK (premium_frequency IN ('monthly', 'quarterly', 'semi-annual', 'annual', 'cumulative'));
