-- Fix Dragon Ball Z template key in oc_templates
-- Change 'dragon-ball-z' key to 'dragonball' to match the template type mapping

UPDATE worlds
SET oc_templates = jsonb_set(
  oc_templates - 'dragon-ball-z',
  '{dragonball}',
  oc_templates->'dragon-ball-z'
)
WHERE slug = 'dragon-ball-z'
  AND oc_templates ? 'dragon-ball-z'
  AND NOT (oc_templates ? 'dragonball');

-- Verify the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM worlds
  WHERE slug = 'dragon-ball-z'
    AND oc_templates ? 'dragonball';
  
  RAISE NOTICE 'Updated % world(s) with dragonball template key', updated_count;
END $$;










