-- Advanced journal fields for daily_reflections

ALTER TABLE daily_reflections ADD COLUMN IF NOT EXISTS wins TEXT DEFAULT '';
ALTER TABLE daily_reflections ADD COLUMN IF NOT EXISTS gratitude TEXT DEFAULT '';
ALTER TABLE daily_reflections ADD COLUMN IF NOT EXISTS intentions TEXT DEFAULT '';
ALTER TABLE daily_reflections ADD COLUMN IF NOT EXISTS energy_level SMALLINT DEFAULT 0;
ALTER TABLE daily_reflections ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '';
