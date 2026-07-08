-- Remove unused character maker tables

DROP TRIGGER IF EXISTS update_character_maker_assets_updated_at ON character_maker_assets;
DROP TRIGGER IF EXISTS update_character_maker_options_updated_at ON character_maker_options;
DROP TRIGGER IF EXISTS update_character_maker_categories_updated_at ON character_maker_categories;
DROP TRIGGER IF EXISTS update_character_makers_updated_at ON character_makers;

DROP FUNCTION IF EXISTS update_character_maker_assets_updated_at();
DROP FUNCTION IF EXISTS update_character_maker_options_updated_at();
DROP FUNCTION IF EXISTS update_character_maker_categories_updated_at();
DROP FUNCTION IF EXISTS update_character_makers_updated_at();

DROP TABLE IF EXISTS character_maker_assets;
DROP TABLE IF EXISTS character_maker_options;
DROP TABLE IF EXISTS character_maker_categories;
DROP TABLE IF EXISTS character_makers;
