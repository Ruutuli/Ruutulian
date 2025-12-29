-- Add D&D-like stats to ocs table
ALTER TABLE ocs
  ADD COLUMN IF NOT EXISTS stat_strength INTEGER CHECK (stat_strength >= 1 AND stat_strength <= 30),
  ADD COLUMN IF NOT EXISTS stat_dexterity INTEGER CHECK (stat_dexterity >= 1 AND stat_dexterity <= 30),
  ADD COLUMN IF NOT EXISTS stat_constitution INTEGER CHECK (stat_constitution >= 1 AND stat_constitution <= 30),
  ADD COLUMN IF NOT EXISTS stat_intelligence INTEGER CHECK (stat_intelligence >= 1 AND stat_intelligence <= 30),
  ADD COLUMN IF NOT EXISTS stat_wisdom INTEGER CHECK (stat_wisdom >= 1 AND stat_wisdom <= 30),
  ADD COLUMN IF NOT EXISTS stat_charisma INTEGER CHECK (stat_charisma >= 1 AND stat_charisma <= 30),
  ADD COLUMN IF NOT EXISTS stat_hit_points_current INTEGER CHECK (stat_hit_points_current >= 0),
  ADD COLUMN IF NOT EXISTS stat_hit_points_max INTEGER CHECK (stat_hit_points_max >= 1),
  ADD COLUMN IF NOT EXISTS stat_armor_class INTEGER CHECK (stat_armor_class >= 0),
  ADD COLUMN IF NOT EXISTS stat_speed INTEGER CHECK (stat_speed >= 0),
  ADD COLUMN IF NOT EXISTS   stat_level INTEGER CHECK (stat_level >= 1 AND stat_level <= 20),
  ADD COLUMN IF NOT EXISTS stat_class TEXT,
  ADD COLUMN IF NOT EXISTS stat_subclass TEXT,
  ADD COLUMN IF NOT EXISTS stat_initiative INTEGER,
  ADD COLUMN IF NOT EXISTS stat_notes TEXT;

-- Add comments for documentation
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

