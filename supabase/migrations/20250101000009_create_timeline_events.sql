-- Create timeline_events table
CREATE TABLE IF NOT EXISTS timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  timeline_id UUID REFERENCES timelines(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  description_markdown TEXT,
  date_data JSONB, -- Flexible date structure
  date_text TEXT, -- Legacy/display fallback
  year INTEGER,
  month INTEGER,
  day INTEGER,
  categories TEXT[] NOT NULL DEFAULT '{}',
  is_key_event BOOLEAN DEFAULT false,
  location TEXT,
  image_url TEXT,
  story_alias_id UUID, -- Foreign key added in migration 20250101000017
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_timeline_events_world_id ON timeline_events(world_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_timeline_id ON timeline_events(timeline_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_year ON timeline_events(year);
CREATE INDEX IF NOT EXISTS idx_timeline_events_categories ON timeline_events USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_timeline_events_is_key_event ON timeline_events(is_key_event);
CREATE INDEX IF NOT EXISTS idx_timeline_events_created_at ON timeline_events(created_at);
CREATE INDEX IF NOT EXISTS idx_timeline_events_story_alias_id ON timeline_events(story_alias_id);

-- Enable RLS
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read (for displaying timeline events)
DROP POLICY IF EXISTS "Public can read timeline events" ON timeline_events;
CREATE POLICY "Public can read timeline events"
  ON timeline_events
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Authenticated users can manage (admin only)
DROP POLICY IF EXISTS "Authenticated users can manage timeline events" ON timeline_events;
CREATE POLICY "Authenticated users can manage timeline events"
  ON timeline_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timeline_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_timeline_events_updated_at ON timeline_events;
CREATE TRIGGER update_timeline_events_updated_at
  BEFORE UPDATE ON timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_events_updated_at();

