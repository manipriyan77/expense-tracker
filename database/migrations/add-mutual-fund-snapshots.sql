-- Monthly snapshots for mutual funds (built from CSV uploads).
-- Each time a holdings CSV is uploaded for a given month, one row per fund is stored
-- with that month's totals. Over successive monthly uploads this builds a time-series
-- used to chart how units / invested / value grow over time, per fund and overall.

CREATE TABLE IF NOT EXISTS mutual_fund_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fund_id UUID REFERENCES mutual_funds(id) ON DELETE CASCADE NOT NULL,
  snapshot_month DATE NOT NULL,        -- normalized to the 1st of the month
  units DECIMAL(14, 4) NOT NULL DEFAULT 0,
  invested_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  current_value DECIMAL(14, 2) NOT NULL DEFAULT 0,
  nav DECIMAL(14, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (fund_id, snapshot_month)     -- re-uploading a month overwrites it
);

CREATE INDEX IF NOT EXISTS idx_mfs_fund_id ON mutual_fund_snapshots(fund_id);
CREATE INDEX IF NOT EXISTS idx_mfs_user_id ON mutual_fund_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_mfs_month ON mutual_fund_snapshots(snapshot_month);

ALTER TABLE mutual_fund_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mf snapshots" ON mutual_fund_snapshots FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own mf snapshots" ON mutual_fund_snapshots FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own mf snapshots" ON mutual_fund_snapshots FOR
UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own mf snapshots" ON mutual_fund_snapshots FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_mutual_fund_snapshots_updated_at BEFORE
UPDATE ON mutual_fund_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
