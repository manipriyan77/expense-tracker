-- Add missing exercises: Pec Dec Fly, Reverse Pec Dec Fly, and common variants
-- Safe to run multiple times — uses DO $$ block to skip if already present

DO $$
DECLARE
  exercise_names TEXT[] := ARRAY[
    'Pec Dec Fly',
    'Reverse Pec Dec Fly',
    'Pec Deck Fly',
    'Reverse Pec Deck',
    'Seated Pec Dec',
    'Machine Fly',
    'Chest Fly Machine'
  ];
  muscle_groups TEXT[] := ARRAY[
    'Chest',
    'Shoulders',
    'Chest',
    'Shoulders',
    'Chest',
    'Chest',
    'Chest'
  ];
  equipment_list TEXT[] := ARRAY[
    'Machine',
    'Machine',
    'Machine',
    'Machine',
    'Machine',
    'Machine',
    'Machine'
  ];
  i INT;
BEGIN
  FOR i IN 1..array_length(exercise_names, 1) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM workout_exercises
      WHERE name = exercise_names[i] AND user_id IS NULL
    ) THEN
      INSERT INTO workout_exercises (user_id, name, muscle_group, equipment, is_custom)
      VALUES (NULL, exercise_names[i], muscle_groups[i], equipment_list[i], FALSE);
    END IF;
  END LOOP;
END $$;
