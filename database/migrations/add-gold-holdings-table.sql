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

CREATE INDEX IF NOT EXISTS idx_gold_holdings_user_id ON gold_holdings(user_id);

ALTER TABLE gold_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gold holdings" ON gold_holdings FOR
  SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own gold holdings" ON gold_holdings FOR
  INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own gold holdings" ON gold_holdings FOR
  UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own gold holdings" ON gold_holdings FOR
  DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_gold_holdings_updated_at
  BEFORE UPDATE ON gold_holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
