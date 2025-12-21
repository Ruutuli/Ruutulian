-- Add template_type column to worlds table
-- This stores the template type for each world, replacing the hardcoded mapping
ALTER TABLE worlds
  ADD COLUMN IF NOT EXISTS template_type TEXT;

COMMENT ON COLUMN worlds.template_type IS 'Template type for this world (e.g., naruto, pokemon, dragonball). Used to determine which character template fields to show. For original worlds, this should be "original".';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_worlds_template_type ON worlds(template_type);

-- Migrate existing data: set template_type based on slug for canon worlds
-- This replicates the hardcoded CANON_TEMPLATE_MAP logic
UPDATE worlds
SET template_type = CASE
  WHEN slug = 'naruto' THEN 'naruto'
  WHEN slug = 'final-fantasy-vii' THEN 'ff7'
  WHEN slug = 'inuyasha' THEN 'inuyasha'
  WHEN slug = 'shaman-king' THEN 'shaman-king'
  WHEN slug = 'zelda' THEN 'zelda'
  WHEN slug IN ('dragon-ball-z', 'dragonball', 'dragon-ball') THEN 'dragonball'
  WHEN slug = 'pokemon' THEN 'pokemon'
  WHEN slug = 'nier' THEN 'nier'
  WHEN series_type = 'original' THEN 'original'
  ELSE 'none'
END
WHERE template_type IS NULL;

-- Insert field categories into dropdown_options
-- These are the predefined categories for character template fields
INSERT INTO dropdown_options (field, option)
VALUES
  ('field_categories', 'Core Identity'),
  ('field_categories', 'Overview'),
  ('field_categories', 'Identity Background'),
  ('field_categories', 'Appearance'),
  ('field_categories', 'Personality Overview'),
  ('field_categories', 'Personality Metrics'),
  ('field_categories', 'Personality Traits'),
  ('field_categories', 'Abilities'),
  ('field_categories', 'Relationships'),
  ('field_categories', 'History'),
  ('field_categories', 'Preferences & Habits'),
  ('field_categories', 'Media'),
  ('field_categories', 'Trivia'),
  ('field_categories', 'Development'),
  ('field_categories', 'Settings')
ON CONFLICT (field, option) DO NOTHING;












