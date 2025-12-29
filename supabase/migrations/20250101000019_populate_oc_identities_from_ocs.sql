-- Populate oc_identities from existing OCs
-- This migration creates identity records for each unique OC name
-- and links existing OCs to their corresponding identities

-- Step 1: Insert unique identities from OCs (grouped by name)
-- Only create identities for OCs that don't already have an identity_id set
INSERT INTO oc_identities (name, created_at, updated_at)
SELECT DISTINCT
  ocs.name,
  MIN(ocs.created_at) as created_at,
  MAX(ocs.updated_at) as updated_at
FROM ocs
WHERE ocs.identity_id IS NULL
  AND ocs.name IS NOT NULL
  AND ocs.name != ''
GROUP BY ocs.name
ON CONFLICT DO NOTHING;

-- Step 2: Update OCs to link them to their corresponding identities
-- Match OCs to identities by name
UPDATE ocs
SET identity_id = oc_identities.id
FROM oc_identities
WHERE ocs.name = oc_identities.name
  AND ocs.identity_id IS NULL
  AND ocs.name IS NOT NULL
  AND ocs.name != '';

