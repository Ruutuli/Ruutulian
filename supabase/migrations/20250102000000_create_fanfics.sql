-- Create fanfics table
CREATE TABLE IF NOT EXISTS fanfics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  rating TEXT CHECK (rating IN ('G', 'PG', 'PG-13', 'R', 'M', 'Not Rated')),
  alternative_titles TEXT[], -- Array of alternative titles/aliases
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  story_alias_id UUID REFERENCES story_aliases(id) ON DELETE SET NULL,
  external_link TEXT, -- Link to external fanfiction site (AO3, FF.net, etc.)
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fanfics_slug ON fanfics(slug);
CREATE INDEX IF NOT EXISTS idx_fanfics_is_public ON fanfics(is_public);
CREATE INDEX IF NOT EXISTS idx_fanfics_world_id ON fanfics(world_id);
CREATE INDEX IF NOT EXISTS idx_fanfics_story_alias_id ON fanfics(story_alias_id);
CREATE INDEX IF NOT EXISTS idx_fanfics_rating ON fanfics(rating);
CREATE INDEX IF NOT EXISTS idx_fanfics_created_at ON fanfics(created_at);

-- Enable RLS
ALTER TABLE fanfics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read public fanfics
DROP POLICY IF EXISTS "Public can read public fanfics" ON fanfics;
CREATE POLICY "Public can read public fanfics"
  ON fanfics
  FOR SELECT
  TO public
  USING (is_public = true);

-- RLS Policy: Authenticated users can manage (admin only)
DROP POLICY IF EXISTS "Authenticated users can manage fanfics" ON fanfics;
CREATE POLICY "Authenticated users can manage fanfics"
  ON fanfics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fanfics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_fanfics_updated_at ON fanfics;
CREATE TRIGGER update_fanfics_updated_at
  BEFORE UPDATE ON fanfics
  FOR EACH ROW
  EXECUTE FUNCTION update_fanfics_updated_at();

-- Create fanfic_characters junction table (many-to-many with relationship info)
CREATE TABLE IF NOT EXISTS fanfic_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fanfic_id UUID NOT NULL REFERENCES fanfics(id) ON DELETE CASCADE,
  oc_id UUID NOT NULL REFERENCES ocs(id) ON DELETE CASCADE,
  relationship TEXT, -- Optional: relationship/pairing info (e.g., "Character A/Character B", "Character A & Character B")
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(fanfic_id, oc_id)
);

-- Create indexes for fanfic_characters
CREATE INDEX IF NOT EXISTS idx_fanfic_characters_fanfic_id ON fanfic_characters(fanfic_id);
CREATE INDEX IF NOT EXISTS idx_fanfic_characters_oc_id ON fanfic_characters(oc_id);

-- Enable RLS for fanfic_characters
ALTER TABLE fanfic_characters ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read (for displaying relationships)
DROP POLICY IF EXISTS "Public can read fanfic characters" ON fanfic_characters;
CREATE POLICY "Public can read fanfic characters"
  ON fanfic_characters
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Authenticated users can manage (admin only)
DROP POLICY IF EXISTS "Authenticated users can manage fanfic characters" ON fanfic_characters;
CREATE POLICY "Authenticated users can manage fanfic characters"
  ON fanfic_characters
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create fanfic_tags junction table (many-to-many, reusing tags table)
CREATE TABLE IF NOT EXISTS fanfic_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fanfic_id UUID NOT NULL REFERENCES fanfics(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(fanfic_id, tag_id)
);

-- Create indexes for fanfic_tags
CREATE INDEX IF NOT EXISTS idx_fanfic_tags_fanfic_id ON fanfic_tags(fanfic_id);
CREATE INDEX IF NOT EXISTS idx_fanfic_tags_tag_id ON fanfic_tags(tag_id);

-- Enable RLS for fanfic_tags
ALTER TABLE fanfic_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read (for displaying tags)
DROP POLICY IF EXISTS "Public can read fanfic tags" ON fanfic_tags;
CREATE POLICY "Public can read fanfic tags"
  ON fanfic_tags
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Authenticated users can manage (admin only)
DROP POLICY IF EXISTS "Authenticated users can manage fanfic tags" ON fanfic_tags;
CREATE POLICY "Authenticated users can manage fanfic tags"
  ON fanfic_tags
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE fanfics IS 'Fanfiction works/stories';
COMMENT ON COLUMN fanfics.rating IS 'Content rating: G, PG, PG-13, R, M, or Not Rated';
COMMENT ON COLUMN fanfics.alternative_titles IS 'Array of alternative titles or aliases for the fanfic';
COMMENT ON COLUMN fanfics.world_id IS 'World/fandom this fanfic belongs to';
COMMENT ON COLUMN fanfics.story_alias_id IS 'Optional link to story alias (storyline/continuity)';
COMMENT ON COLUMN fanfics.external_link IS 'Link to external fanfiction site (AO3, FF.net, etc.)';
COMMENT ON TABLE fanfic_characters IS 'Many-to-many relationship between fanfics and OCs with optional relationship/pairing info';
COMMENT ON COLUMN fanfic_characters.relationship IS 'Optional relationship/pairing notation (e.g., "Character A/Character B" for romantic, "Character A & Character B" for platonic)';
COMMENT ON TABLE fanfic_tags IS 'Many-to-many relationship between fanfics and tags';

