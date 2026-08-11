-- Adds a per-month contribution amount alongside the value snapshot, so users
-- can record how much they put in that month (not just the resulting value).
-- Idempotent — safe to re-run.

ALTER TABLE other_investment_snapshots
  ADD COLUMN IF NOT EXISTS contribution_amount DECIMAL(14, 2) NOT NULL DEFAULT 0;
