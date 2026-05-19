-- Drive files manually removed from the admin gallery; skipped on future sync.

CREATE TABLE IF NOT EXISTS gallery_sync_exclusions (
  drive_file_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE gallery_sync_exclusions ENABLE ROW LEVEL SECURITY;
