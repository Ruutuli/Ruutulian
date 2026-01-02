-- Add pinterest_board field to OCs table
ALTER TABLE ocs
  ADD COLUMN IF NOT EXISTS pinterest_board TEXT;

