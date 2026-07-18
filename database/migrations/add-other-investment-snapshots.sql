-- Monthly value history for "other investments" (PPF, EPF, NPS, FD, RD, LIC, etc.).
-- Instead of overwriting current_value on every update, each update records a
-- snapshot for that month. Over time this builds a time-series used to chart how
-- each investment grows. Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS other_investment_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  investment_id UUID REFERENCES other_investments(id) ON DELETE CASCADE NOT NULL,
  snapshot_month DATE NOT NULL,        -- normalized to the 1st of the month
  current_value DECIMAL(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (investment_id, snapshot_month)  -- re-recording a month overwrites it
);

CREATE INDEX IF NOT EXISTS idx_ois_investment_id ON other_investment_snapshots(investment_id);
CREATE INDEX IF NOT EXISTS idx_ois_user_id ON other_investment_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_ois_month ON other_investment_snapshots(snapshot_month);

ALTER TABLE other_investment_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own oi snapshots" ON other_investment_snapshots;
CREATE POLICY "Users can view their own oi snapshots" ON other_investment_snapshots FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own oi snapshots" ON other_investment_snapshots;
CREATE POLICY "Users can insert their own oi snapshots" ON other_investment_snapshots FOR
INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own oi snapshots" ON other_investment_snapshots;
CREATE POLICY "Users can update their own oi snapshots" ON other_investment_snapshots FOR
UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own oi snapshots" ON other_investment_snapshots;
CREATE POLICY "Users can delete their own oi snapshots" ON other_investment_snapshots FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_other_investment_snapshots_updated_at ON other_investment_snapshots;
CREATE TRIGGER update_other_investment_snapshots_updated_at BEFORE
UPDATE ON other_investment_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
