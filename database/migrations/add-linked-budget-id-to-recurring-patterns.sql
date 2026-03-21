-- Optional budget for recurring expense patterns; used when creating transactions from the pattern.
ALTER TABLE recurring_patterns
  ADD COLUMN IF NOT EXISTS linked_budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_patterns_linked_budget_id
  ON recurring_patterns(linked_budget_id)
  WHERE linked_budget_id IS NOT NULL;

COMMENT ON COLUMN recurring_patterns.linked_budget_id IS 'When set (expense patterns), generated transactions use this budget; falls back to category match if invalid';
