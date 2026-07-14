-- Link goals to investment holdings (mutual funds, stocks, gold, other investments)
-- so a goal's progress is tracked automatically from the live value of the
-- mapped holdings. Mapping is exclusive: a holding belongs to at most one goal
-- (enforced by the UNIQUE constraint below).
CREATE TABLE IF NOT EXISTS goal_investment_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  -- polymorphic reference to a holding in one of the investment tables
  investment_type TEXT NOT NULL CHECK (
    investment_type IN ('mutual_fund', 'stock', 'gold', 'silver', 'other')
  ),
  investment_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- a holding can  back only one goal per user (exclusive mapping)
  CONSTRAINT goal_investment_links_unique_holding UNIQUE (user_id, investment_type, investment_id)
);
CREATE INDEX IF NOT EXISTS idx_goal_investment_links_user_id ON goal_investment_links(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_investment_links_goal_id ON goal_investment_links(goal_id);
ALTER TABLE goal_investment_links ENABLE ROW LEVEL SECURITY;

-- Idempotent: drop-then-create so this migration is safe to re-run.
DROP POLICY IF EXISTS "Users can view their own goal investment links" ON goal_investment_links;
CREATE POLICY "Users can view their own goal investment links" ON goal_investment_links FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own goal investment links" ON goal_investment_links;
CREATE POLICY "Users can insert their own goal investment links" ON goal_investment_links FOR
INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own goal investment links" ON goal_investment_links;
CREATE POLICY "Users can update their own goal investment links" ON goal_investment_links FOR
UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own goal investment links" ON goal_investment_links;
CREATE POLICY "Users can delete their own goal investment links" ON goal_investment_links FOR DELETE USING (auth.uid() = user_id);