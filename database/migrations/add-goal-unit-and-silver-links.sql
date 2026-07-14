-- Let goals be tracked by weight (grams) as well as by money (amount).
-- Gold/silver goals track a target in grams; their target_amount / current_amount
-- columns hold grams instead of rupees when unit = 'grams'.
--
-- Also allow silver holdings to be linked to goals.
--
-- Safe to run after add-goal-investment-links.sql. Idempotent.

-- 1) Goal tracking unit ------------------------------------------------------
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'amount';

-- Constrain to the supported units (guard against re-running).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goals_unit_check'
  ) THEN
    ALTER TABLE goals
      ADD CONSTRAINT goals_unit_check CHECK (unit IN ('amount', 'grams'));
  END IF;
END $$;

-- 2) Allow linking silver holdings ------------------------------------------
ALTER TABLE goal_investment_links
  DROP CONSTRAINT IF EXISTS goal_investment_links_investment_type_check;

ALTER TABLE goal_investment_links
  ADD CONSTRAINT goal_investment_links_investment_type_check
  CHECK (investment_type IN ('mutual_fund', 'stock', 'gold', 'silver', 'other'));
