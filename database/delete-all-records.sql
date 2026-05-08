-- Delete all records from all tables (preserves table structure)
-- Run this in Supabase Dashboard → SQL Editor

-- Disable triggers temporarily to avoid FK issues
SET session_replication_role = replica;

DELETE FROM life_goal_progress_history;
DELETE FROM savings_challenge_contributions;
DELETE FROM savings_challenges;
DELETE FROM debt_payments;
DELETE FROM liabilities;
DELETE FROM net_worth_snapshots;
DELETE FROM recurring_patterns;
DELETE FROM categorization_rules;
DELETE FROM budget_templates;
DELETE FROM daily_habit_logs;
DELETE FROM daily_habits;
DELETE FROM daily_reflections;
DELETE FROM life_journeys;
DELETE FROM life_goals;
DELETE FROM tasks;
DELETE FROM task_lists;
DELETE FROM forex_entries;
DELETE FROM gold_holdings;
DELETE FROM stocks;
DELETE FROM mutual_funds;
DELETE FROM assets;
DELETE FROM transactions;
DELETE FROM budgets;
DELETE FROM goals;

-- Re-enable triggers
SET session_replication_role = DEFAULT;
