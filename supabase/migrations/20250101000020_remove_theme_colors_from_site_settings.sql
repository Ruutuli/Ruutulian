-- Remove theme_color and background_color columns from site_settings
ALTER TABLE site_settings DROP COLUMN IF EXISTS theme_color;
ALTER TABLE site_settings DROP COLUMN IF EXISTS background_color;

