-- Add custom_name column to timeline_event_characters if it doesn't exist
ALTER TABLE timeline_event_characters 
ADD COLUMN IF NOT EXISTS custom_name TEXT;

-- Ensure oc_id is nullable (drop NOT NULL constraint if it exists)
-- This allows either oc_id OR custom_name to be provided
ALTER TABLE timeline_event_characters 
ALTER COLUMN oc_id DROP NOT NULL;

-- Ensure the CHECK constraint exists (either oc_id or custom_name must be provided)
ALTER TABLE timeline_event_characters 
DROP CONSTRAINT IF EXISTS timeline_event_characters_oc_or_name_check;

ALTER TABLE timeline_event_characters 
ADD CONSTRAINT timeline_event_characters_oc_or_name_check 
CHECK (oc_id IS NOT NULL OR custom_name IS NOT NULL);

COMMENT ON COLUMN timeline_event_characters.custom_name IS 'Custom character name for characters not in the database. Either oc_id or custom_name must be provided.';
COMMENT ON COLUMN timeline_event_characters.oc_id IS 'Reference to OC in database. Nullable if custom_name is used instead.';
