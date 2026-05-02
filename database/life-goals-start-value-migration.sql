-- Add start_value to life_goals
-- start_value stores the original baseline so reduction goals (e.g. debt 27L → 18L)
-- can track progress correctly: pct = (start - current) / (start - target)

ALTER TABLE life_goals ADD COLUMN IF NOT EXISTS start_value TEXT DEFAULT '';

-- Backfill existing goals: their present_value IS their starting point
-- (best we can do without history)
UPDATE life_goals SET start_value = present_value WHERE start_value = '';
