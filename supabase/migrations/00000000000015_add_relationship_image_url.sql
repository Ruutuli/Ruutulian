-- Add image_url support to relationship entries
-- Relationships are stored as JSONB arrays in columns: family, friends_allies, rivals_enemies, romantic, other_relationships
-- Each relationship entry can now include an optional image_url field
-- This migration documents the schema change; no table alteration is needed as JSONB supports dynamic structure

COMMENT ON COLUMN ocs.family IS 'JSONB array of family relationships. Each entry: {name, relationship?, description?, oc_id?, oc_slug?, relationship_type?, image_url?}';
COMMENT ON COLUMN ocs.friends_allies IS 'JSONB array of friend/ally relationships. Each entry: {name, relationship?, description?, oc_id?, oc_slug?, relationship_type?, image_url?}';
COMMENT ON COLUMN ocs.rivals_enemies IS 'JSONB array of rival/enemy relationships. Each entry: {name, relationship?, description?, oc_id?, oc_slug?, relationship_type?, image_url?}';
COMMENT ON COLUMN ocs.romantic IS 'JSONB array of romantic relationships. Each entry: {name, relationship?, description?, oc_id?, oc_slug?, relationship_type?, image_url?}';
COMMENT ON COLUMN ocs.other_relationships IS 'JSONB array of other relationships. Each entry: {name, relationship?, description?, oc_id?, oc_slug?, relationship_type?, image_url?}';

