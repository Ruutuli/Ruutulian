-- Create world_lore table
CREATE TABLE IF NOT EXISTS world_lore (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  lore_type TEXT NOT NULL,
  description TEXT,
  description_markdown TEXT,
  image_url TEXT,
  icon_url TEXT,
  banner_image_url TEXT,
  world_fields JSONB,
  modular_fields JSONB,
  story_alias_id UUID, -- Foreign key added in later migration
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(world_id, slug)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_world_lore_world_id ON world_lore(world_id);
CREATE INDEX IF NOT EXISTS idx_world_lore_slug ON world_lore(slug);
CREATE INDEX IF NOT EXISTS idx_world_lore_lore_type ON world_lore(lore_type);
CREATE INDEX IF NOT EXISTS idx_world_lore_is_public ON world_lore(is_public);
CREATE INDEX IF NOT EXISTS idx_world_lore_created_at ON world_lore(created_at);
CREATE INDEX IF NOT EXISTS idx_world_lore_story_alias_id ON world_lore(story_alias_id);

-- Enable RLS
ALTER TABLE world_lore ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read public lore entries
DROP POLICY IF EXISTS "Public can read public world lore" ON world_lore;
CREATE POLICY "Public can read public world lore"
  ON world_lore
  FOR SELECT
  TO public
  USING (is_public = true);

-- RLS Policy: Authenticated users can do everything (admin only)
DROP POLICY IF EXISTS "Authenticated users can manage world lore" ON world_lore;
CREATE POLICY "Authenticated users can manage world lore"
  ON world_lore
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_world_lore_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_world_lore_updated_at ON world_lore;
CREATE TRIGGER update_world_lore_updated_at
  BEFORE UPDATE ON world_lore
  FOR EACH ROW
  EXECUTE FUNCTION update_world_lore_updated_at();

