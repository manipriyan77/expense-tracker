-- Daily Life Tracker Schema
-- Run this in your Supabase SQL editor

-- Journey: the X/Y days challenge (e.g. 249 days to build the life I dream of)
CREATE TABLE IF NOT EXISTS life_journeys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Building the life I dream of',
  start_date DATE NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 249,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Life goals: Present value vs By Year End target (e.g. Salary: 1.4L → 2L, Weight: 56kg → 52kg)
CREATE TABLE IF NOT EXISTS life_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  journey_id UUID REFERENCES life_journeys(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  present_value TEXT NOT NULL DEFAULT '',
  target_value TEXT NOT NULL DEFAULT '',
  order_index INTEGER DEFAULT 0,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily habits: the recurring task checklist
CREATE TABLE IF NOT EXISTS daily_habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily habit logs: per-day completion records
CREATE TABLE IF NOT EXISTS daily_habit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES daily_habits(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  note TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, habit_id, log_date)
);

-- Daily reflections: per-day journal entry + mood
CREATE TABLE IF NOT EXISTS daily_reflections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reflection_date DATE NOT NULL,
  note TEXT DEFAULT '',
  mood TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, reflection_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_life_journeys_user_id ON life_journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_life_goals_journey_id ON life_goals(journey_id);
CREATE INDEX IF NOT EXISTS idx_life_goals_user_id ON life_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_habits_user_id ON daily_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_habit_logs_user_id ON daily_habit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_habit_logs_date ON daily_habit_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_daily_habit_logs_habit_id ON daily_habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_daily_reflections_user_id ON daily_reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_reflections_date ON daily_reflections(reflection_date);

-- RLS
ALTER TABLE life_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reflections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'life_journeys' AND policyname = 'Users can manage their life_journeys') THEN
    CREATE POLICY "Users can manage their life_journeys" ON life_journeys FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'life_goals' AND policyname = 'Users can manage their life_goals') THEN
    CREATE POLICY "Users can manage their life_goals" ON life_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_habits' AND policyname = 'Users can manage their daily_habits') THEN
    CREATE POLICY "Users can manage their daily_habits" ON daily_habits FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_habit_logs' AND policyname = 'Users can manage their daily_habit_logs') THEN
    CREATE POLICY "Users can manage their daily_habit_logs" ON daily_habit_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_reflections' AND policyname = 'Users can manage their daily_reflections') THEN
    CREATE POLICY "Users can manage their daily_reflections" ON daily_reflections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at triggers
CREATE OR REPLACE TRIGGER update_life_journeys_updated_at BEFORE UPDATE ON life_journeys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_life_goals_updated_at BEFORE UPDATE ON life_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_daily_habits_updated_at BEFORE UPDATE ON daily_habits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_daily_habit_logs_updated_at BEFORE UPDATE ON daily_habit_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_daily_reflections_updated_at BEFORE UPDATE ON daily_reflections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
