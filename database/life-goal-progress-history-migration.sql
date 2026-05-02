-- Progress history for life goals
-- Each time the user updates a goal's present_value, a snapshot is saved here.

CREATE TABLE IF NOT EXISTS life_goal_progress_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES life_goals(id) ON DELETE CASCADE NOT NULL,
  value TEXT NOT NULL,
  note TEXT DEFAULT '',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_progress_history_goal_id ON life_goal_progress_history(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_history_user_id ON life_goal_progress_history(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_history_recorded_at ON life_goal_progress_history(recorded_at);

ALTER TABLE life_goal_progress_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'life_goal_progress_history'
    AND policyname = 'Users can manage their goal progress history'
  ) THEN
    CREATE POLICY "Users can manage their goal progress history"
      ON life_goal_progress_history FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Backfill: seed one history entry per existing goal using its current present_value
-- so goals already in use have at least a starting data point
INSERT INTO life_goal_progress_history (user_id, goal_id, value, recorded_at)
SELECT user_id, id, present_value, created_at
FROM life_goals
WHERE present_value <> ''
ON CONFLICT DO NOTHING;
