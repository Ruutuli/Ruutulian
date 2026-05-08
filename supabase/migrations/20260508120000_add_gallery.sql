-- Gallery: site toggles, Drive-backed items, OC links

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS gallery_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS gallery_drive_folder_ids TEXT[] NOT NULL DEFAULT ARRAY[
  '1cNbJyTekBz-72AuUFIK6nq38cWfj212F',
  '0B91YVOBsNxk_VnNteHpZWWE5TGM'
]::TEXT[];

CREATE TABLE IF NOT EXISTS gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_file_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  mime_type TEXT,
  folder_id TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_items_published ON gallery_items(published);
CREATE INDEX IF NOT EXISTS idx_gallery_items_folder_id ON gallery_items(folder_id);

CREATE OR REPLACE FUNCTION update_gallery_items_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_gallery_items_updated_at ON gallery_items;
CREATE TRIGGER update_gallery_items_updated_at
  BEFORE UPDATE ON gallery_items FOR EACH ROW EXECUTE FUNCTION update_gallery_items_updated_at();

CREATE TABLE IF NOT EXISTS gallery_item_ocs (
  gallery_item_id UUID NOT NULL REFERENCES gallery_items(id) ON DELETE CASCADE,
  oc_id UUID NOT NULL REFERENCES ocs(id) ON DELETE CASCADE,
  PRIMARY KEY (gallery_item_id, oc_id)
);

CREATE INDEX IF NOT EXISTS idx_gallery_item_ocs_oc_id ON gallery_item_ocs(oc_id);

ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_item_ocs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published gallery items" ON gallery_items;
CREATE POLICY "Public can read published gallery items"
  ON gallery_items FOR SELECT TO public
  USING (published = true);

DROP POLICY IF EXISTS "Public can read gallery item ocs for published items" ON gallery_item_ocs;
CREATE POLICY "Public can read gallery item ocs for published items"
  ON gallery_item_ocs FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM gallery_items gi
      WHERE gi.id = gallery_item_id AND gi.published = true
    )
  );

-- Sync upsert: preserve published/tags/sort_order on existing rows
CREATE OR REPLACE FUNCTION upsert_gallery_item_from_sync(
  p_drive_file_id TEXT,
  p_name TEXT,
  p_mime_type TEXT,
  p_folder_id TEXT,
  p_last_synced_at TIMESTAMPTZ
) RETURNS VOID AS $$
BEGIN
  INSERT INTO gallery_items (drive_file_id, name, mime_type, folder_id, last_synced_at)
  VALUES (p_drive_file_id, COALESCE(p_name, ''), p_mime_type, p_folder_id, p_last_synced_at)
  ON CONFLICT (drive_file_id) DO UPDATE SET
    name = EXCLUDED.name,
    mime_type = EXCLUDED.mime_type,
    folder_id = EXCLUDED.folder_id,
    last_synced_at = EXCLUDED.last_synced_at;
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION upsert_gallery_item_from_sync(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_gallery_item_from_sync(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO postgres;
GRANT EXECUTE ON FUNCTION upsert_gallery_item_from_sync(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
