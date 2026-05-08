-- world_lore
CREATE TABLE IF NOT EXISTS world_lore (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  lore_type TEXT NOT NULL,
  description TEXT,
  description_markdown TEXT,
  image_url TEXT,
  icon_url TEXT,
  banner_image_url TEXT,
  world_fields JSONB,
  modular_fields JSONB,
  story_alias_id UUID REFERENCES story_aliases(id) ON DELETE SET NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(world_id, slug)
);
-- Legacy DBs may have world_lore without newer columns; CREATE TABLE IF NOT EXISTS does not alter them.
ALTER TABLE world_lore ADD COLUMN IF NOT EXISTS description_markdown TEXT;
ALTER TABLE world_lore ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE world_lore ADD COLUMN IF NOT EXISTS icon_url TEXT;
ALTER TABLE world_lore ADD COLUMN IF NOT EXISTS banner_image_url TEXT;
ALTER TABLE world_lore ADD COLUMN IF NOT EXISTS world_fields JSONB;
ALTER TABLE world_lore ADD COLUMN IF NOT EXISTS modular_fields JSONB;
ALTER TABLE world_lore ADD COLUMN IF NOT EXISTS story_alias_id UUID REFERENCES story_aliases(id) ON DELETE SET NULL;
ALTER TABLE world_lore ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_world_lore_world_id ON world_lore(world_id);
CREATE INDEX IF NOT EXISTS idx_world_lore_slug ON world_lore(slug);
CREATE INDEX IF NOT EXISTS idx_world_lore_lore_type ON world_lore(lore_type);
CREATE INDEX IF NOT EXISTS idx_world_lore_is_public ON world_lore(is_public);
CREATE INDEX IF NOT EXISTS idx_world_lore_created_at ON world_lore(created_at);
CREATE INDEX IF NOT EXISTS idx_world_lore_story_alias_id ON world_lore(story_alias_id);
ALTER TABLE world_lore ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read public world lore" ON world_lore;
CREATE POLICY "Public can read public world lore" ON world_lore FOR SELECT TO public USING (is_public = true);
DROP POLICY IF EXISTS "Authenticated users can manage world lore" ON world_lore;
CREATE POLICY "Authenticated users can manage world lore" ON world_lore FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE OR REPLACE FUNCTION update_world_lore_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_world_lore_updated_at ON world_lore;
CREATE TRIGGER update_world_lore_updated_at BEFORE UPDATE ON world_lore FOR EACH ROW EXECUTE FUNCTION update_world_lore_updated_at();

-- world_lore_ocs
CREATE TABLE IF NOT EXISTS world_lore_ocs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_lore_id UUID NOT NULL REFERENCES world_lore(id) ON DELETE CASCADE,
  oc_id UUID NOT NULL REFERENCES ocs(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(world_lore_id, oc_id)
);
CREATE INDEX IF NOT EXISTS idx_world_lore_ocs_lore_id ON world_lore_ocs(world_lore_id);
CREATE INDEX IF NOT EXISTS idx_world_lore_ocs_oc_id ON world_lore_ocs(oc_id);
ALTER TABLE world_lore_ocs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read world lore ocs" ON world_lore_ocs;
CREATE POLICY "Public can read world lore ocs" ON world_lore_ocs FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage world lore ocs" ON world_lore_ocs;
CREATE POLICY "Authenticated users can manage world lore ocs" ON world_lore_ocs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- world_lore_timeline_events
CREATE TABLE IF NOT EXISTS world_lore_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_lore_id UUID NOT NULL REFERENCES world_lore(id) ON DELETE CASCADE,
  timeline_event_id UUID NOT NULL REFERENCES timeline_events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(world_lore_id, timeline_event_id)
);
CREATE INDEX IF NOT EXISTS idx_world_lore_timeline_events_lore_id ON world_lore_timeline_events(world_lore_id);
CREATE INDEX IF NOT EXISTS idx_world_lore_timeline_events_event_id ON world_lore_timeline_events(timeline_event_id);
ALTER TABLE world_lore_timeline_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read world lore timeline events" ON world_lore_timeline_events;
CREATE POLICY "Public can read world lore timeline events" ON world_lore_timeline_events FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage world lore timeline events" ON world_lore_timeline_events;
CREATE POLICY "Authenticated users can manage world lore timeline events" ON world_lore_timeline_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
