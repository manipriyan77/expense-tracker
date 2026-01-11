# Quick Fix: Budget Templates Not Working

## The Problem
❌ You can't create new budget templates

## The Reason
The `budget_templates` table doesn't exist in your Supabase database yet.

## The Fix (2 Minutes)

### Option 1: Run the Quick Fix SQL (Recommended)

1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy this SQL and run it:

```sql
-- Create Budget Templates Table
CREATE TABLE IF NOT EXISTS budget_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  categories JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_budget_templates_user_id ON budget_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_templates_is_public ON budget_templates(is_public);

-- Enable RLS
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;

-- Create Policies
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

-- Create Trigger
DROP TRIGGER IF EXISTS update_budget_templates_updated_at ON budget_templates;
CREATE TRIGGER update_budget_templates_updated_at 
  BEFORE UPDATE ON budget_templates 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

4. Click "RUN" (bottom right)
5. Refresh your app
6. Try creating a budget template again

### Option 2: Use the Migration File

1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy the entire contents of `database/migrations/create-budget-templates-table.sql`
4. Click "RUN"
5. Refresh your app

## Verify It Worked

Run this query in Supabase SQL Editor:

```sql
SELECT * FROM budget_templates;
```

You should see an empty table (no error).

## Now You Can:

✅ Create custom budget templates from your current budgets
✅ Apply system templates (Student, Family, Freelancer)
✅ Edit and delete templates
✅ Export templates as JSON

---

**Need more help?** See `BUDGET_TEMPLATES_FIX.md` for detailed troubleshooting.
