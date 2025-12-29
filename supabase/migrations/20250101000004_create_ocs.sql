-- Create ocs table
CREATE TABLE IF NOT EXISTS ocs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  world_name TEXT, -- Denormalized for easier querying
  identity_id UUID REFERENCES oc_identities(id) ON DELETE SET NULL,
  series_type TEXT CHECK (series_type IN ('canon', 'original')),
  template_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'alive' CHECK (status IN ('alive', 'deceased', 'missing', 'unknown', 'au-only')),
  is_public BOOLEAN NOT NULL DEFAULT false,
  story_alias_id UUID, -- Foreign key added in migration 20250101000017
  extra_fields JSONB NOT NULL DEFAULT '{}',
  modular_fields JSONB,
  -- Overview fields
  first_name TEXT,
  last_name TEXT,
  aliases TEXT,
  species TEXT,
  sex TEXT,
  gender TEXT,
  pronouns TEXT,
  age INTEGER,
  date_of_birth TEXT,
  occupation TEXT,
  affiliations TEXT,
  romantic_orientation TEXT,
  sexual_orientation TEXT,
  star_sign TEXT,
  -- Identity Background
  ethnicity TEXT,
  place_of_origin TEXT,
  current_residence TEXT,
  languages TEXT[],
  -- Personality Overview
  personality_summary TEXT,
  alignment TEXT,
  -- Personality Metrics (1-10 scale)
  sociability INTEGER CHECK (sociability >= 1 AND sociability <= 10),
  communication_style INTEGER CHECK (communication_style >= 1 AND communication_style <= 10),
  judgment INTEGER CHECK (judgment >= 1 AND judgment <= 10),
  emotional_resilience INTEGER CHECK (emotional_resilience >= 1 AND emotional_resilience <= 10),
  courage INTEGER CHECK (courage >= 1 AND courage <= 10),
  risk_behavior INTEGER CHECK (risk_behavior >= 1 AND risk_behavior <= 10),
  honesty INTEGER CHECK (honesty >= 1 AND honesty <= 10),
  discipline INTEGER CHECK (discipline >= 1 AND discipline <= 10),
  temperament INTEGER CHECK (temperament >= 1 AND temperament <= 10),
  humor INTEGER CHECK (humor >= 1 AND humor <= 10),
  -- Personality Traits
  positive_traits TEXT,
  neutral_traits TEXT,
  negative_traits TEXT,
  -- Abilities
  abilities TEXT,
  skills TEXT,
  aptitudes TEXT,
  strengths TEXT,
  limits TEXT,
  conditions TEXT,
  -- Appearance
  standard_look TEXT,
  alternate_looks TEXT,
  accessories TEXT,
  visual_motifs TEXT,
  appearance_changes TEXT,
  height TEXT,
  weight TEXT,
  build TEXT,
  eye_color TEXT,
  hair_color TEXT,
  skin_tone TEXT,
  features TEXT,
  appearance_summary TEXT,
  -- Relationships
  family TEXT,
  friends_allies TEXT,
  rivals_enemies TEXT,
  romantic TEXT,
  other_relationships TEXT,
  -- History
  origin TEXT,
  formative_years TEXT,
  major_life_events TEXT,
  history_summary TEXT,
  -- Preferences & Habits
  likes TEXT,
  dislikes TEXT,
  -- Media
  gallery TEXT[],
  image_url TEXT,
  icon_url TEXT,
  seiyuu TEXT,
  voice_actor TEXT,
  theme_song TEXT,
  inspirations TEXT,
  design_notes TEXT,
  name_meaning_etymology TEXT,
  creator_notes TEXT,
  -- Trivia
  trivia TEXT,
  -- Development
  development_status TEXT,
  -- D&D-like Stats
  stat_strength INTEGER CHECK (stat_strength >= 1 AND stat_strength <= 30),
  stat_dexterity INTEGER CHECK (stat_dexterity >= 1 AND stat_dexterity <= 30),
  stat_constitution INTEGER CHECK (stat_constitution >= 1 AND stat_constitution <= 30),
  stat_intelligence INTEGER CHECK (stat_intelligence >= 1 AND stat_intelligence <= 30),
  stat_wisdom INTEGER CHECK (stat_wisdom >= 1 AND stat_wisdom <= 30),
  stat_charisma INTEGER CHECK (stat_charisma >= 1 AND stat_charisma <= 30),
  stat_hit_points_current INTEGER CHECK (stat_hit_points_current >= 0),
  stat_hit_points_max INTEGER CHECK (stat_hit_points_max >= 1),
  stat_armor_class INTEGER CHECK (stat_armor_class >= 0),
  stat_speed INTEGER CHECK (stat_speed >= 0),
  stat_level INTEGER CHECK (stat_level >= 1 AND stat_level <= 20),
  stat_class TEXT,
  stat_subclass TEXT,
  stat_initiative INTEGER,
  stat_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ocs_slug ON ocs(slug);
