-- Supabase Database Schema for Expense Tracker
-- NOTE: Configure JWT secret via Supabase dashboard/env, not via SQL here.
-- Create custom types (guarded to avoid duplicates when rerun)
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_type
  WHERE typname = 'transaction_type'
) THEN CREATE TYPE transaction_type AS ENUM ('income', 'expense');
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM pg_type
  WHERE typname = 'goal_status'
) THEN CREATE TYPE goal_status AS ENUM ('active', 'completed', 'overdue');
END IF;
END;
$$;
-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,
  target_date DATE NOT NULL,
  category TEXT DEFAULT 'General',
  status goal_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  subtype TEXT NOT NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE
  SET NULL,
    budget_id UUID REFERENCES budgets(id) ON DELETE
  SET NULL,
    date DATE NOT NULL,
    type transaction_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Mutual Funds table
CREATE TABLE IF NOT EXISTS mutual_funds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  invested_amount DECIMAL(12, 2) NOT NULL,
  current_value DECIMAL(12, 2) NOT NULL,
  units DECIMAL(10, 2) NOT NULL,
  nav DECIMAL(8, 2) NOT NULL,
  sub_category TEXT DEFAULT 'other',
  purchase_nav DECIMAL(10, 2) DEFAULT 0,
  purchase_date DATE NOT NULL,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Stocks table
CREATE TABLE IF NOT EXISTS stocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  shares DECIMAL(10, 2) NOT NULL,
  avg_purchase_price DECIMAL(8, 2) NOT NULL,
  current_price DECIMAL(8, 2) NOT NULL,
  invested_amount DECIMAL(12, 2) NOT NULL,
  current_value DECIMAL(12, 2) NOT NULL,
  purchase_date DATE NOT NULL,
  sector TEXT DEFAULT 'General',
  sub_sector TEXT DEFAULT 'other',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  subtype TEXT,
  limit_amount DECIMAL(12, 2) NOT NULL,
  period TEXT DEFAULT 'monthly',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category, subtype, period)
);
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_mutual_funds_user_id ON mutual_funds(user_id);
CREATE INDEX IF NOT EXISTS idx_stocks_user_id ON stocks(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
-- Enable Row Level Security on all tables
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutual_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
-- Create RLS policies (users can only access their own data)
CREATE POLICY "Users can view their own goals" ON goals FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own goals" ON goals FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals" ON goals FOR
UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals" ON goals FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own transactions" ON transactions FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON transactions FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON transactions FOR
UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own mutual funds" ON mutual_funds FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own mutual funds" ON mutual_funds FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own mutual funds" ON mutual_funds FOR
UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own mutual funds" ON mutual_funds FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own stocks" ON stocks FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own stocks" ON stocks FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stocks" ON stocks FOR
UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stocks" ON stocks FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own budgets" ON budgets FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own budgets" ON budgets FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budgets" ON budgets FOR
UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budgets" ON budgets FOR DELETE USING (auth.uid() = user_id);
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ language 'plpgsql';
-- Create triggers for updated_at
CREATE TRIGGER update_goals_updated_at BEFORE
UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE
UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mutual_funds_updated_at BEFORE
UPDATE ON mutual_funds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stocks_updated_at BEFORE
UPDATE ON stocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE
UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Add constraint to ensure budget_id is mandatory for expense transactions
ALTER TABLE transactions
ADD CONSTRAINT transactions_expense_budget_check CHECK (
    type = 'income'
    OR (
      type = 'expense'
      AND budget_id IS NOT NULL
    )
  );