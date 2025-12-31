-- Add image_url to fanfics table
ALTER TABLE fanfics ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url to fanfic_chapters table
ALTER TABLE fanfic_chapters ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comments
COMMENT ON COLUMN fanfics.image_url IS 'Optional image URL for the fanfic cover/image';
COMMENT ON COLUMN fanfic_chapters.image_url IS 'Optional image URL for the chapter header/image';

