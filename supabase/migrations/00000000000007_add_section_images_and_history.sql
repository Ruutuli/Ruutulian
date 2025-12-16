-- Add section image URLs and history field to worlds table
-- This allows each section to have an associated image, similar to wiki-style pages

-- Add image URL columns for each section
ALTER TABLE worlds
  ADD COLUMN IF NOT EXISTS overview_image_url TEXT,
  ADD COLUMN IF NOT EXISTS society_culture_image_url TEXT,
  ADD COLUMN IF NOT EXISTS world_building_image_url TEXT,
  ADD COLUMN IF NOT EXISTS economy_systems_image_url TEXT,
  ADD COLUMN IF NOT EXISTS additional_info_image_url TEXT,
  ADD COLUMN IF NOT EXISTS history_image_url TEXT;

-- Add history field for detailed history/background
ALTER TABLE worlds
  ADD COLUMN IF NOT EXISTS history TEXT;

-- Add comments for documentation
COMMENT ON COLUMN worlds.overview_image_url IS 'Image URL for the Overview section (genre, setting, lore)';
COMMENT ON COLUMN worlds.society_culture_image_url IS 'Image URL for the Society & Culture section';
COMMENT ON COLUMN worlds.world_building_image_url IS 'Image URL for the World Building section';
COMMENT ON COLUMN worlds.economy_systems_image_url IS 'Image URL for the Economy & Systems section';
COMMENT ON COLUMN worlds.additional_info_image_url IS 'Image URL for the Additional Information section';
COMMENT ON COLUMN worlds.history_image_url IS 'Image URL for the History section';
COMMENT ON COLUMN worlds.history IS 'Detailed history and background of the world';

-- Add the same columns to world_story_data table for story-specific overrides
ALTER TABLE world_story_data
  ADD COLUMN IF NOT EXISTS overview_image_url TEXT,
  ADD COLUMN IF NOT EXISTS society_culture_image_url TEXT,
  ADD COLUMN IF NOT EXISTS world_building_image_url TEXT,
  ADD COLUMN IF NOT EXISTS economy_systems_image_url TEXT,
  ADD COLUMN IF NOT EXISTS additional_info_image_url TEXT,
  ADD COLUMN IF NOT EXISTS history_image_url TEXT,
  ADD COLUMN IF NOT EXISTS history TEXT;

-- Add comments for world_story_data
COMMENT ON COLUMN world_story_data.overview_image_url IS 'Image URL for the Overview section (story-specific override)';
COMMENT ON COLUMN world_story_data.society_culture_image_url IS 'Image URL for the Society & Culture section (story-specific override)';
COMMENT ON COLUMN world_story_data.world_building_image_url IS 'Image URL for the World Building section (story-specific override)';
COMMENT ON COLUMN world_story_data.economy_systems_image_url IS 'Image URL for the Economy & Systems section (story-specific override)';
COMMENT ON COLUMN world_story_data.additional_info_image_url IS 'Image URL for the Additional Information section (story-specific override)';
COMMENT ON COLUMN world_story_data.history_image_url IS 'Image URL for the History section (story-specific override)';
COMMENT ON COLUMN world_story_data.history IS 'Detailed history and background of the world (story-specific override)';

