-- Forex entries table for tracking deposits, P&L, and withdrawals with handler share
-- Execute this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS forex_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'pnl')),
  month TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  handler_share_percentage DECIMAL(5, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_forex_entries_user_id ON forex_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_forex_entries_month ON forex_entries(month);
ALTER TABLE forex_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own forex entries" ON forex_entries;
CREATE POLICY "Users can view their own forex entries" ON forex_entries FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own forex entries" ON forex_entries;
CREATE POLICY "Users can insert their own forex entries" ON forex_entries FOR
INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own forex entries" ON forex_entries;
CREATE POLICY "Users can update their own forex entries" ON forex_entries FOR
UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own forex entries" ON forex_entries;
CREATE POLICY "Users can delete their own forex entries" ON forex_entries FOR DELETE USING (auth.uid() = user_id);
DROP TRIGGER IF EXISTS update_forex_entries_updated_at ON forex_entries;
CREATE TRIGGER update_forex_entries_updated_at BEFORE
UPDATE ON forex_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();