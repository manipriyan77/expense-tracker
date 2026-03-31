-- Add linked_liability_id column to recurring_patterns table
ALTER TABLE recurring_patterns
  ADD COLUMN IF NOT EXISTS linked_liability_id UUID REFERENCES liabilities(id) ON DELETE SET NULL;
