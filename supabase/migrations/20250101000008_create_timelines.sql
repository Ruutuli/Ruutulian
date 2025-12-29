-- Create timelines table
CREATE TABLE IF NOT EXISTS timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description_markdown TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_timelines_world_id ON timelines(world_id);
CREATE INDEX IF NOT EXISTS idx_timelines_created_at ON timelines(created_at);

-- Enable RLS
ALTER TABLE timelines ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read (for displaying timelines)
DROP POLICY IF EXISTS "Public can read timelines" ON timelines;
CREATE POLICY "Public can read timelines"
  ON timelines
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Authenticated users can manage (admin only)
DROP POLICY IF EXISTS "Authenticated users can manage timelines" ON timelines;
CREATE POLICY "Authenticated users can manage timelines"
  ON timelines
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timelines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_timelines_updated_at ON timelines;
CREATE TRIGGER update_timelines_updated_at
  BEFORE UPDATE ON timelines
  FOR EACH ROW
  EXECUTE FUNCTION update_timelines_updated_at();

