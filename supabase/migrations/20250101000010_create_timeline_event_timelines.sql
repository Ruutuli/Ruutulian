-- Create timeline_event_timelines junction table
CREATE TABLE IF NOT EXISTS timeline_event_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
  timeline_event_id UUID NOT NULL REFERENCES timeline_events(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(timeline_id, timeline_event_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_timeline_event_timelines_timeline_id ON timeline_event_timelines(timeline_id);
CREATE INDEX IF NOT EXISTS idx_timeline_event_timelines_event_id ON timeline_event_timelines(timeline_event_id);
CREATE INDEX IF NOT EXISTS idx_timeline_event_timelines_position ON timeline_event_timelines(position);

-- Enable RLS
ALTER TABLE timeline_event_timelines ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read (for displaying timeline relationships)
DROP POLICY IF EXISTS "Public can read timeline event timelines" ON timeline_event_timelines;
CREATE POLICY "Public can read timeline event timelines"
  ON timeline_event_timelines
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Authenticated users can manage (admin only)
DROP POLICY IF EXISTS "Authenticated users can manage timeline event timelines" ON timeline_event_timelines;
CREATE POLICY "Authenticated users can manage timeline event timelines"
  ON timeline_event_timelines
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

