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
  monthly_contribution DECIMAL(12, 2) DEFAULT 0,
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
-- Forex entries table
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
-- Gold holdings table (physical gold, ETF, sovereign gold bonds, etc.)
CREATE TABLE IF NOT EXISTS gold_holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('physical', 'etf', 'sov', 'other')),
  quantity_grams DECIMAL(12, 2) NOT NULL,
  purity DECIMAL(5, 2) NOT NULL,
  purchase_price_per_gram DECIMAL(12, 2) NOT NULL,
  current_price_per_gram DECIMAL(12, 2) NOT NULL,
  purchase_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_forex_entries_user_id ON forex_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_forex_entries_month ON forex_entries(month);
CREATE INDEX IF NOT EXISTS idx_gold_holdings_user_id ON gold_holdings(user_id);
-- Enable Row Level Security on all tables
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutual_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE forex_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_holdings ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY "Users can view their own forex entries" ON forex_entries FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own forex entries" ON forex_entries FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own forex entries" ON forex_entries FOR
UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own forex entries" ON forex_entries FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own gold holdings" ON gold_holdings FOR
  SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own gold holdings" ON gold_holdings FOR
  INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own gold holdings" ON gold_holdings FOR
  UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own gold holdings" ON gold_holdings FOR
  DELETE USING (auth.uid() = user_id);
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
CREATE TRIGGER update_forex_entries_updated_at BEFORE
UPDATE ON forex_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gold_holdings_updated_at BEFORE
UPDATE ON gold_holdings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- budget_id is optional for expense transactions (allows one-off expenses, Loan EMI, etc.)

-- ============================================================
-- COLUMN MIGRATIONS (safe to re-run on existing tables)
-- ============================================================
ALTER TABLE recurring_patterns ADD COLUMN IF NOT EXISTS linked_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL;

-- ============================================================
-- MISSING TABLES (migrations)
-- ============================================================

-- Recurring Patterns table
CREATE TABLE IF NOT EXISTS recurring_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  subtype TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  start_date DATE NOT NULL,
  end_date DATE,
  next_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  auto_create BOOLEAN DEFAULT false,
  linked_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Savings Challenges table
CREATE TABLE IF NOT EXISTS savings_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('52_week', 'daily_dollar', 'custom', 'percentage')),
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Savings Challenge Contributions table
CREATE TABLE IF NOT EXISTS savings_challenge_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES savings_challenges(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  contribution_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categorization Rules table
CREATE TABLE IF NOT EXISTS categorization_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  keyword TEXT NOT NULL,
  category TEXT NOT NULL,
  subtype TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, keyword)
);

-- Budget Templates table
CREATE TABLE IF NOT EXISTS budget_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  categories JSONB NOT NULL DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assets table (used by net-worth module)
CREATE TABLE IF NOT EXISTS assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'investment', 'property', 'vehicle', 'other')),
  value DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Liabilities table (shared by net-worth module and debt tracker)
CREATE TABLE IF NOT EXISTS liabilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit_card', 'loan', 'mortgage', 'other')),
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  original_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  interest_rate DECIMAL(6, 3) NOT NULL DEFAULT 0,
  minimum_payment DECIMAL(12, 2) NOT NULL DEFAULT 0,
  due_date DATE,
  term_months INTEGER,
  months_remaining INTEGER,
  currency TEXT DEFAULT 'INR',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Debt Payments table (references liabilities)
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  liability_id UUID REFERENCES liabilities(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  principal_amount DECIMAL(12, 2),
  interest_amount DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Net Worth Snapshots table (column "date" matches existing API and store)
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  total_assets DECIMAL(12, 2) NOT NULL,
  total_liabilities DECIMAL(12, 2) NOT NULL,
  net_worth DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_user_id ON recurring_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_next_date ON recurring_patterns(next_date);
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_is_active ON recurring_patterns(is_active);
CREATE INDEX IF NOT EXISTS idx_savings_challenges_user_id ON savings_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_challenge_contributions_challenge_id ON savings_challenge_contributions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_user_id ON categorization_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_templates_user_id ON budget_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_user_id ON liabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_liability_id ON debt_payments(liability_id);
CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_user_id ON net_worth_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_date ON net_worth_snapshots(date);

-- RLS for new tables
ALTER TABLE recurring_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_challenge_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recurring_patterns' AND policyname = 'Users can manage their recurring_patterns') THEN
    CREATE POLICY "Users can manage their recurring_patterns" ON recurring_patterns FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'savings_challenges' AND policyname = 'Users can manage their savings_challenges') THEN
    CREATE POLICY "Users can manage their savings_challenges" ON savings_challenges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'savings_challenge_contributions' AND policyname = 'Users can manage their savings_challenge_contributions') THEN
    CREATE POLICY "Users can manage their savings_challenge_contributions" ON savings_challenge_contributions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categorization_rules' AND policyname = 'Users can manage their categorization_rules') THEN
    CREATE POLICY "Users can manage their categorization_rules" ON categorization_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budget_templates' AND policyname = 'Users can manage their budget_templates') THEN
    CREATE POLICY "Users can manage their budget_templates" ON budget_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assets' AND policyname = 'Users can manage their assets') THEN
    CREATE POLICY "Users can manage their assets" ON assets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'liabilities' AND policyname = 'Users can manage their liabilities') THEN
    CREATE POLICY "Users can manage their liabilities" ON liabilities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'debt_payments' AND policyname = 'Users can manage their debt_payments') THEN
    CREATE POLICY "Users can manage their debt_payments" ON debt_payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'net_worth_snapshots' AND policyname = 'Users can manage their net_worth_snapshots') THEN
    CREATE POLICY "Users can manage their net_worth_snapshots" ON net_worth_snapshots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at triggers (CREATE OR REPLACE is idempotent in Postgres 14+)
CREATE OR REPLACE TRIGGER update_recurring_patterns_updated_at BEFORE UPDATE ON recurring_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_savings_challenges_updated_at BEFORE UPDATE ON savings_challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_budget_templates_updated_at BEFORE UPDATE ON budget_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_liabilities_updated_at BEFORE UPDATE ON liabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();