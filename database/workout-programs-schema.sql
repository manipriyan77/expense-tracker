-- Workout Programs Schema
-- A program is a weekly repeating schedule assigning routines to days of the week

CREATE TABLE IF NOT EXISTS workout_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  started_at DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Each row = one day slot in the program (1=Mon ... 7=Sun)
CREATE TABLE IF NOT EXISTS workout_program_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES workout_programs(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Mon, 7=Sun
  routine_id UUID REFERENCES workout_routines(id) ON DELETE SET NULL,  -- NULL = rest day
  label TEXT,  -- override display name e.g. "Push A", "Rest"
  order_index INTEGER NOT NULL DEFAULT 0,
  UNIQUE(program_id, day_of_week)
);

-- Track which program days have been completed (links a log to a program day)
CREATE TABLE IF NOT EXISTS workout_program_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES workout_programs(id) ON DELETE CASCADE NOT NULL,
  program_day_id UUID REFERENCES workout_program_days(id) ON DELETE CASCADE NOT NULL,
  workout_log_id UUID REFERENCES workout_logs(id) ON DELETE SET NULL,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, program_day_id, completed_date)
);

ALTER TABLE workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_program_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_program_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own programs" ON workout_programs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage program days via program ownership" ON workout_program_days
  FOR ALL USING (
    program_id IN (SELECT id FROM workout_programs WHERE user_id = auth.uid())
  );

CREATE POLICY "Users manage own completions" ON workout_program_completions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Only one active program per user (enforce in app logic, not DB constraint)
CREATE INDEX IF NOT EXISTS idx_programs_user_active ON workout_programs(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_program_completions_user ON workout_program_completions(user_id, completed_date DESC);
