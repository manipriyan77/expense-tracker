-- Add optional planned monthly contribution per goal (used for chance calculation when no transaction-based savings)
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS monthly_contribution DECIMAL(12, 2) DEFAULT 0;
COMMENT ON COLUMN goals.monthly_contribution IS 'Planned amount to save per month toward this goal (optional). Used for goal completion chance when transaction-based monthly savings is not available.';