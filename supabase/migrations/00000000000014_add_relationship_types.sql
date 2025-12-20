-- Add relationship types to dropdown_options table
-- These are the predefined relationship types that can be selected in the OC form
INSERT INTO dropdown_options (field, option)
VALUES
  ('relationship_type', 'Lovers'),
  ('relationship_type', 'Crush'),
  ('relationship_type', 'Close Friend'),
  ('relationship_type', 'Friend'),
  ('relationship_type', 'Acquaintance'),
  ('relationship_type', 'Dislike'),
  ('relationship_type', 'Hate'),
  ('relationship_type', 'Neutral'),
  ('relationship_type', 'Family'),
  ('relationship_type', 'Rival'),
  ('relationship_type', 'Admire'),
  ('relationship_type', 'Other')
ON CONFLICT (field, option) DO NOTHING;

COMMENT ON TABLE dropdown_options IS 'Stores dropdown options for various form fields. The relationship_type field contains the predefined relationship types that can be selected when adding relationships between characters.';

