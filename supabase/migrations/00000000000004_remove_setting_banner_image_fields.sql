-- Remove setting_img and banner_image columns from worlds and world_story_data tables
-- Keep only header_image_url and icon_url

-- Remove from worlds table
ALTER TABLE worlds DROP COLUMN IF EXISTS setting_img;
ALTER TABLE worlds DROP COLUMN IF EXISTS banner_image;

-- Remove from world_story_data table (if they exist there)
ALTER TABLE world_story_data DROP COLUMN IF EXISTS setting_img;
ALTER TABLE world_story_data DROP COLUMN IF EXISTS banner_image;

