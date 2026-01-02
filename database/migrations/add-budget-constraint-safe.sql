-- Safe Migration: Add constraint to ensure budget_id is mandatory for expense transactions
-- This script safely handles existing data before adding the constraint

-- ============================================================================
-- STEP 1: Check existing data (run this first to see what needs to be handled)
-- ============================================================================
SELECT
    COUNT(*) as expense_without_budget_count,
    user_id
FROM transactions
WHERE type = 'expense' AND budget_id IS NULL
GROUP BY user_id;

-- ============================================================================
-- STEP 2: Choose ONE of the following options to handle existing data
-- ============================================================================

-- OPTION A: Delete expense transactions without budget (simple but loses data)
-- Uncomment the line below if you want to delete these transactions:
-- DELETE FROM transactions WHERE type = 'expense' AND budget_id IS NULL;

-- OPTION B: Create a default "Uncategorized" budget and assign it (recommended)
-- This preserves your existing transaction data

-- B.1: Create default budgets for each user who has expense transactions without budget
INSERT INTO budgets (user_id, category, subtype, limit_amount, period)
SELECT DISTINCT
    user_id,
    'Other' as category,
    'Uncategorized' as subtype,
    999999.00 as limit_amount,  -- High limit for uncategorized
    'monthly' as period
FROM transactions
WHERE type = 'expense' AND budget_id IS NULL
ON CONFLICT (user_id, category, subtype, period) DO NOTHING;

-- B.2: Update transactions to use the default budget
UPDATE transactions t
SET budget_id = b.id
FROM budgets b
WHERE t.type = 'expense'
  AND t.budget_id IS NULL
  AND t.user_id = b.user_id
  AND b.category = 'Other'
  AND b.subtype = 'Uncategorized';

-- ============================================================================
-- STEP 3: Verify all expense transactions now have a budget
-- ============================================================================
SELECT COUNT(*) as remaining_expenses_without_budget
FROM transactions
WHERE type = 'expense' AND budget_id IS NULL;
-- This should return 0

-- ============================================================================
-- STEP 4: Add the constraint (only after Step 3 returns 0)
-- ============================================================================
ALTER TABLE transactions ADD CONSTRAINT transactions_expense_budget_check
  CHECK (type = 'income' OR (type = 'expense' AND budget_id IS NOT NULL));
