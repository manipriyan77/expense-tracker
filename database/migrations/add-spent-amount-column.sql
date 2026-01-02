-- Add spent_amount column to budgets table
-- This column tracks how much has been spent against the budget

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS spent_amount DECIMAL(12,2) DEFAULT 0;

-- Update existing budgets to calculate spent_amount from transactions
UPDATE budgets b
SET spent_amount = (
  SELECT COALESCE(SUM(t.amount), 0)
  FROM transactions t
  WHERE t.budget_id = b.id 
    AND t.type = 'expense'
    AND t.user_id = b.user_id
);

-- Add comment explaining the column
COMMENT ON COLUMN budgets.spent_amount IS 'Total amount spent against this budget, automatically updated when transactions are added/deleted';

