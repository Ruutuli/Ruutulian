-- Add age column to timeline_event_characters
ALTER TABLE timeline_event_characters 
ADD COLUMN IF NOT EXISTS age INTEGER;

COMMENT ON COLUMN timeline_event_characters.age IS 'Character age at the time of the event. Can be manually set or auto-calculated from date_of_birth and event date.';
