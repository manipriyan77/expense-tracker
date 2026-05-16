-- Workout Tracker Schema

-- Exercise library (seeded with common exercises + user can add custom ones)
CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = default/global exercise
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL DEFAULT 'Other',  -- Chest, Back, Legs, Shoulders, Arms, Core, Cardio, Other
  equipment TEXT NOT NULL DEFAULT 'None',      -- Barbell, Dumbbell, Machine, Cable, Bodyweight, None
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout routines (templates)
CREATE TABLE IF NOT EXISTS workout_routines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercises within a routine (template sets)
CREATE TABLE IF NOT EXISTS workout_routine_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id UUID REFERENCES workout_routines(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE NOT NULL,
  exercise_name TEXT NOT NULL,  -- denormalized for display
  default_sets INTEGER NOT NULL DEFAULT 3,
  default_reps INTEGER NOT NULL DEFAULT 10,
  default_weight DECIMAL(8, 2),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Logged workouts
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  routine_id UUID REFERENCES workout_routines(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercises performed in a logged workout
CREATE TABLE IF NOT EXISTS workout_log_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_log_id UUID REFERENCES workout_logs(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES workout_exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual sets in a logged workout exercise
CREATE TABLE IF NOT EXISTS workout_log_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_log_exercise_id UUID REFERENCES workout_log_exercises(id) ON DELETE CASCADE NOT NULL,
  set_number INTEGER NOT NULL DEFAULT 1,
  weight DECIMAL(8, 2),
  reps INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_log_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_log_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own and default exercises" ON workout_exercises
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can insert their own exercises" ON workout_exercises
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own exercises" ON workout_exercises
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own exercises" ON workout_exercises
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own routines" ON workout_routines
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage routine exercises via routine ownership" ON workout_routine_exercises
  FOR ALL USING (
    routine_id IN (SELECT id FROM workout_routines WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage their own workout logs" ON workout_logs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage log exercises via log ownership" ON workout_log_exercises
  FOR ALL USING (
    workout_log_id IN (SELECT id FROM workout_logs WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage log sets via log ownership" ON workout_log_sets
  FOR ALL USING (
    workout_log_exercise_id IN (
      SELECT wle.id FROM workout_log_exercises wle
      JOIN workout_logs wl ON wl.id = wle.workout_log_id
      WHERE wl.user_id = auth.uid()
    )
  );

-- Seed default exercises (190+ exercises across all muscle groups)
-- Run workout-exercises-expanded.sql for the full list, or run this schema fresh which includes it inline via that file.
