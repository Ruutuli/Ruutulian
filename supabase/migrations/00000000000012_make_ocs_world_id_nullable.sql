-- Make world_id nullable in ocs table
-- This allows OCs to exist without being assigned to a specific world
-- (e.g., for "None" verse OCs that don't belong to any world)

ALTER TABLE ocs 
ALTER COLUMN world_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL values
-- (PostgreSQL foreign keys already allow NULL by default, but we need to ensure the constraint handles it)
-- The existing foreign key should already work with NULL values

COMMENT ON COLUMN ocs.world_id IS 'The world this OC belongs to. NULL means the OC does not belong to any specific world.';

