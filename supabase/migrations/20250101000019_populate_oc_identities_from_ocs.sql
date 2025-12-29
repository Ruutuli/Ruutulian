-- Populate oc_identities from existing OCs
-- This migration:
-- 1. Merges duplicate identities (same name) by keeping the oldest one
-- 2. Creates identities for OCs that don't have one
-- 3. Links all OCs to their corresponding identities
-- 4. Removes orphaned identities (identities with no OCs)

-- Step 1: Handle duplicate identities - merge them by keeping the oldest one
-- For each duplicate name, keep the identity with the earliest created_at
-- and update all OCs pointing to duplicates to point to the kept identity
WITH duplicate_groups AS (
  SELECT 
    name,
    MIN(created_at) as oldest_created_at
  FROM oc_identities
  WHERE name IS NOT NULL AND name != ''
  GROUP BY name
  HAVING COUNT(*) > 1
),
kept_identities AS (
  SELECT DISTINCT ON (dg.name)
    dg.name,
    oi.id as kept_id
  FROM duplicate_groups dg
  JOIN oc_identities oi ON oi.name = dg.name AND oi.created_at = dg.oldest_created_at
  ORDER BY dg.name, oi.created_at
),
duplicate_identity_ids AS (
  SELECT 
    oi.id as duplicate_id,
    ki.kept_id
  FROM duplicate_groups dg
  JOIN oc_identities oi ON oi.name = dg.name
  JOIN kept_identities ki ON ki.name = dg.name
  WHERE oi.id != ki.kept_id
)
UPDATE ocs
SET identity_id = di.kept_id
FROM duplicate_identity_ids di
WHERE ocs.identity_id = di.duplicate_id;

-- Step 2: Delete duplicate identities (keep only the oldest one for each name)
WITH duplicate_identities AS (
  SELECT 
    name,
    MIN(created_at) as oldest_created_at
  FROM oc_identities
  WHERE name IS NOT NULL AND name != ''
  GROUP BY name
  HAVING COUNT(*) > 1
)
DELETE FROM oc_identities
WHERE id IN (
  SELECT oi.id
  FROM oc_identities oi
  JOIN duplicate_identities di ON oi.name = di.name
  WHERE oi.created_at != di.oldest_created_at
);

-- Step 3: Create identities for OCs that don't have one
-- Only create if an identity with that name doesn't already exist
INSERT INTO oc_identities (name, created_at, updated_at)
SELECT DISTINCT
  ocs.name,
  MIN(ocs.created_at) as created_at,
  MAX(ocs.updated_at) as updated_at
FROM ocs
WHERE ocs.name IS NOT NULL
  AND ocs.name != ''
  AND NOT EXISTS (
    SELECT 1 FROM oc_identities 
    WHERE oc_identities.name = ocs.name
  )
GROUP BY ocs.name;

-- Step 4: Link all OCs to their corresponding identities by name
UPDATE ocs
SET identity_id = oc_identities.id
FROM oc_identities
WHERE ocs.name = oc_identities.name
  AND (ocs.identity_id IS NULL OR ocs.identity_id != oc_identities.id)
  AND ocs.name IS NOT NULL
  AND ocs.name != '';

-- Step 5: Remove orphaned identities (identities with no OCs pointing to them)
DELETE FROM oc_identities
WHERE id NOT IN (
  SELECT DISTINCT identity_id
  FROM ocs
  WHERE identity_id IS NOT NULL
);

