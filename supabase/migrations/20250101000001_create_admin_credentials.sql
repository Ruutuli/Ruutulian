-- Create admin_credentials table
CREATE TABLE IF NOT EXISTS admin_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policy: No public access - only service role can access
-- Service role key bypasses RLS, so this effectively blocks all public access
DROP POLICY IF EXISTS "No public access to admin credentials" ON admin_credentials;
CREATE POLICY "No public access to admin credentials"
  ON admin_credentials
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_admin_credentials_updated_at ON admin_credentials;
CREATE TRIGGER update_admin_credentials_updated_at
  BEFORE UPDATE ON admin_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_credentials_updated_at();

