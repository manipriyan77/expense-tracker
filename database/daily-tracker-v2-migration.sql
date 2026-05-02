-- Daily Tracker v2 migration — run in Supabase SQL editor
-- Adds category to daily_habits for grouping
ALTER TABLE daily_habits
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';