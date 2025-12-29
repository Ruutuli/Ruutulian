-- Create timeline_event_characters junction table
CREATE TABLE IF NOT EXISTS timeline_event_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_event_id UUID NOT NULL REFERENCES timeline_events(id) ON DELETE CASCADE,
  oc_id UUID NOT NULL REFERENCES ocs(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(timeline_event_id, oc_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_timeline_event_characters_event_id ON timeline_event_characters(timeline_event_id);
CREATE INDEX IF NOT EXISTS idx_timeline_event_characters_oc_id ON timeline_event_characters(oc_id);

-- Enable RLS
ALTER TABLE timeline_event_characters ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read (for displaying character relationships)
DROP POLICY IF EXISTS "Public can read timeline event characters" ON timeline_event_characters;
CREATE POLICY "Public can read timeline event characters"
  ON timeline_event_characters
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Authenticated users can manage (admin only)
DROP POLICY IF EXISTS "Authenticated users can manage timeline event characters" ON timeline_event_characters;
CREATE POLICY "Authenticated users can manage timeline event characters"
  ON timeline_event_characters
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

