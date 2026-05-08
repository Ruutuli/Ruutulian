-- dropdown_options
CREATE TABLE IF NOT EXISTS dropdown_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field TEXT NOT NULL,
  option TEXT NOT NULL,
  hex_code TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(field, option)
);
-- Legacy dropdown_options rows may lack newer columns.
ALTER TABLE dropdown_options ADD COLUMN IF NOT EXISTS hex_code TEXT;
ALTER TABLE dropdown_options ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dropdown_options ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_dropdown_options_field ON dropdown_options(field);
CREATE INDEX IF NOT EXISTS idx_dropdown_options_display_order ON dropdown_options(field, display_order);
CREATE INDEX IF NOT EXISTS idx_dropdown_options_created_at ON dropdown_options(created_at);
CREATE INDEX IF NOT EXISTS idx_dropdown_options_hex_code ON dropdown_options(hex_code) WHERE hex_code IS NOT NULL;
ALTER TABLE dropdown_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read dropdown options" ON dropdown_options;
CREATE POLICY "Public can read dropdown options" ON dropdown_options FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage dropdown options" ON dropdown_options;
CREATE POLICY "Authenticated users can manage dropdown options" ON dropdown_options FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE OR REPLACE FUNCTION update_dropdown_options_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_dropdown_options_updated_at ON dropdown_options;
CREATE TRIGGER update_dropdown_options_updated_at BEFORE UPDATE ON dropdown_options FOR EACH ROW EXECUTE FUNCTION update_dropdown_options_updated_at();
