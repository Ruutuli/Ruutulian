-- Items linked to characters should be visible on public OC pages (published + RLS).
UPDATE public.gallery_items AS gi
SET published = true
WHERE gi.published = false
  AND EXISTS (
    SELECT 1
    FROM public.gallery_item_ocs AS gio
    WHERE gio.gallery_item_id = gi.id
  );
