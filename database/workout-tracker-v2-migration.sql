-- Workout Tracker v2 Migration
-- Adds: personal records, body measurements, exercise notes, rest timer preference

-- Personal Records per exercise per user
CREATE TABLE IF NOT EXISTS workout_personal_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE NOT NULL,
  exercise_name TEXT NOT NULL,
  record_type TEXT NOT NULL,  -- 'heaviest_weight' | 'max_reps' | 'estimated_1rm' | 'max_volume_set'
  value DECIMAL(10, 2) NOT NULL,
  reps INTEGER,               -- reps at that weight (for heaviest_weight and estimated_1rm)
  weight DECIMAL(8, 2),       -- weight at that reps (for max_reps)
  workout_log_id UUID REFERENCES workout_logs(id) ON DELETE SET NULL,
  achieved_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Body measurements / weight log
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  body_weight DECIMAL(6, 2),  -- kg
  body_fat_pct DECIMAL(5, 2),
  chest_cm DECIMAL(6, 2),
  waist_cm DECIMAL(6, 2),
  hips_cm DECIMAL(6, 2),
  left_arm_cm DECIMAL(6, 2),
  right_arm_cm DECIMAL(6, 2),
  left_thigh_cm DECIMAL(6, 2),
  right_thigh_cm DECIMAL(6, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE workout_personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own PRs" ON workout_personal_records
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own body measurements" ON body_measurements
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Index for fast exercise PR lookup
CREATE INDEX IF NOT EXISTS idx_prs_user_exercise ON workout_personal_records(user_id, exercise_id, record_type);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, date DESC);
