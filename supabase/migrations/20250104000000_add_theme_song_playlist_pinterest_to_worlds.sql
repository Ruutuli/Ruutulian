-- Add theme_song, playlist, and pinterest_board fields to worlds table
ALTER TABLE worlds
  ADD COLUMN IF NOT EXISTS theme_song TEXT,
  ADD COLUMN IF NOT EXISTS playlist TEXT,
  ADD COLUMN IF NOT EXISTS pinterest_board TEXT;

