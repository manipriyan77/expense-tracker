-- Create Budget Templates Table
-- Execute this in Supabase SQL Editor if the table doesn't exist yet

-- =====================================================
-- Create Budget Templates Table
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  categories JSONB NOT NULL, -- Array of {category, subtype, amount, period}
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Create Index for Budget Templates
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_budget_templates_user_id ON budget_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_templates_is_public ON budget_templates(is_public);

-- =====================================================
-- Enable Row Level Security
-- =====================================================
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Create RLS Policies for Budget Templates
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own budget templates" ON budget_templates;
CREATE POLICY "Users can view their own budget templates" ON budget_templates
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own budget templates" ON budget_templates;
CREATE POLICY "Users can insert their own budget templates" ON budget_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own budget templates" ON budget_templates;
CREATE POLICY "Users can update their own budget templates" ON budget_templates
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own budget templates" ON budget_templates;
CREATE POLICY "Users can delete their own budget templates" ON budget_templates
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Create Trigger for Updated At
-- =====================================================
DROP TRIGGER IF EXISTS update_budget_templates_updated_at ON budget_templates;
CREATE TRIGGER update_budget_templates_updated_at 
  BEFORE UPDATE ON budget_templates 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DONE! Budget Templates table is now ready
-- =====================================================
