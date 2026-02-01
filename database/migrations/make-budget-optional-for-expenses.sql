-- Make budget_id optional for expense transactions
-- This allows adding expenses without linking to a budget (e.g. Loan EMI, one-off expenses)

-- Drop the constraint that required budget_id for every expense
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_expense_budget_check;

-- Optional: Add a comment for documentation
COMMENT ON COLUMN transactions.budget_id IS 'Optional. Link expense to a budget for tracking; null allowed for uncategorized or one-off expenses.';
