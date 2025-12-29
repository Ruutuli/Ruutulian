-- Create world_lore_ocs junction table
CREATE TABLE IF NOT EXISTS world_lore_ocs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_lore_id UUID NOT NULL REFERENCES world_lore(id) ON DELETE CASCADE,
  oc_id UUID NOT NULL REFERENCES ocs(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(world_lore_id, oc_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_world_lore_ocs_lore_id ON world_lore_ocs(world_lore_id);
CREATE INDEX IF NOT EXISTS idx_world_lore_ocs_oc_id ON world_lore_ocs(oc_id);

-- Enable RLS
ALTER TABLE world_lore_ocs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read (for displaying relationships)
DROP POLICY IF EXISTS "Public can read world lore ocs" ON world_lore_ocs;
CREATE POLICY "Public can read world lore ocs"
  ON world_lore_ocs
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Authenticated users can manage (admin only)
DROP POLICY IF EXISTS "Authenticated users can manage world lore ocs" ON world_lore_ocs;
CREATE POLICY "Authenticated users can manage world lore ocs"
  ON world_lore_ocs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

