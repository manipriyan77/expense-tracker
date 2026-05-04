-- Goal notes field
ALTER TABLE life_goals ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
