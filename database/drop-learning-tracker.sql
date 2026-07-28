-- Removes all database objects for the Learning tracker feature.
-- Run this in the Supabase SQL editor. CASCADE also drops dependent RLS policies,
-- indexes, triggers, and foreign keys. This is irreversible — back up first if needed.

DROP TABLE IF EXISTS learning_sessions CASCADE;
DROP TABLE IF EXISTS learning_topics CASCADE;
