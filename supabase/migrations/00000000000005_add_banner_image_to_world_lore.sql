-- Add banner_image_url column to world_lore table
-- This allows lore entries to have a separate banner/header image for aesthetic purposes

ALTER TABLE world_lore
  ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN world_lore.banner_image_url IS 'Banner/header image URL displayed at the top of the lore page for aesthetic purposes';















