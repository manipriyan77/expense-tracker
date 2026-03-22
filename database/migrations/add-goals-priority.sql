-- Add priority field to goals table
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium'
  CHECK (priority IN ('high', 'medium', 'low'));

COMMENT ON COLUMN goals.priority IS 'Goal priority: high, medium, or low. Used to help users understand which goals to focus on first.';
