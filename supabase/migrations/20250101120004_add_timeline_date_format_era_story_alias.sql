-- Add date_format, era, and story_alias_id columns to timelines table
ALTER TABLE timelines
  ADD COLUMN IF NOT EXISTS date_format TEXT,
  ADD COLUMN IF NOT EXISTS era TEXT,
  ADD COLUMN IF NOT EXISTS story_alias_id UUID REFERENCES story_aliases(id) ON DELETE SET NULL;

-- Create index for story_alias_id for better query performance
CREATE INDEX IF NOT EXISTS idx_timelines_story_alias_id ON timelines(story_alias_id);

-- Add comment to explain the columns
COMMENT ON COLUMN timelines.date_format IS 'Optional: Custom date format notation (e.g., "[ μ ] – εγλ 1977")';
COMMENT ON COLUMN timelines.era IS 'Optional: Comma-separated era system for dates (e.g., "BE, SE" or "Before Era, Current Era, Future Era")';
COMMENT ON COLUMN timelines.story_alias_id IS 'Optional: Reference to story alias for this timeline';

