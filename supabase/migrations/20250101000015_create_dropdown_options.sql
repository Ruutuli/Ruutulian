-- Create dropdown_options table
CREATE TABLE IF NOT EXISTS dropdown_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field TEXT NOT NULL,
  value TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(field, value)
);

-- Add display_order column if it doesn't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dropdown_options' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE dropdown_options ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dropdown_options_field ON dropdown_options(field);
CREATE INDEX IF NOT EXISTS idx_dropdown_options_display_order ON dropdown_options(field, display_order);
CREATE INDEX IF NOT EXISTS idx_dropdown_options_created_at ON dropdown_options(created_at);

-- Enable RLS
ALTER TABLE dropdown_options ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read (for form dropdowns)
DROP POLICY IF EXISTS "Public can read dropdown options" ON dropdown_options;
CREATE POLICY "Public can read dropdown options"
  ON dropdown_options
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Authenticated users can manage (admin only)
DROP POLICY IF EXISTS "Authenticated users can manage dropdown options" ON dropdown_options;
CREATE POLICY "Authenticated users can manage dropdown options"
  ON dropdown_options
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dropdown_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_dropdown_options_updated_at ON dropdown_options;
CREATE TRIGGER update_dropdown_options_updated_at
  BEFORE UPDATE ON dropdown_options
  FOR EACH ROW
  EXECUTE FUNCTION update_dropdown_options_updated_at();

