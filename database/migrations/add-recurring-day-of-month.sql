-- Add day_of_month for monthly recurring transactions (1-31, e.g. "every 15th")
ALTER TABLE recurring_patterns
ADD COLUMN IF NOT EXISTS day_of_month SMALLINT;

ALTER TABLE recurring_patterns
DROP CONSTRAINT IF EXISTS recurring_patterns_day_of_month_check;
ALTER TABLE recurring_patterns
ADD CONSTRAINT recurring_patterns_day_of_month_check
CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31));

COMMENT ON COLUMN recurring_patterns.day_of_month IS 'For monthly frequency: run on this day of each month (1-31). NULL means use the day of start_date.';
