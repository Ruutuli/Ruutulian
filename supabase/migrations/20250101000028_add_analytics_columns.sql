-- Add analytics columns to ocs table
ALTER TABLE ocs
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0 CHECK (view_count >= 0),
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE;

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_ocs_view_count ON ocs(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_ocs_last_viewed_at ON ocs(last_viewed_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN ocs.view_count IS 'Number of times the character page has been viewed';
COMMENT ON COLUMN ocs.last_viewed_at IS 'Timestamp of the last view';

