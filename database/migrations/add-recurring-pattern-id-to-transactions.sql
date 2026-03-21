-- Link transactions created from a recurring pattern (manual "mark complete" or future automation)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS recurring_pattern_id UUID REFERENCES recurring_patterns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_recurring_pattern_id
  ON transactions(recurring_pattern_id)
  WHERE recurring_pattern_id IS NOT NULL;

COMMENT ON COLUMN transactions.recurring_pattern_id IS 'Set when this row fulfills a recurring pattern occurrence';
