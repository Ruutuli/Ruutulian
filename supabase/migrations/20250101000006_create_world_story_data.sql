-- Create world_story_data table
CREATE TABLE IF NOT EXISTS world_story_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  story_alias_id UUID REFERENCES story_aliases(id) ON DELETE CASCADE,
  -- World content fields (story-specific versions)
  setting TEXT,
  lore TEXT,
  the_world_society TEXT,
  culture TEXT,
  politics TEXT,
  technology TEXT,
  environment TEXT,
  races_species TEXT,
  power_systems TEXT,
  religion TEXT,
  government TEXT,
  important_factions TEXT,
  notable_figures TEXT,
  languages TEXT,
  trade_economy TEXT,
  travel_transport TEXT,
  themes TEXT,
  inspirations TEXT,
  current_era_status TEXT,
  notes TEXT,
  canon_status TEXT,
  timeline_era TEXT,
  power_source TEXT,
  central_conflicts TEXT,
  world_rules_limitations TEXT,
  oc_integration_notes TEXT,
  -- Section image URLs (story-specific)
  overview_image_url TEXT,
  society_culture_image_url TEXT,
  world_building_image_url TEXT,
  economy_systems_image_url TEXT,
  additional_info_image_url TEXT,
  history_image_url TEXT,
  history TEXT,
  -- World field system values (story-specific)
  modular_fields JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(world_id, story_alias_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_world_story_data_world_id ON world_story_data(world_id);
CREATE INDEX IF NOT EXISTS idx_world_story_data_story_alias_id ON world_story_data(story_alias_id);
CREATE INDEX IF NOT EXISTS idx_world_story_data_created_at ON world_story_data(created_at);

-- Enable RLS
ALTER TABLE world_story_data ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read (for displaying story-specific world data)
DROP POLICY IF EXISTS "Public can read world story data" ON world_story_data;
CREATE POLICY "Public can read world story data"
  ON world_story_data
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Authenticated users can manage (admin only)
DROP POLICY IF EXISTS "Authenticated users can manage world story data" ON world_story_data;
CREATE POLICY "Authenticated users can manage world story data"
  ON world_story_data
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_world_story_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_world_story_data_updated_at ON world_story_data;
CREATE TRIGGER update_world_story_data_updated_at
  BEFORE UPDATE ON world_story_data
  FOR EACH ROW
  EXECUTE FUNCTION update_world_story_data_updated_at();

