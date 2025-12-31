-- Add custom_name field and make oc_id nullable to support characters not in the database
ALTER TABLE timeline_event_characters
  ADD COLUMN IF NOT EXISTS custom_name TEXT,
  ALTER COLUMN oc_id DROP NOT NULL;

-- Add constraint: either oc_id or custom_name must be provided
ALTER TABLE timeline_event_characters
  ADD CONSTRAINT timeline_event_characters_oc_or_name_check 
  CHECK (oc_id IS NOT NULL OR custom_name IS NOT NULL);

-- Update unique constraint to allow multiple custom names per event
-- Drop the unique constraint on (timeline_event_id, oc_id) if it exists
-- This finds the constraint by checking the columns, not the name
DO $$ 
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find the unique constraint on (timeline_event_id, oc_id)
  SELECT conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND t.relname = 'timeline_event_characters'
    AND c.contype = 'u'
    AND array_length(c.conkey, 1) = 2
    AND EXISTS (
      SELECT 1 FROM pg_attribute a1
      WHERE a1.attrelid = c.conrelid
        AND a1.attnum = c.conkey[1]
        AND a1.attname = 'timeline_event_id'
    )
    AND EXISTS (
      SELECT 1 FROM pg_attribute a2
      WHERE a2.attrelid = c.conrelid
        AND a2.attnum = c.conkey[2]
        AND a2.attname = 'oc_id'
    )
  LIMIT 1;
  
  -- Drop the constraint if found
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE timeline_event_characters DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_timeline_event_characters_unique_oc 
  ON timeline_event_characters(timeline_event_id, oc_id) 
  WHERE oc_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN timeline_event_characters.custom_name IS 'Custom character name for characters not in the database. Either oc_id or custom_name must be provided.';
COMMENT ON COLUMN timeline_event_characters.oc_id IS 'Reference to OC in database. Nullable if custom_name is used instead.';

