-- Create world_lore_timeline_events junction table
CREATE TABLE IF NOT EXISTS world_lore_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_lore_id UUID NOT NULL REFERENCES world_lore(id) ON DELETE CASCADE,
  timeline_event_id UUID NOT NULL REFERENCES timeline_events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(world_lore_id, timeline_event_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_world_lore_timeline_events_lore_id ON world_lore_timeline_events(world_lore_id);
CREATE INDEX IF NOT EXISTS idx_world_lore_timeline_events_event_id ON world_lore_timeline_events(timeline_event_id);

-- Enable RLS
ALTER TABLE world_lore_timeline_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read (for displaying relationships)
DROP POLICY IF EXISTS "Public can read world lore timeline events" ON world_lore_timeline_events;
CREATE POLICY "Public can read world lore timeline events"
  ON world_lore_timeline_events
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Authenticated users can manage (admin only)
DROP POLICY IF EXISTS "Authenticated users can manage world lore timeline events" ON world_lore_timeline_events;
CREATE POLICY "Authenticated users can manage world lore timeline events"
  ON world_lore_timeline_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

