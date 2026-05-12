-- Phase 3 Enhancements: Habits, Goals, Tasks, Journal

-- ── 1. Habit Enhancements ─────────────────────────────────────────────────────

-- Archive support (soft-delete alternative to is_active)
ALTER TABLE daily_habits ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Frequency support: daily, weekdays, custom
ALTER TABLE daily_habits ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'daily';

-- Custom frequency days: array of day numbers [0=Mon … 6=Sun]
ALTER TABLE daily_habits ADD COLUMN IF NOT EXISTS frequency_days JSONB DEFAULT NULL;

-- ── 2. Goal-Habits Junction Table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS goal_habits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id      UUID NOT NULL REFERENCES life_goals(id) ON DELETE CASCADE,
  habit_id     UUID NOT NULL REFERENCES daily_habits(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(goal_id, habit_id)
);

ALTER TABLE goal_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goal_habits"
  ON goal_habits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. Task Enhancements ──────────────────────────────────────────────────────

-- Subtasks: one level of nesting
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- Recurrence type: daily | weekdays | weekly | monthly | null (no recurrence)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT NULL;

-- Custom recurrence days [0=Mon … 6=Sun], used when recurrence_type = 'custom'
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_days JSONB DEFAULT NULL;

-- Points back to the template/root task that spawned this instance
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
