-- Update world_story_data table: remove synopsis, add new fields
-- This migration implements the world form restructure

-- Remove synopsis column (if it exists)
ALTER TABLE world_story_data DROP COLUMN IF EXISTS synopsis;

-- Add new columns for enhanced world information
ALTER TABLE world_story_data
  ADD COLUMN IF NOT EXISTS canon_status TEXT,
  ADD COLUMN IF NOT EXISTS timeline_era TEXT,
  ADD COLUMN IF NOT EXISTS power_source TEXT,
  ADD COLUMN IF NOT EXISTS central_conflicts TEXT,
  ADD COLUMN IF NOT EXISTS world_rules_limitations TEXT,
  ADD COLUMN IF NOT EXISTS oc_integration_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN world_story_data.canon_status IS 'Canon status for fandom worlds (Canon, Semi-Canon, AU, OC-Only, Headcanon Expansion)';
COMMENT ON COLUMN world_story_data.timeline_era IS 'Timeline/era context (Ancient, Modern, Post-Apocalyptic, Mythic Age, Pre-Canon/During Canon/Post-Canon)';
COMMENT ON COLUMN world_story_data.power_source IS 'Power source clarifier (Spiritual, Magical, Technological, Biological, Divine, Hybrid)';
COMMENT ON COLUMN world_story_data.central_conflicts IS 'Ongoing conflicts, wars, political tensions, cosmic threats, cultural clashes';
COMMENT ON COLUMN world_story_data.world_rules_limitations IS 'World rules, limitations, taboos, hard limits, costs of power';
COMMENT ON COLUMN world_story_data.oc_integration_notes IS 'Guidance on how OCs typically enter this world, power scaling expectations, common roles';

