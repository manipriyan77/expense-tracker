-- Add image_url and wger_id to workout_exercises for exercise images
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS wger_base_id INTEGER;