CREATE INDEX IF NOT EXISTS idx_ocs_world_id ON ocs(world_id);
CREATE INDEX IF NOT EXISTS idx_ocs_identity_id ON ocs(identity_id);
CREATE INDEX IF NOT EXISTS idx_ocs_is_public ON ocs(is_public);
CREATE INDEX IF NOT EXISTS idx_ocs_template_type ON ocs(template_type);
CREATE INDEX IF NOT EXISTS idx_ocs_status ON ocs(status);
CREATE INDEX IF NOT EXISTS idx_ocs_created_at ON ocs(created_at);
CREATE INDEX IF NOT EXISTS idx_ocs_story_alias_id ON ocs(story_alias_id);

-- Enable RLS
ALTER TABLE ocs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read public OCs
DROP POLICY IF EXISTS "Public can read public ocs" ON ocs;
CREATE POLICY "Public can read public ocs"
  ON ocs
  FOR SELECT
  TO public
  USING (is_public = true);

-- RLS Policy: Authenticated users can do everything (admin only)
DROP POLICY IF EXISTS "Authenticated users can manage ocs" ON ocs;
CREATE POLICY "Authenticated users can manage ocs"
  ON ocs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ocs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_ocs_updated_at ON ocs;
CREATE TRIGGER update_ocs_updated_at
  BEFORE UPDATE ON ocs
  FOR EACH ROW
  EXECUTE FUNCTION update_ocs_updated_at();

-- Add comments for D&D stats documentation
COMMENT ON COLUMN ocs.stat_strength IS 'Strength ability score (1-30)';
COMMENT ON COLUMN ocs.stat_dexterity IS 'Dexterity ability score (1-30)';
COMMENT ON COLUMN ocs.stat_constitution IS 'Constitution ability score (1-30)';
COMMENT ON COLUMN ocs.stat_intelligence IS 'Intelligence ability score (1-30)';
COMMENT ON COLUMN ocs.stat_wisdom IS 'Wisdom ability score (1-30)';
COMMENT ON COLUMN ocs.stat_charisma IS 'Charisma ability score (1-30)';
COMMENT ON COLUMN ocs.stat_hit_points_current IS 'Current hit points';
COMMENT ON COLUMN ocs.stat_hit_points_max IS 'Maximum hit points';
COMMENT ON COLUMN ocs.stat_armor_class IS 'Armor Class (AC)';
COMMENT ON COLUMN ocs.stat_speed IS 'Movement speed in feet';
COMMENT ON COLUMN ocs.stat_level IS 'Character level (1-20, D&D 5e)';
COMMENT ON COLUMN ocs.stat_class IS 'Character class';
COMMENT ON COLUMN ocs.stat_subclass IS 'Character subclass (archetype)';
COMMENT ON COLUMN ocs.stat_initiative IS 'Initiative modifier';
COMMENT ON COLUMN ocs.stat_notes IS 'Additional notes about stats';
