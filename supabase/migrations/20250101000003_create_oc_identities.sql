-- Create oc_identities table
CREATE TABLE IF NOT EXISTS oc_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_oc_identities_name ON oc_identities(name);
CREATE INDEX IF NOT EXISTS idx_oc_identities_created_at ON oc_identities(created_at);

-- Enable RLS
ALTER TABLE oc_identities ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read (for displaying OC versions)
DROP POLICY IF EXISTS "Public can read oc identities" ON oc_identities;
CREATE POLICY "Public can read oc identities"
  ON oc_identities
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Authenticated users can manage (admin only)
DROP POLICY IF EXISTS "Authenticated users can manage oc identities" ON oc_identities;
CREATE POLICY "Authenticated users can manage oc identities"
  ON oc_identities
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_oc_identities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_oc_identities_updated_at ON oc_identities;
CREATE TRIGGER update_oc_identities_updated_at
  BEFORE UPDATE ON oc_identities
  FOR EACH ROW
  EXECUTE FUNCTION update_oc_identities_updated_at();

