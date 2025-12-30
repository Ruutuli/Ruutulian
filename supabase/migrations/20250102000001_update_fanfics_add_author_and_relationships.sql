-- Add author field to fanfics table
ALTER TABLE fanfics ADD COLUMN IF NOT EXISTS author TEXT;

-- Update fanfic_characters table to support custom characters
-- Make oc_id nullable and add name field
ALTER TABLE fanfic_characters 
  ALTER COLUMN oc_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS name TEXT;

-- Remove relationship field from fanfic_characters
ALTER TABLE fanfic_characters DROP COLUMN IF EXISTS relationship;

-- Create fanfic_relationships table for pairings/relationships
CREATE TABLE IF NOT EXISTS fanfic_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fanfic_id UUID NOT NULL REFERENCES fanfics(id) ON DELETE CASCADE,
  relationship_text TEXT NOT NULL, -- e.g., "Character A/Character B" or "Character A & Character B"
  relationship_type TEXT CHECK (relationship_type IN ('romantic', 'platonic', 'other')) DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for fanfic_relationships
CREATE INDEX IF NOT EXISTS idx_fanfic_relationships_fanfic_id ON fanfic_relationships(fanfic_id);

-- Enable RLS for fanfic_relationships
ALTER TABLE fanfic_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read
DROP POLICY IF EXISTS "Public can read fanfic relationships" ON fanfic_relationships;
CREATE POLICY "Public can read fanfic relationships"
  ON fanfic_relationships
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Authenticated users can manage (admin only)
DROP POLICY IF EXISTS "Authenticated users can manage fanfic relationships" ON fanfic_relationships;
CREATE POLICY "Authenticated users can manage fanfic relationships"
  ON fanfic_relationships
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON COLUMN fanfics.author IS 'Author of the fanfic (if different from site owner)';
COMMENT ON COLUMN fanfic_characters.name IS 'Custom character name (used when oc_id is NULL)';
COMMENT ON COLUMN fanfic_characters.oc_id IS 'Reference to OC (nullable if using custom name)';
COMMENT ON TABLE fanfic_relationships IS 'Relationships/pairings in the fanfic (e.g., "Character A/Character B")';
COMMENT ON COLUMN fanfic_relationships.relationship_text IS 'Relationship notation (e.g., "Character A/Character B" for romantic, "Character A & Character B" for platonic)';
COMMENT ON COLUMN fanfic_relationships.relationship_type IS 'Type of relationship: romantic, platonic, or other';

