-- Allow NULL values for world_id in ocs table
-- This allows OCs to exist without being associated with a specific world
ALTER TABLE ocs ALTER COLUMN world_id DROP NOT NULL;



