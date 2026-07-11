-- Removes all database objects for the Workout, Tasks and Daily Tracker features.
-- Run this in the Supabase SQL editor. CASCADE also drops dependent RLS policies,
-- indexes, triggers, and foreign keys. This is irreversible — back up first if needed.

-- ── Daily Tracker ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS daily_habit_logs CASCADE;
DROP TABLE IF EXISTS goal_habits CASCADE;
DROP TABLE IF EXISTS daily_habits CASCADE;
DROP TABLE IF EXISTS daily_reflections CASCADE;
DROP TABLE IF EXISTS life_goal_progress_history CASCADE;
DROP TABLE IF EXISTS life_goals CASCADE;
DROP TABLE IF EXISTS life_journeys CASCADE;

-- ── Tasks ────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS task_lists CASCADE;

-- ── Workout ──────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS workout_log_sets CASCADE;
DROP TABLE IF EXISTS workout_log_exercises CASCADE;
DROP TABLE IF EXISTS workout_logs CASCADE;
DROP TABLE IF EXISTS workout_personal_records CASCADE;
DROP TABLE IF EXISTS workout_program_completions CASCADE;
DROP TABLE IF EXISTS workout_program_days CASCADE;
DROP TABLE IF EXISTS workout_programs CASCADE;
DROP TABLE IF EXISTS workout_routine_exercises CASCADE;
DROP TABLE IF EXISTS workout_routines CASCADE;
DROP TABLE IF EXISTS body_measurements CASCADE;
DROP TABLE IF EXISTS workout_exercises CASCADE;
