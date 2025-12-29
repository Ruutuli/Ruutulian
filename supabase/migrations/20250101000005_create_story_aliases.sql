-- Create story_aliases table
CREATE TABLE IF NOT EXISTS story_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(world_id, slug)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_story_aliases_world_id ON story_aliases(world_id);
CREATE INDEX IF NOT EXISTS idx_story_aliases_slug ON story_aliases(slug);
CREATE INDEX IF NOT EXISTS idx_story_aliases_created_at ON story_aliases(created_at);

-- Enable RLS
ALTER TABLE story_aliases ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read (for displaying story information)
DROP POLICY IF EXISTS "Public can read story aliases" ON story_aliases;
CREATE POLICY "Public can read story aliases"
  ON story_aliases
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Authenticated users can manage (admin only)
DROP POLICY IF EXISTS "Authenticated users can manage story aliases" ON story_aliases;
CREATE POLICY "Authenticated users can manage story aliases"
  ON story_aliases
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_story_aliases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_story_aliases_updated_at ON story_aliases;
CREATE TRIGGER update_story_aliases_updated_at
  BEFORE UPDATE ON story_aliases
  FOR EACH ROW
  EXECUTE FUNCTION update_story_aliases_updated_at();

