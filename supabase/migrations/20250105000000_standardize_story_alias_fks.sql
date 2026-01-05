-- Standardize all story_alias_id foreign key constraints
-- This migration ensures all foreign keys to story_aliases have explicit, consistent names
-- and are properly recognized by PostgREST's schema cache

-- Note: This migration is idempotent - it can be run multiple times safely

-- 1. Ensure ocs.story_alias_id has explicit FK (should already exist, but ensure it's correct)
DO $$
BEGIN
  -- Drop if exists to recreate with explicit name
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_ocs_story_alias_id'
  ) THEN
    ALTER TABLE ocs DROP CONSTRAINT fk_ocs_story_alias_id;
  END IF;
  
  -- Recreate with explicit name
  ALTER TABLE ocs
    ADD CONSTRAINT fk_ocs_story_alias_id
    FOREIGN KEY (story_alias_id)
    REFERENCES story_aliases(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists, that's fine
    NULL;
END $$;

-- 2. Ensure timeline_events.story_alias_id has explicit FK
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_timeline_events_story_alias_id'
  ) THEN
    ALTER TABLE timeline_events DROP CONSTRAINT fk_timeline_events_story_alias_id;
  END IF;
  
  ALTER TABLE timeline_events
    ADD CONSTRAINT fk_timeline_events_story_alias_id
    FOREIGN KEY (story_alias_id)
    REFERENCES story_aliases(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- 3. Ensure world_lore.story_alias_id has explicit FK
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_world_lore_story_alias_id'
  ) THEN
    ALTER TABLE world_lore DROP CONSTRAINT fk_world_lore_story_alias_id;
  END IF;
  
  ALTER TABLE world_lore
    ADD CONSTRAINT fk_world_lore_story_alias_id
    FOREIGN KEY (story_alias_id)
    REFERENCES story_aliases(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- 4. Ensure fanfics.story_alias_id has explicit FK (may have been created inline)
DO $$
BEGIN
  -- Check if FK exists without explicit name
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'fanfics'::regclass
    AND contype = 'f'
    AND confrelid = 'story_aliases'::regclass
    AND conname != 'fk_fanfics_story_alias_id'
  ) THEN
    -- Drop unnamed FK
    ALTER TABLE fanfics DROP CONSTRAINT IF EXISTS fanfics_story_alias_id_fkey;
  END IF;
  
  -- Add explicit FK if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_fanfics_story_alias_id'
  ) THEN
    ALTER TABLE fanfics
      ADD CONSTRAINT fk_fanfics_story_alias_id
      FOREIGN KEY (story_alias_id)
      REFERENCES story_aliases(id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- 5. Ensure timelines.story_alias_id has explicit FK (may have been created inline)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'timelines'::regclass
    AND contype = 'f'
    AND confrelid = 'story_aliases'::regclass
    AND conname != 'fk_timelines_story_alias_id'
  ) THEN
    ALTER TABLE timelines DROP CONSTRAINT IF EXISTS timelines_story_alias_id_fkey;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_timelines_story_alias_id'
  ) THEN
    ALTER TABLE timelines
      ADD CONSTRAINT fk_timelines_story_alias_id
      FOREIGN KEY (story_alias_id)
      REFERENCES story_aliases(id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- 6. Ensure world_story_data.story_alias_id has explicit FK (may have been created inline)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'world_story_data'::regclass
    AND contype = 'f'
    AND confrelid = 'story_aliases'::regclass
    AND conname != 'fk_world_story_data_story_alias_id'
  ) THEN
    ALTER TABLE world_story_data DROP CONSTRAINT IF EXISTS world_story_data_story_alias_id_fkey;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_world_story_data_story_alias_id'
  ) THEN
    ALTER TABLE world_story_data
      ADD CONSTRAINT fk_world_story_data_story_alias_id
      FOREIGN KEY (story_alias_id)
      REFERENCES story_aliases(id)
      ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- 7. Ensure world_races.story_alias_id has explicit FK (may have been created inline)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'world_races'::regclass
    AND contype = 'f'
    AND confrelid = 'story_aliases'::regclass
    AND conname != 'fk_world_races_story_alias_id'
  ) THEN
    ALTER TABLE world_races DROP CONSTRAINT IF EXISTS world_races_story_alias_id_fkey;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_world_races_story_alias_id'
  ) THEN
    ALTER TABLE world_races
      ADD CONSTRAINT fk_world_races_story_alias_id
      FOREIGN KEY (story_alias_id)
      REFERENCES story_aliases(id)
      ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Add comments to document the standardization
COMMENT ON CONSTRAINT fk_ocs_story_alias_id ON ocs IS 'Standardized FK to story_aliases - ensures PostgREST schema cache recognition';
COMMENT ON CONSTRAINT fk_timeline_events_story_alias_id ON timeline_events IS 'Standardized FK to story_aliases - ensures PostgREST schema cache recognition';
COMMENT ON CONSTRAINT fk_world_lore_story_alias_id ON world_lore IS 'Standardized FK to story_aliases - ensures PostgREST schema cache recognition';
COMMENT ON CONSTRAINT fk_fanfics_story_alias_id ON fanfics IS 'Standardized FK to story_aliases - ensures PostgREST schema cache recognition';
COMMENT ON CONSTRAINT fk_timelines_story_alias_id ON timelines IS 'Standardized FK to story_aliases - ensures PostgREST schema cache recognition';
COMMENT ON CONSTRAINT fk_world_story_data_story_alias_id ON world_story_data IS 'Standardized FK to story_aliases - ensures PostgREST schema cache recognition';
COMMENT ON CONSTRAINT fk_world_races_story_alias_id ON world_races IS 'Standardized FK to story_aliases - ensures PostgREST schema cache recognition';

