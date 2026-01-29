-- Add index on custom_name for faster lookups when fetching previous ages
-- Using LOWER() for case-insensitive matching support
CREATE INDEX IF NOT EXISTS idx_timeline_event_characters_custom_name_lower 
ON timeline_event_characters(LOWER(custom_name)) 
WHERE custom_name IS NOT NULL;

-- Also add a regular index on custom_name for general queries
CREATE INDEX IF NOT EXISTS idx_timeline_event_characters_custom_name 
ON timeline_event_characters(custom_name) 
WHERE custom_name IS NOT NULL;

-- Add index on age for queries filtering by age
CREATE INDEX IF NOT EXISTS idx_timeline_event_characters_age 
ON timeline_event_characters(age) 
WHERE age IS NOT NULL;
