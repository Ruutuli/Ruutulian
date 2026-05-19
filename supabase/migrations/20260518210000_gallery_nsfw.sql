-- Mark gallery images as NSFW; visitors must click to reveal (unspoiler).

ALTER TABLE gallery_items
  ADD COLUMN IF NOT EXISTS is_nsfw BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_gallery_items_is_nsfw ON gallery_items(is_nsfw) WHERE is_nsfw = true;
