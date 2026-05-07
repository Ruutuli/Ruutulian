-- Align production DBs created before worlds.modular_fields was defined in 20250101000001_create_worlds.sql
ALTER TABLE worlds ADD COLUMN IF NOT EXISTS modular_fields JSONB;
