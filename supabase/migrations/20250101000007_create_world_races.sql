-- Create world_races table
CREATE TABLE IF NOT EXISTS world_races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  story_alias_id UUID REFERENCES story_aliases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  info TEXT,
  picture_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_world_races_world_id ON world_races(world_id);
CREATE INDEX IF NOT EXISTS idx_world_races_story_alias_id ON world_races(story_alias_id);
CREATE INDEX IF NOT EXISTS idx_world_races_position ON world_races(position);
CREATE INDEX IF NOT EXISTS idx_world_races_created_at ON world_races(created_at);

-- Enable RLS
ALTER TABLE world_races ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read world races" ON world_races;
DROP POLICY IF EXISTS "Authenticated users can manage world races" ON world_races;

-- RLS Policy: Public can read (for displaying race information)
CREATE POLICY "Public can read world races"
  ON world_races
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Authenticated users can manage (admin only)
CREATE POLICY "Authenticated users can manage world races"
  ON world_races
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_world_races_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (must be done before creating)
DROP TRIGGER IF EXISTS update_world_races_updated_at ON world_races;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_world_races_updated_at
  BEFORE UPDATE ON world_races
  FOR EACH ROW
  EXECUTE FUNCTION update_world_races_updated_at();

