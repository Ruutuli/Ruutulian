-- Create story_snippets table
CREATE TABLE IF NOT EXISTS story_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oc_id UUID NOT NULL REFERENCES ocs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  snippet_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_story_snippets_oc_id ON story_snippets(oc_id);

-- Add comments for documentation
COMMENT ON TABLE story_snippets IS 'Stores story excerpts and snippets linked to characters';
COMMENT ON COLUMN story_snippets.oc_id IS 'Reference to the character';
COMMENT ON COLUMN story_snippets.title IS 'Title or description of the snippet';
COMMENT ON COLUMN story_snippets.snippet_text IS 'The story excerpt text';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_story_snippets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_story_snippets_updated_at
  BEFORE UPDATE ON story_snippets
  FOR EACH ROW
  EXECUTE FUNCTION update_story_snippets_updated_at();

