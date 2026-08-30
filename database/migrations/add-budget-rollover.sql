-- Lets a budget carry its unused (or overspent) amount into next month's
-- effective limit. Run this in Supabase Dashboard → SQL Editor.

ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS rollover_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN budgets.rollover_enabled IS
  'When true, this budget''s (limit_amount - spent_amount) from the prior month is added to next month''s effective limit.';
