-- Add custom_name field and make oc_id nullable to support characters not in the database
ALTER TABLE timeline_event_characters
  ADD COLUMN IF NOT EXISTS custom_name TEXT,
  ALTER COLUMN oc_id DROP NOT NULL;

-- Add constraint: either oc_id or custom_name must be provided
ALTER TABLE timeline_event_characters
  ADD CONSTRAINT timeline_event_characters_oc_or_name_check 
  CHECK (oc_id IS NOT NULL OR custom_name IS NOT NULL);

-- Update unique constraint to allow multiple custom names per event
DROP INDEX IF EXISTS timeline_event_characters_timeline_event_id_oc_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_timeline_event_characters_unique_oc 
  ON timeline_event_characters(timeline_event_id, oc_id) 
  WHERE oc_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN timeline_event_characters.custom_name IS 'Custom character name for characters not in the database. Either oc_id or custom_name must be provided.';
COMMENT ON COLUMN timeline_event_characters.oc_id IS 'Reference to OC in database. Nullable if custom_name is used instead.';

