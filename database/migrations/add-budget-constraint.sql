-- Migration: Add constraint to ensure budget_id is mandatory for expense transactions
-- Date: 2026-01-02

-- Step 1: Check existing expense transactions without budget_id
-- SELECT COUNT(*) FROM transactions WHERE type = 'expense' AND budget_id IS NULL;

-- Step 2: Option A - Delete expense transactions without budget_id (if acceptable)
-- DELETE FROM transactions WHERE type = 'expense' AND budget_id IS NULL;

-- Step 2: Option B - Set existing expense transactions to a default budget
-- First, create a default "Uncategorized" budget if it doesn't exist
-- INSERT INTO budgets (user_id, category, subtype, limit_amount, period)
-- SELECT DISTINCT user_id, 'Other', 'Uncategorized', 10000.00, 'monthly'
-- FROM transactions
-- WHERE type = 'expense' AND budget_id IS NULL
-- ON CONFLICT DO NOTHING;

-- Then update transactions to use this default budget
-- UPDATE transactions t
-- SET budget_id = b.id
-- FROM budgets b
-- WHERE t.type = 'expense'
--   AND t.budget_id IS NULL
--   AND t.user_id = b.user_id
--   AND b.category = 'Other'
--   AND b.subtype = 'Uncategorized';

-- Step 3: Add constraint to enforce budget_id for expense transactions
-- Only run this after handling existing data above
-- ALTER TABLE transactions ADD CONSTRAINT transactions_expense_budget_check
--   CHECK (type = 'income' OR (type = 'expense' AND budget_id IS NOT NULL));
