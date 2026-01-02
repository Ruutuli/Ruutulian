-- Add theme_song and playlist fields to worlds table
ALTER TABLE worlds
  ADD COLUMN IF NOT EXISTS theme_song TEXT,
  ADD COLUMN IF NOT EXISTS playlist TEXT;

