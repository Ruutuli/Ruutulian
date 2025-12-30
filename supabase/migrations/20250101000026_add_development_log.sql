-- Create character_development_log table
CREATE TABLE IF NOT EXISTS character_development_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oc_id UUID NOT NULL REFERENCES ocs(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL, -- e.g., 'personality', 'appearance', 'backstory', 'stats', 'other'
  notes TEXT NOT NULL, -- Description of the change
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_character_development_log_oc_id ON character_development_log(oc_id);
CREATE INDEX IF NOT EXISTS idx_character_development_log_created_at ON character_development_log(oc_id, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE character_development_log IS 'Tracks changes and evolution of characters over time';
COMMENT ON COLUMN character_development_log.change_type IS 'Type of change (personality, appearance, backstory, stats, other)';
COMMENT ON COLUMN character_development_log.notes IS 'Description of what changed and why';

