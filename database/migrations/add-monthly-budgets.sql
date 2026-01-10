-- Add month and year columns to budgets table for monthly tracking
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS month INTEGER,
ADD COLUMN IF NOT EXISTS year INTEGER;

-- Add spent_amount column to track spending for each month
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS spent_amount DECIMAL(12,2) DEFAULT 0;

-- Update existing budgets to have current month/year
UPDATE budgets 
SET 
  month = EXTRACT(MONTH FROM CURRENT_DATE),
  year = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE month IS NULL OR year IS NULL;

-- Drop old unique constraint
ALTER TABLE budgets 
DROP CONSTRAINT IF EXISTS budgets_user_id_category_subtype_period_key;

-- Add new unique constraint including month and year
ALTER TABLE budgets 
ADD CONSTRAINT budgets_user_id_category_subtype_month_year_key 
UNIQUE(user_id, category, subtype, month, year);

-- Create index for faster queries by month/year
CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON budgets(user_id, year, month);

-- Function to automatically create next month's budgets based on current month
CREATE OR REPLACE FUNCTION create_next_month_budgets(p_user_id UUID, p_target_month INTEGER, p_target_year INTEGER)
RETURNS void AS $$
DECLARE
  budget_record RECORD;
  prev_month INTEGER;
  prev_year INTEGER;
BEGIN
  -- Calculate previous month
  IF p_target_month = 1 THEN
    prev_month := 12;
    prev_year := p_target_year - 1;
  ELSE
    prev_month := p_target_month - 1;
    prev_year := p_target_year;
  END IF;

  -- Copy budgets from previous month to target month
  FOR budget_record IN 
    SELECT category, subtype, limit_amount, period
    FROM budgets
    WHERE user_id = p_user_id
      AND month = prev_month
      AND year = prev_year
  LOOP
    -- Insert into target month if doesn't exist
    INSERT INTO budgets (user_id, category, subtype, limit_amount, period, month, year, spent_amount)
    VALUES (
      p_user_id,
      budget_record.category,
      budget_record.subtype,
      budget_record.limit_amount,
      budget_record.period,
      p_target_month,
      p_target_year,
      0
    )
    ON CONFLICT (user_id, category, subtype, month, year) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update budget spent_amount when a transaction is added/updated/deleted
CREATE OR REPLACE FUNCTION update_budget_spent_amount()
RETURNS TRIGGER AS $$
DECLARE
  target_month INTEGER;
  target_year INTEGER;
BEGIN
  -- Determine month and year from transaction date
  IF TG_OP = 'DELETE' THEN
    target_month := EXTRACT(MONTH FROM OLD.date);
    target_year := EXTRACT(YEAR FROM OLD.date);
    
    -- Update budgets by recalculating spent amount for that month
    UPDATE budgets
    SET spent_amount = (
      SELECT COALESCE(SUM(t.amount), 0)
      FROM transactions t
      WHERE t.user_id = budgets.user_id
        AND t.type = 'expense'
        AND t.category = budgets.category
        AND (budgets.subtype IS NULL OR t.subtype = budgets.subtype)
        AND EXTRACT(MONTH FROM t.date) = budgets.month
        AND EXTRACT(YEAR FROM t.date) = budgets.year
    )
    WHERE user_id = OLD.user_id
      AND month = target_month
      AND year = target_year
      AND category = OLD.category;
      
  ELSE
    target_month := EXTRACT(MONTH FROM NEW.date);
    target_year := EXTRACT(YEAR FROM NEW.date);
    
    -- Update budgets by recalculating spent amount for that month
    UPDATE budgets
    SET spent_amount = (
      SELECT COALESCE(SUM(t.amount), 0)
      FROM transactions t
      WHERE t.user_id = budgets.user_id
        AND t.type = 'expense'
        AND t.category = budgets.category
        AND (budgets.subtype IS NULL OR t.subtype = budgets.subtype)
        AND EXTRACT(MONTH FROM t.date) = budgets.month
        AND EXTRACT(YEAR FROM t.date) = budgets.year
    )
    WHERE user_id = NEW.user_id
      AND month = target_month
      AND year = target_year
      AND category = NEW.category;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update budget spent amounts
DROP TRIGGER IF EXISTS trigger_update_budget_spent ON transactions;
CREATE TRIGGER trigger_update_budget_spent
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_budget_spent_amount();
