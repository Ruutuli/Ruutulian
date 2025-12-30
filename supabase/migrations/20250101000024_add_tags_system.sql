-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT, -- Optional color for tag display
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create character_tags junction table (many-to-many)
CREATE TABLE IF NOT EXISTS character_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oc_id UUID NOT NULL REFERENCES ocs(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(oc_id, tag_id) -- Prevent duplicate tag assignments
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_character_tags_oc_id ON character_tags(oc_id);
CREATE INDEX IF NOT EXISTS idx_character_tags_tag_id ON character_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Add comments for documentation
COMMENT ON TABLE tags IS 'Tag definitions for categorizing characters';
COMMENT ON TABLE character_tags IS 'Many-to-many relationship between characters and tags';
COMMENT ON COLUMN tags.color IS 'Optional hex color code for tag display';

-- Create updated_at trigger for tags
CREATE OR REPLACE FUNCTION update_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tags_updated_at();

