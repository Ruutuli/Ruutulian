-- Create worlds table
CREATE TABLE IF NOT EXISTS worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  series_type TEXT NOT NULL CHECK (series_type IN ('canon', 'original')),
  summary TEXT NOT NULL,
  description_markdown TEXT,
  primary_color TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  header_image_url TEXT,
  icon_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  -- World information fields
  genre TEXT,
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
  -- Section image URLs
  overview_image_url TEXT,
  society_culture_image_url TEXT,
  world_building_image_url TEXT,
  economy_systems_image_url TEXT,
  additional_info_image_url TEXT,
  history_image_url TEXT,
  history TEXT,
  -- Template and field system
  template_type TEXT,
  oc_templates JSONB,
  world_fields JSONB,
  modular_fields JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_worlds_slug ON worlds(slug);
CREATE INDEX IF NOT EXISTS idx_worlds_series_type ON worlds(series_type);
CREATE INDEX IF NOT EXISTS idx_worlds_is_public ON worlds(is_public);
CREATE INDEX IF NOT EXISTS idx_worlds_created_at ON worlds(created_at);

-- Enable RLS
ALTER TABLE worlds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read public worlds" ON worlds;
DROP POLICY IF EXISTS "Authenticated users can manage worlds" ON worlds;

-- RLS Policy: Public can read public worlds
CREATE POLICY "Public can read public worlds"
  ON worlds
  FOR SELECT
  TO public
  USING (is_public = true);

-- RLS Policy: Authenticated users can do everything (admin only)
CREATE POLICY "Authenticated users can manage worlds"
  ON worlds
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_worlds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_worlds_updated_at ON worlds;
CREATE TRIGGER update_worlds_updated_at
  BEFORE UPDATE ON worlds
  FOR EACH ROW
  EXECUTE FUNCTION update_worlds_updated_at();

